package documents

import (
	"context"
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/mttdoc"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcsdb"
	"mintter/backend/vcs/vcssql"
	"mintter/backend/vcs/vcstypes"
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
	db *sqlitex.Pool
	// TODO: take it as a dependency.
	index *vcstypes.Index
	repo  *future.ReadOnly[repo]
	vcsdb *vcsdb.DB
}

type repo struct {
	*vcstypes.Repo
	me core.Identity
}

// NewServer creates a new RPC handler.
func NewServer(me *future.ReadOnly[core.Identity], db *sqlitex.Pool, vcs *vcs.SQLite) *Server {
	srv := &Server{
		db:    db,
		index: vcstypes.NewIndex(db),

		vcsdb: vcsdb.New(db),
	}

	frepo := future.New[repo]()
	srv.repo = frepo.ReadOnly

	go func() {
		id, err := me.Await(context.Background())
		if err != nil {
			panic(err)
		}

		if err := frepo.Resolve(repo{
			Repo: vcstypes.NewRepo(id, vcs),
			me:   id,
		}); err != nil {
			panic(err)
		}
	}()

	return srv
}

// CreateDraft implements a corresponding gRPC method.
func (api *Server) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (out *documents.Document, err error) {
	if in.ExistingDocumentId != "" {
		return api.createDraftWithBase(ctx, in)
	}

	me, err := api.me(ctx)
	if err != nil {
		return nil, err
	}

	perma, err := vcsdb.NewPermanode(vcstypes.NewDocumentPermanode(me.AccountID()))
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

		doc := mttdoc.New(vcsdb.MakeDatomFactory(change, conn.LastLamportTime(), 0))

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
	panic("TODO(burdiyan)")
}

func (api *Server) me(ctx context.Context) (core.Identity, error) {
	r, err := api.repo.Await(ctx)
	if err != nil {
		return core.Identity{}, err
	}

	return r.me, nil
}

// UpdateDraftV2 implements a corresponding gRPC method.
func (api *Server) UpdateDraftV2(ctx context.Context, in *documents.UpdateDraftRequestV2) (*emptypb.Empty, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, fmt.Errorf("failed to decode document id: %w", err)
	}

	if in.Changes == nil {
		return nil, status.Errorf(codes.InvalidArgument, "must send some changes to apply to the document")
	}

	me, err := api.me(ctx)
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

		doc := mttdoc.New(vcsdb.MakeDatomFactory(change, lamport, seq))
		if err := doc.Replay(conn.LoadObjectDatoms(obj, version)); err != nil {
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

// GetDraft implements a corresponding gRPC method.
func (api *Server) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	me, err := api.me(ctx)
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

		doc := mttdoc.New(vcsdb.MakeDatomFactory(change, lamport, seq))
		if err := doc.Replay(conn.LoadObjectDatoms(obj, version)); err != nil {
			return err
		}

		objctime := conn.GetPermanodeCreateTime(obj)
		changectime := conn.GetChangeCreateTime(change)

		pb, err := mttdocToProto(in.DocumentId, me.AccountID().String(), objctime, changectime, doc)
		if err != nil {
			return err
		}
		docpb = pb

		return nil
	}); err != nil {
		return nil, err
	}

	return docpb, nil
}

// ListDrafts implements a corresponding gRPC method.
func (api *Server) ListDrafts(ctx context.Context, in *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	conn, release, err := api.db.Conn(ctx)
	if err != nil {
		return nil, err
	}

	docs, err := vcssql.PermanodesListByType(conn, string(vcstypes.DocumentType))
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

// PublishDraft implements a corresponding gRPC method.
func (api *Server) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	me, err := api.me(ctx)
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

		conn.TouchChange(change, time.Now())
		blk := conn.EncodeChange(change, me.DeviceKey())
		conn.PutBlock(blk)

		conn.DeleteVersion(obj, "draft", meLocal)
		conn.SaveVersion(obj, "main", meLocal, vcsdb.LocalVersion{change})
		return nil
	}); err != nil {
		return nil, err
	}

	return api.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: in.DocumentId,
	})
}

// DeleteDraft implements a corresponding gRPC method.
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

	me, err := api.me(ctx)
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

// GetPublication implements a corresponding gRPC method.
func (api *Server) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (*documents.Publication, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	me, err := api.me(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	out := &documents.Publication{}
	if err := conn.WithTx(false, func() error {
		obj := conn.LookupPermanode(oid)
		meLocal := conn.EnsureIdentity(me)

		version := conn.GetVersion(obj, "main", meLocal)
		if len(version) != 1 {
			return fmt.Errorf("TODO(burdiyan): implement publication versions with more than one change")
		}

		datoms := conn.LoadObjectDatoms(obj, version)

		doc := mttdoc.New(vcsdb.MakeDatomFactory(-1, -1, 0))
		if err := doc.Replay(datoms); err != nil {
			return err
		}

		objctime := conn.GetPermanodeCreateTime(obj)

		// TODO(burdiyan): when we have more than one change in the version, we need to thing what to use
		// as update time for the publication.
		changectime := conn.GetChangeCreateTime(version[0])

		pb, err := mttdocToProto(in.DocumentId, me.AccountID().String(), objctime, changectime, doc)
		if err != nil {
			return err
		}
		out.Document = pb
		out.Version = conn.LocalVersionToPublic(version).String()
		return nil
	}); err != nil {
		return nil, err
	}

	out.Document.PublishTime = out.Document.UpdateTime

	return out, nil
}

// DeletePublication implements a corresponding gRPC method.
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

// ListPublications implements a corresponding gRPC method.
func (api *Server) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	conn, release, err := api.db.Conn(ctx)
	if err != nil {
		return nil, err
	}

	docs, err := vcssql.PermanodesListByType(conn, string(vcstypes.DocumentType))
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
