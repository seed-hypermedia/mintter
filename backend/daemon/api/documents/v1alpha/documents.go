package documents

import (
	"context"
	"fmt"
	"mintter/backend/backlinks"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"mintter/backend/vcs/mttdoc"
	vcsdb "mintter/backend/vcs/sqlitevcs"
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

// Discoverer is a subset of the syncing service that
// is able to discover given Mintter objects, optionally specifying versions.
type Discoverer interface {
	DiscoverObject(ctx context.Context, obj cid.Cid, version []cid.Cid) error
	// TODO: this is here temporarily. Eventually we need to provide from the vcs
	// so every time we save a main version, we need to provide the leaf changes.
	ProvideCID(cid.Cid) error
}

// Server implements DocumentsServer gRPC API.
type Server struct {
	db    *sqlitex.Pool
	vcsdb *vcsdb.DB
	me    *future.ReadOnly[core.Identity]
	disc  Discoverer
}

// NewServer creates a new RPC handler.
func NewServer(me *future.ReadOnly[core.Identity], db *sqlitex.Pool, disc Discoverer) *Server {
	srv := &Server{
		db:    db,
		vcsdb: vcsdb.New(db),
		me:    me,
		disc:  disc,
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

	clock := hlc.NewClock()

	perma, err := vcs.EncodePermanode(mttdoc.NewDocumentPermanode(me.AccountID(), clock.Now()))
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

		change := conn.NewChange(obj, meLocal, nil, clock)

		batch := vcs.NewBatch(clock, me.DeviceKey().Abbrev())

		doc := mttdoc.New(batch)

		doc.EnsureTitle("")
		doc.EnsureSubtitle("")

		if doc.Err() != nil {
			return doc.Err()
		}

		conn.AddDatoms(obj, change, batch.Dirty()...)
		conn.SaveVersion(obj, "draft", meLocal, vcsdb.LocalVersion{change})

		return nil
	}); err != nil {
		return nil, err
	}

	return &documents.Document{
		Id:         perma.ID.String(),
		Author:     me.AccountID().String(),
		CreateTime: timestamppb.New(perma.PermanodeCreateTime().Time()),
		UpdateTime: timestamppb.New(clock.Max().Time()),
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

		clock := hlc.NewClock()
		main := conn.GetVersion(obj, "main", meLocal)
		for _, v := range main {
			clock.Track(hlc.Unpack(conn.GetChangeMaxTime(obj, v)))
		}

		change := conn.NewChange(obj, meLocal, main, clock)
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

		clock := conn.GetChangeClock(obj, change)
		batch := vcs.NewBatch(clock, me.DeviceKey().Abbrev())
		doc := mttdoc.New(batch)
		cs := conn.ResolveChangeSet(obj, version)
		it := conn.QueryObjectDatoms(obj, cs)
		datoms := it.Slice()
		if it.Err() != nil {
			return it.Err()
		}
		if err := doc.Replay(datoms); err != nil {
			return fmt.Errorf("failed to load document before update: %w", err)
		}

		// TODO: this should not be necessary.
		clock.Track(hlc.Unpack(datoms[len(datoms)-1].Time))

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
				return fmt.Errorf("failed to apply document update: %w", doc.Err())
			}
		}

		conn.AddDatoms(obj, change, batch.Dirty()...)

		for opid := range batch.Deleted() {
			conn.DeleteDatomByID(obj, change, opid)
		}

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

		cs := conn.ResolveChangeSet(obj, version)

		docpb, err = api.getDocument(conn, obj, cs)
		return err
	}); err != nil {
		return nil, err
	}

	return docpb, nil
}

func (api *Server) getDocument(conn *vcsdb.Conn, obj vcsdb.LocalID, cs vcsdb.ChangeSet) (*documents.Document, error) {
	doc := mttdoc.New(nil)
	it := conn.QueryObjectDatoms(obj, cs)
	datoms := it.Slice()
	if it.Err() != nil {
		return nil, it.Err()
	}
	objctime := conn.GetPermanodeCreateTime(obj)
	did := conn.GetObjectCID(obj)
	author := conn.GetObjectOwner(obj)
	if err := doc.Replay(datoms); err != nil {
		return nil, err
	}

	return mttdocToProto(did.String(), author.String(), objctime, doc)
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
		cs := conn.ResolveChangeSet(obj, version)

		conn.EncodeChange(change, me.DeviceKey())
		conn.DeleteVersion(obj, "draft", meLocal)
		conn.SaveVersion(obj, "main", meLocal, version)

		// TODO(burdiyan): at some point we want to add backlinks for drafts too.
		it := conn.QueryObjectDatoms(obj, cs)
		for it.Next() {
			if err := backlinks.IndexDatom(conn, obj, change, it.Item().Datom()); err != nil {
				return err
			}
		}
		return it.Err()
	}); err != nil {
		return nil, err
	}

	if api.disc != nil {
		if err := api.disc.ProvideCID(oid); err != nil {
			return nil, err
		}
	}

	return api.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: in.DocumentId,
	})
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

	var inVersion vcs.Version
	if in.Version != "" {
		inVersion, err = vcs.ParseVersion(in.Version)
		if err != nil {
			return nil, err
		}
	}

	pub, err := api.loadPublication(ctx, oid, inVersion)
	if err == nil {
		return pub, nil
	}

	// We can only attempt to handle not found errors.
	if status.Code(err) != codes.NotFound {
		return nil, err
	}

	// If no discoverer is set we can't do anything else.
	if api.disc == nil {
		return nil, err
	}

	// We should only attempt to discover publication if didn't specify local only.
	if in.LocalOnly {
		return nil, err
	}

	if err := api.disc.DiscoverObject(ctx, oid, inVersion.CIDs()); err != nil {
		return nil, status.Errorf(codes.NotFound, "failed to discover object %q at version %q", oid.String(), inVersion.String())
	}

	return api.loadPublication(ctx, oid, inVersion)
}

func (api *Server) loadPublication(ctx context.Context, oid cid.Cid, v vcs.Version) (*documents.Publication, error) {
	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	out := &documents.Publication{}
	var found bool
	if err := conn.WithTx(false, func() error {
		obj := conn.LookupPermanode(oid)
		meLocal := conn.LookupIdentity(me)

		var version vcsdb.LocalVersion
		if v.IsZero() {
			version = conn.GetVersion(obj, "main", meLocal)
		} else {
			version = conn.PublicVersionToLocal(v)
		}

		if len(version) == 0 {
			return nil
		}

		if len(version) > 1 {
			return fmt.Errorf("TODO(burdiyan): can only get publication with 1 leaf change, got: %d", len(version))
		}
		cs := conn.ResolveChangeSet(obj, version)

		out.Document, err = api.getDocument(conn, obj, cs)
		if err != nil {
			return err
		}
		found = true

		out.Version = conn.LocalVersionToPublic(version).String()
		out.Document.PublishTime = out.Document.UpdateTime
		return nil
	}); err != nil {
		return nil, status.Errorf(codes.NotFound, "failed to find object %q at version %q: %v", oid.String(), v.String(), err)
	}

	if !found {
		return nil, status.Errorf(codes.NotFound, "not found object %q at version %q", oid.String(), v.String())
	}

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
			LocalOnly:  true,
		})
		if err != nil {
			continue
		}
		out.Publications = append(out.Publications, draft)
	}

	return out, nil
}

func mttdocToProto(id, author string, createTime time.Time, doc *mttdoc.Document) (*documents.Document, error) {
	if doc.Err() != nil {
		return nil, doc.Err()
	}

	docpb := &documents.Document{
		Id:         id,
		Title:      doc.Title(),
		Subtitle:   doc.Subtitle(),
		Author:     author,
		CreateTime: timestamppb.New(createTime),
		UpdateTime: timestamppb.New(doc.UpdateTime()),
	}

	blockMap := map[vcs.NodeID]*documents.BlockNode{}

	appendChild := func(parent vcs.NodeID, child *documents.BlockNode) {
		if parent == vcs.RootNode {
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
