// Package documents provides the implementation of the Documents gRPC API.
package documents

import (
	"bytes"
	"context"
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/logging"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"mintter/backend/vcs/sqlitevcs"
	"mintter/backend/vcs/vcssql"
	"sort"
	"strings"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/jaevor/go-nanoid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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
	Connect(context.Context, peer.AddrInfo) error
}

// RemoteCaller is an interface for not having to pass a full-fledged sites service,
// just the remote functions that need to be called from the local server.
type RemoteCaller interface {
	RedeemInviteToken(context.Context, *documents.RedeemInviteTokenRequest) (*documents.RedeemInviteTokenResponse, error)
	ListWebPublications(ctx context.Context, in *documents.ListWebPublicationsRequest) (*documents.ListWebPublicationsResponse, error)
}

// Server implements DocumentsServer gRPC API.
type Server struct {
	db           *sqlitex.Pool
	vcsdb        *sqlitevcs.DB
	me           *future.ReadOnly[core.Identity]
	disc         Discoverer
	RemoteCaller RemoteCaller
	blobs        *hyper.Storage
}

// NewServer creates a new RPC handler.
func NewServer(me *future.ReadOnly[core.Identity], db *sqlitex.Pool, disc Discoverer, remoteCaller RemoteCaller) *Server {
	srv := &Server{
		db:           db,
		vcsdb:        sqlitevcs.New(db),
		me:           me,
		disc:         disc,
		RemoteCaller: remoteCaller,
		blobs:        hyper.NewStorage(db, logging.New("mintter/hyper", "debug")),
	}

	return srv
}

// CreateDraft implements the corresponding gRPC method.
func (api *Server) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (out *documents.Document, err error) {
	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	if in.ExistingDocumentId != "" {
		eid := hyper.NewEntityID("mintter:document", in.ExistingDocumentId)

		ok, err := api.blobs.HasDraft(ctx, eid)
		if err != nil {
			return nil, err
		}
		if ok {
			return nil, status.Errorf(codes.FailedPrecondition, "draft for %s already exists", in.ExistingDocumentId)
		}

		panic("TODO update publication")
	}

	docid := newDocumentID()
	eid := hyper.NewEntityID("mintter:document", docid)

	entity := hyper.NewEntity(eid)

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	dm, err := newDocumentMutation(entity, me.DeviceKey(), del, cid.Undef)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if err := dm.SetCreateTime(now); err != nil {
		return nil, err
	}
	if err := dm.SetAuthor(me.Account().Principal()); err != nil {
		return nil, err
	}

	_, err = dm.Commit(ctx, api.blobs)
	if err != nil {
		return nil, err
	}

	return api.GetDraft(ctx, &documents.GetDraftRequest{
		DocumentId: docid,
	})
}

// UpdateDraftV2 implements the corresponding gRPC method.
func (api *Server) UpdateDraftV2(ctx context.Context, in *documents.UpdateDraftRequestV2) (*emptypb.Empty, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID")
	}

	if in.Changes == nil {
		return nil, status.Errorf(codes.InvalidArgument, "must send some changes to apply to the document")
	}

	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	eid := hyper.NewEntityID("mintter:document", in.DocumentId)

	ok, err := api.blobs.HasDraft(ctx, eid)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, status.Errorf(codes.NotFound, "no draft for document %s", in.DocumentId)
	}

	entity, err := api.blobs.LoadEntity(ctx, eid, hyper.WithLoadDrafts())
	if err != nil {
		return nil, err
	}
	if entity == nil {
		return nil, fmt.Errorf("BUG: failed to load entity but draft exists")
	}

	if len(entity.AppliedChanges()) != 1 {
		panic("TODO: implement updating draft for published shit")
	}

	patch := map[string]any{}
	_ = patch
	_ = me

	panic("TODO update draft")

	// for _, op := range in.Changes {
	// 	switch o := op.Op.(type) {
	// 	case *documents.DocumentChange_SetTitle:
	// 		v, ok := entity.Get("title")
	// 		if !ok || v.(string) != o.SetTitle {
	// 			patch["title"] = o.SetTitle
	// 		}
	// 	case *documents.DocumentChange_MoveBlock_:
	// 		if err := ds.tree.SetNodePosition(site, op.MoveBlock.BlockId, op.MoveBlock.Parent, op.MoveBlock.LeftSibling); err != nil {
	// 			return fmt.Errorf("failed to apply move operation: %w", err)
	// 		}
	// 	case *documents.DocumentChange_DeleteBlock:
	// 		if err := ds.tree.DeleteNode(site, op.DeleteBlock); err != nil {
	// 			return fmt.Errorf("failed to delete block %s: %w", op.DeleteBlock, err)
	// 		}
	// 	case *documents.DocumentChange_ReplaceBlock:
	// 		if ds.blocks[op.ReplaceBlock.Id] == nil {
	// 			ds.blocks[op.ReplaceBlock.Id] = make(map[cid.Cid]*documents.Block)
	// 		}
	// 		op.ReplaceBlock.Revision = vc.Cid().String()
	// 		ds.blocks[op.ReplaceBlock.Id][vc.Cid()] = op.ReplaceBlock
	// 	case *documents.DocumentChange_SetWebUrl:
	// 		ds.webURL[vc.Cid()] = op.SetWebUrl
	// 	default:
	// 		panic("BUG: unhandled document change")
	// 	}
	// }

	return &emptypb.Empty{}, nil
}

func cleanupPatch(newPatch, oldPatch, incoming *documents.UpdateDraftRequestV2) error {
	newPatch.Changes = make([]*documents.DocumentChange, 0, len(oldPatch.Changes)+len(incoming.Changes))
	for _, c := range oldPatch.Changes {
		op, ok := c.Op.(*documents.DocumentChange_ReplaceBlock)
		if ok {
			op.ReplaceBlock.Revision = ""
		}
		newPatch.Changes = append(newPatch.Changes, c)
	}

	for _, c := range incoming.Changes {
		op, ok := c.Op.(*documents.DocumentChange_ReplaceBlock)
		if ok {
			op.ReplaceBlock.Revision = ""
		}
		newPatch.Changes = append(newPatch.Changes, c)
	}

	return nil

	// TODO(burdiyan): cleanup patch from redundant operations.
	// newPatch.Changes = make([]*documents.DocumentChange, len(oldPatch.Changes)+len(incoming.Changes))

	// var (
	// 	changedTitle    bool
	// 	changedSubtitle bool
	// )

	// for i := len(incoming.Changes) - 1; i >= 0; i-- {
	// 	op :=
	// }
}

// GetDraft implements the corresponding gRPC method.
func (api *Server) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
	eid := hyper.NewEntityID("mintter:document", in.DocumentId)

	ok, err := api.blobs.HasDraft(ctx, eid)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, status.Errorf(codes.NotFound, "no draft for document %s", in.DocumentId)
	}

	entity, err := api.blobs.LoadEntity(ctx, eid, hyper.WithLoadDrafts())
	if err != nil {
		return nil, err
	}
	if entity == nil {
		panic(fmt.Errorf("BUG: failed to load document entity %s after checking draft exists", in.DocumentId))
	}

	return hydrateDocument(ctx, api.blobs, entity)
}

// ListDrafts implements the corresponding gRPC method.
func (api *Server) ListDrafts(ctx context.Context, in *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	conn, release, err := api.db.Conn(ctx)
	if err != nil {
		return nil, err
	}

	docs, err := vcssql.PermanodesListByType(conn, string(sqlitevcs.DocumentType))
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

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	conn.PublishDraft(oid)

	if err := conn.Err(); err != nil {
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

	ch, err := conn.GetDraftChange(oid)
	if err != nil {
		return nil, err
	}

	if err := conn.WithTx(true, func() error {
		if err := conn.DeleteBlock(ctx, ch); err != nil {
			return fmt.Errorf("failed to delete draft %s: %w", in.DocumentId, err)
		}

		// TODO(burdiyan): make this more efficient. Counting is enough, don't need to list.
		list, err := conn.ListChanges(oid)
		if err != nil {
			return err
		}

		if len(list) == 0 {
			if err := conn.DeleteBlock(ctx, oid); err != nil {
				return err
			}
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
	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var found bool
	var doc *docState
	if err := conn.WithTx(false, func() error {
		heads := v.CIDs()
		if heads == nil {
			heads, err = conn.GetHeads(oid, false)
			if err != nil {
				return err
			}
		}
		if heads == nil {
			return fmt.Errorf("not found any changes for publication %s", oid)
		}

		doc, err = api.loadDocument(ctx, conn, false, oid, heads)
		if err != nil {
			return err
		}
		found = true
		return nil
	}); err != nil {
		return nil, status.Errorf(codes.NotFound, "failed to find object %q at version %q: %v", oid.String(), v.String(), err)
	}

	if !found {
		return nil, status.Errorf(codes.NotFound, "not found object %q at version %q", oid.String(), v.String())
	}

	docpb := doc.hydrate()
	docpb.PublishTime = docpb.UpdateTime

	return &documents.Publication{
		Document: docpb,
		Version:  doc.version(),
	}, nil
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

	docs, err := vcssql.PermanodesListByType(conn, string(sqlitevcs.DocumentType))
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

func (api *Server) loadDocument(ctx context.Context, conn *sqlitevcs.Conn, includeDrafts bool, oid cid.Cid, heads []cid.Cid) (*docState, error) {
	obj := conn.LookupPermanode(oid)
	var cs sqlitevcs.ChangeSet
	v := vcs.NewVersion(heads...)
	if !v.IsZero() {
		ver := conn.PublicVersionToLocal(v)
		cs = conn.ResolveChangeSet(obj, ver)
	}

	var createTime time.Time
	var author cid.Cid
	{
		blk, err := conn.GetBlock(ctx, oid)
		if err != nil {
			return nil, fmt.Errorf("failed to get permanode for draft %s: %w", oid, err)
		}

		var docperma sqlitevcs.DocumentPermanode
		if err := cbornode.DecodeInto(blk.RawData(), &docperma); err != nil {
			return nil, fmt.Errorf("failed to decode permanode for draft %s: %w", oid, err)
		}

		createTime = docperma.CreateTime.Time()
		author = docperma.Owner
	}
	doc := newDocState(oid, author, createTime)

	conn.IterateChanges(oid, includeDrafts, cs, func(vc vcs.VerifiedChange) error {
		return doc.applyChange(vc)
	})

	return doc, nil
}

func (api *Server) getMe() (core.Identity, error) {
	me, ok := api.me.Get()
	if !ok {
		return core.Identity{}, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}
	return me, nil
}

func (api *Server) getDelegation(ctx context.Context) (cid.Cid, error) {
	me, err := api.getMe()
	if err != nil {
		return cid.Undef, err
	}

	var out cid.Cid

	// TODO(burdiyan): need to cache this. Makes no sense to always do this.
	if err := api.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		acc := me.Account().Principal()
		dev := me.DeviceKey().Principal()

		list, err := hypersql.KeyDelegationsList(conn, acc)
		if err != nil {
			return err
		}

		for _, res := range list {
			if bytes.Equal(dev, res.KeyDelegationsViewDelegate) {
				out = cid.NewCidV1(uint64(res.KeyDelegationsViewBlobCodec), res.KeyDelegationsViewBlobsMultihash)
				return nil
			}
		}

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	if !out.Defined() {
		return out, fmt.Errorf("BUG: failed to find our own key delegation")
	}

	return out, nil
}

var nanogen = must.Do2(nanoid.Standard(21))

func newDocumentID() string {
	return nanogen()
}

func hydrateDocument(ctx context.Context, blobs *hyper.Storage, e *hyper.Entity) (*documents.Document, error) {
	docpb := &documents.Document{}

	docpb.Id = strings.TrimPrefix(string(e.ID()), "mintter:document:")

	{
		v, ok := e.Get("createTime")
		if !ok {
			return nil, fmt.Errorf("all documents must have create time")
		}
		switch vv := v.(type) {
		case time.Time:
			docpb.CreateTime = timestamppb.New(vv)
		case int:
			docpb.CreateTime = timestamppb.New(time.Unix(int64(vv), 0).UTC())
		default:
			return nil, fmt.Errorf("unknown type %T for createTime field", v)
		}
	}

	docpb.UpdateTime = timestamppb.New(e.LastChangeTime().Time())

	{
		v, ok := e.Get("author")
		if !ok {
			return nil, fmt.Errorf("all documents must have author")
		}

		switch vv := v.(type) {
		case core.Principal:
			docpb.Author = vv.String()
		case []byte:
			docpb.Author = core.Principal(vv).String()
		default:
			return nil, fmt.Errorf("unknown type %T for document author", v)
		}
	}

	// Loading editors is a bit cumbersome because we need to go over key delegations.
	{
		seenEditors := map[cid.Cid]struct{}{}
		for _, ch := range e.AppliedChanges() {
			del := ch.Delegation
			if !del.Defined() {
				return nil, fmt.Errorf("all document changes must have delegations")
			}
			if _, ok := seenEditors[del]; ok {
				continue
			}

			var kd hyper.KeyDelegation
			if err := blobs.LoadBlob(ctx, del, &kd); err != nil {
				return nil, fmt.Errorf("failed to load key delegation: %w", err)
			}

			docpb.Editors = append(docpb.Editors, kd.Issuer.String())
		}
		sort.Strings(docpb.Editors)
	}

	return docpb, nil
}
