package documents

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/backlinks"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"mintter/backend/vcs/mttdoc"
	"mintter/backend/vcs/vcsdb"
	"mintter/backend/vcs/vcssql"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Server implements DocumentsServer gRPC API.
type Server struct {
	db    *sqlitex.Pool
	vcsdb *vcsdb.DB
	me    *future.ReadOnly[core.Identity]
	node  *future.ReadOnly[*mttnet.Node]
}

// NewServer creates a new RPC handler.
func NewServer(me *future.ReadOnly[core.Identity], db *sqlitex.Pool, node *future.ReadOnly[*mttnet.Node]) *Server {
	srv := &Server{
		db:    db,
		vcsdb: vcsdb.New(db),
		me:    me,
		node:  node,
	}

	return srv
}

// CreateDraft implements the corresponding gRPC method.
func (api *Server) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (out *documents.Document, err error) {
	if in.ExistingDocumentId != "" {
		return api.createDraftWithBase(ctx, in)
	}

	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	perma, err := vcsdb.NewPermanode(mttdoc.NewDocumentPermanode(me.AccountID()))
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		obj := conn.NewObject(perma)
		meLocal := conn.EnsureIdentity(me)

		change := conn.NewChange(obj, meLocal, nil, perma.PermanodeCreateTime())

		doc := mttdoc.New(vcsdb.NewDatomWriter(change, conn.LastLamportTime(), 0))

		doc.EnsureTitle("")
		doc.EnsureSubtitle("")

		if doc.Err() != nil {
			return doc.Err()
		}

		for _, d := range doc.DirtyDatoms() {
			conn.AddDatom(obj, d)
		}

		conn.SaveVersion(obj, "draft", meLocal, vcsdb.LocalVersion{change})

		return nil
	}); err != nil {
		return nil, err
	}

	return &documents.Document{
		Id:         perma.ID.String(),
		Author:     me.AccountID().String(),
		CreateTime: timestamppb.New(perma.PermanodeCreateTime()),
		UpdateTime: timestamppb.New(perma.PermanodeCreateTime()),
	}, nil
}

func (api *Server) createDraftWithBase(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	oid, err := cid.Decode(in.ExistingDocumentId)
	if err != nil {
		return nil, fmt.Errorf("failed to decode document id: %w", err)
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		obj := conn.LookupPermanode(oid)
		meLocal := conn.EnsureIdentity(me)

		main := conn.GetVersion(obj, "main", meLocal)

		change := conn.NewChange(obj, meLocal, main, time.Now())

		conn.SaveVersion(obj, "draft", meLocal, vcsdb.LocalVersion{change})

		return nil
	}); err != nil {
		return nil, err
	}

	return api.GetDraft(ctx, &documents.GetDraftRequest{
		DocumentId: in.ExistingDocumentId,
	})
}

// UpdateDraftV2 implements the corresponding gRPC method.
func (api *Server) UpdateDraftV2(ctx context.Context, in *documents.UpdateDraftRequestV2) (*emptypb.Empty, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, fmt.Errorf("failed to decode document id: %w", err)
	}

	if in.Changes == nil {
		return nil, status.Errorf(codes.InvalidArgument, "must send some changes to apply to the document")
	}

	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		meLocal := conn.EnsureIdentity(me)
		obj := conn.LookupPermanode(oid)

		version := conn.GetVersion(obj, "draft", meLocal)
		if len(version) != 1 {
			return fmt.Errorf("draft version must have only 1 leaf change, got: %d", len(version))
		}

		change := version[0]
		seq := conn.NextChangeSeq(obj, change)
		if seq != 0 {
			seq-- // datom factory increments seq before creating datom
		}
		lamport := conn.GetChangeLamportTime(change)

		doc := mttdoc.New(vcsdb.NewDatomWriter(change, lamport, seq))
		it := conn.QueryObjectDatoms(obj, version)
		datoms := it.Slice()
		if it.Err() != nil {
			return it.Err()
		}
		if err := doc.Replay(datoms); err != nil {
			return err
		}

		for _, c := range in.Changes {
			switch op := c.Op.(type) {
			case *documents.DocumentChange_SetTitle:
				doc.EnsureTitle(op.SetTitle)
			case *documents.DocumentChange_SetSubtitle:
				doc.EnsureSubtitle(op.SetSubtitle)
			case *documents.DocumentChange_MoveBlock_:
				doc.MoveBlock(op.MoveBlock.BlockId, op.MoveBlock.Parent, op.MoveBlock.LeftSibling)
			case *documents.DocumentChange_ReplaceBlock:
				blk := op.ReplaceBlock
				data, err := proto.Marshal(blk)
				if err != nil {
					return fmt.Errorf("failed to marshal block %s: %w", blk.Id, err)
				}
				doc.EnsureBlockState(blk.Id, data)
			case *documents.DocumentChange_DeleteBlock:
				doc.DeleteBlock(op.DeleteBlock)
			default:
				return fmt.Errorf("invalid draft update operation %T: %+v", c, c)
			}

			if doc.Err() != nil {
				return doc.Err()
			}
		}

		for _, d := range doc.DirtyDatoms() {
			conn.AddDatom(obj, d)
		}

		for opid := range doc.DeletedDatoms() {
			conn.DeleteDatomByID(opid.Change, opid.Seq)
		}

		conn.TouchChange(change, time.Now())

		return nil
	}); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

// GetDraft implements the corresponding gRPC method.
func (api *Server) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var docpb *documents.Document

	if err := conn.WithTx(false, func() error {
		meLocal := conn.LookupIdentity(me)
		obj := conn.LookupPermanode(oid)
		version := conn.GetVersion(obj, "draft", meLocal)
		if len(version) != 1 {
			return fmt.Errorf("draft version must have only 1 leaf change, got: %d", len(version))
		}

		docpb, err = api.getDocument(conn, obj, version)
		return err
	}); err != nil {
		return nil, err
	}

	return docpb, nil
}

func (api *Server) getDocument(conn *vcsdb.Conn, obj vcsdb.LocalID, version vcsdb.LocalVersion) (*documents.Document, error) {
	doc := mttdoc.New(nil)
	it := conn.QueryObjectDatoms(obj, version)
	datoms := it.Slice()
	if it.Err() != nil {
		return nil, it.Err()
	}
	objctime := conn.GetPermanodeCreateTime(obj)
	changectime := conn.GetChangeCreateTime(datoms[len(datoms)-1].Change)
	did := conn.GetObjectCID(obj)
	author := conn.GetObjectOwner(obj)
	if err := doc.Replay(datoms); err != nil {
		return nil, err
	}

	return mttdocToProto(did.String(), author.String(), objctime, changectime, doc)
}

// ListDrafts implements the corresponding gRPC method.
func (api *Server) ListDrafts(ctx context.Context, in *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	conn, release, err := api.db.Conn(ctx)
	if err != nil {
		return nil, err
	}

	docs, err := vcssql.PermanodesListByType(conn, string(mttdoc.DocumentType))
	release()
	if err != nil {
		return nil, err
	}

	out := &documents.ListDraftsResponse{
		Documents: make([]*documents.Document, 0, len(docs)),
	}

	// TODO(burdiyan): this is a workaround. Need to do better, and only select relevant metadata.
	for _, d := range docs {
		draft, err := api.GetDraft(ctx, &documents.GetDraftRequest{
			DocumentId: cid.NewCidV1(uint64(d.PermanodeCodec), d.PermanodeMultihash).String(),
		})
		if err != nil {
			continue
		}
		out.Documents = append(out.Documents, draft)
	}

	return out, nil
}

// PublishDraft implements the corresponding gRPC method.
func (api *Server) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	node, err := api.node.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		obj := conn.LookupPermanode(oid)
		meLocal := conn.EnsureIdentity(me)

		version := conn.GetVersion(obj, "draft", meLocal)
		if len(version) != 1 {
			return fmt.Errorf("draft must have only 1 change: can't publish")
		}

		change := version[0]

		conn.EncodeChange(change, me.DeviceKey())
		conn.DeleteVersion(obj, "draft", meLocal)

		newVersion := vcsdb.LocalVersion{change}
		conn.SaveVersion(obj, "main", meLocal, newVersion)

		// TODO(burdiyan): build11: this should be gone.
		it := conn.QueryObjectDatoms(obj, newVersion)
		for it.Next() {
			if err := backlinks.IndexDatom(conn, obj, it.Item().Datom()); err != nil {
				return err
			}
		}
		return it.Err()
	}); err != nil {
		return nil, err
	}
	pub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: in.DocumentId,
	})
	if err != nil {
		return nil, err
	}

	err = node.ProvideCID(oid)
	if err != nil {
		return nil, err
	}
	return pub, nil
}

// DeleteDraft implements the corresponding gRPC method.
func (api *Server) DeleteDraft(ctx context.Context, in *documents.DeleteDraftRequest) (*emptypb.Empty, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	if err := conn.WithTx(true, func() error {
		obj := conn.LookupPermanode(oid)
		localMe := conn.EnsureIdentity(me)

		version := conn.GetVersion(obj, "draft", localMe)
		if len(version) != 1 {
			return fmt.Errorf("draft version must only have 1 change")
		}

		change := version[0]

		// If we still have some versions left
		// we only want to delete the current change.
		// Otherwise we delete the whole object.

		conn.DeleteVersion(obj, "draft", localMe)
		c := conn.CountVersions(obj)

		if c > 0 {
			conn.DeleteChange(change)
		} else {
			conn.DeleteObject(obj)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

// GetPublication implements the corresponding gRPC method.
func (api *Server) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (*documents.Publication, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	errNumVersionsNotOne := errors.New("TODO(burdiyan): can only get publication with 1 leaf change,")
	errNotFoundLocally := errors.New("Document with specified id not found locally")
	out := &documents.Publication{}
	if err := conn.WithTx(false, func() error {
		obj := conn.LookupPermanode(oid)
		meLocal := conn.LookupIdentity(me)

		var version vcsdb.LocalVersion
		if in.Version == "" || in.Version == "main" {
			version = conn.GetVersion(obj, "main", meLocal)
		} else {
			pubVer, err := vcs.ParseVersion(in.Version)
			if err != nil {
				return err
			}

			version = conn.PublicVersionToLocal(pubVer)
		}

		if version == nil {
			return errNotFoundLocally
		}
		if len(version) != 1 {
			return fmt.Errorf("%w, got: %d", errNumVersionsNotOne, len(version))
		}
		out.Document, err = api.getDocument(conn, obj, version)
		if err != nil {
			return err
		}

		out.Version = conn.LocalVersionToPublic(version).String()
		return nil
	}); err != nil {
		if errors.Is(err, errNumVersionsNotOne) {
			return nil, err
		}
		//make network call
		n, err2 := api.node.Await(ctx)
		if err2 != nil {
			return nil, err
		}
		//block, err = n.Bitswap().GetBlock(ctx, oid)
		_, err2 = n.AddrInfo().MarshalJSON() //TODO: remove
		if err2 != nil {
			return nil, err
		}

		return nil, err
	}

	out.Document.PublishTime = out.Document.UpdateTime

	return out, nil
}

// DeletePublication implements the corresponding gRPC method.
func (api *Server) DeletePublication(ctx context.Context, in *documents.DeletePublicationRequest) (*emptypb.Empty, error) {
	c, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err := conn.BeginTx(true); err != nil {
		return nil, err
	}

	obj := conn.LookupPermanode(c)
	conn.DeleteObject(obj)
	if err := conn.Commit(); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

// ListPublications implements the corresponding gRPC method.
func (api *Server) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	conn, release, err := api.db.Conn(ctx)
	if err != nil {
		return nil, err
	}

	docs, err := vcssql.PermanodesListByType(conn, string(mttdoc.DocumentType))
	release()
	if err != nil {
		return nil, err
	}

	out := &documents.ListPublicationsResponse{
		Publications: make([]*documents.Publication, 0, len(docs)),
	}

	// TODO(burdiyan): this is a workaround. Need to do better, and only select relevant metadata.
	for _, d := range docs {
		draft, err := api.GetPublication(ctx, &documents.GetPublicationRequest{
			DocumentId: cid.NewCidV1(uint64(d.PermanodeCodec), d.PermanodeMultihash).String(),
		})
		if err != nil {
			continue
		}
		out.Publications = append(out.Publications, draft)
	}

	return out, nil
}

func mttdocToProto(id, author string, createTime, updateTime time.Time, doc *mttdoc.Document) (*documents.Document, error) {
	if doc.Err() != nil {
		return nil, doc.Err()
	}

	docpb := &documents.Document{
		Id:         id,
		Title:      doc.Title(),
		Subtitle:   doc.Subtitle(),
		Author:     author,
		CreateTime: timestamppb.New(createTime),
		UpdateTime: timestamppb.New(updateTime),
	}

	blockMap := map[vcsdb.NodeID]*documents.BlockNode{}

	appendChild := func(parent vcsdb.NodeID, child *documents.BlockNode) {
		if parent == vcsdb.RootNode {
			docpb.Children = append(docpb.Children, child)
			return
		}

		blk, ok := blockMap[parent]
		if !ok {
			panic("BUG: no parent " + parent.String() + " was found yet while iterating")
		}

		blk.Children = append(blk.Children, child)
	}

	it := doc.Iterator()

	for el := it.Next(); el != nil; el = it.Next() {
		pos := el.Value()

		data, ok := doc.BlockState(pos.Block)
		if !ok {
			continue
		}

		blk := &documents.Block{}
		if err := proto.Unmarshal(data, blk); err != nil {
			return nil, err
		}
		child := &documents.BlockNode{Block: blk}
		appendChild(pos.Parent, child)
		blockMap[pos.Block] = child
	}

	return docpb, nil
}
