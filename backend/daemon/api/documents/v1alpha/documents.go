// Package documents provides the implementation of the Documents gRPC API.
package documents

import (
	"context"
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/pkg/errutil"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"mintter/backend/vcs/mttdoc"
	"mintter/backend/vcs/sqlitevcs"
	"mintter/backend/vcs/vcssql"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
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
}

// NewServer creates a new RPC handler.
func NewServer(me *future.ReadOnly[core.Identity], db *sqlitex.Pool, disc Discoverer, remoteCaller RemoteCaller) *Server {
	srv := &Server{
		db:           db,
		vcsdb:        sqlitevcs.New(db),
		me:           me,
		disc:         disc,
		RemoteCaller: remoteCaller,
	}

	return srv
}

// CreateDraft implements the corresponding gRPC method.
func (api *Server) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (out *documents.Document, err error) {
	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var (
		heads       []cid.Cid
		obj         cid.Cid
		clock       = hlc.NewClock()
		perma       vcs.EncodedPermanode
		newDocument = in.ExistingDocumentId == ""
	)
	if in.ExistingDocumentId != "" {
		obj, err = cid.Decode(in.ExistingDocumentId)
		if err != nil {
			return nil, errutil.ParseError("existing_document_id", in.ExistingDocumentId, obj, err)
		}

		_, err := conn.GetDraftChange(obj)
		if err == nil {
			return nil, fmt.Errorf("already have draft for document %s", in.ExistingDocumentId)
		}

		heads, err = conn.GetHeads(obj, false)
		if err != nil {
			return nil, err
		}

		for _, h := range heads {
			ts, err := conn.GetChangeTimestamp(h)
			if err != nil {
				return nil, err
			}
			clock.Track(hlc.Unpack(ts))
		}

		blk, err := conn.GetBlock(ctx, obj)
		if err != nil {
			return nil, fmt.Errorf("failed to get permanode for existing document %s: %w", in.ExistingDocumentId, err)
		}

		perma.ID = blk.Cid()
		perma.Data = blk.RawData()
		var docperma mttdoc.DocumentPermanode
		if err := cbornode.DecodeInto(perma.Data, &docperma); err != nil {
			return nil, fmt.Errorf("failed to decode permanode for document %s: %w", obj, err)
		}
		perma.Permanode = docperma

	} else {
		perma, err = vcs.EncodePermanode(mttdoc.NewDocumentPermanode(me.AccountID(), clock.Now()))
		if err != nil {
			return nil, err
		}
		obj = perma.ID
	}

	data, err := proto.Marshal(&documents.UpdateDraftRequestV2{})
	if err != nil {
		return nil, fmt.Errorf("failed to encode empty patch: %w", err)
	}

	ch := vcs.NewChange(me, obj, heads, sqlitevcs.KindDocument, clock.Now(), data)
	vc, err := ch.Block()
	if err != nil {
		return nil, err
	}

	if err := conn.WithTx(true, func() error {
		if newDocument {
			conn.NewObject(perma)
		}
		conn.StoreChange(vc)
		conn.MarkChangeAsDraft(obj, vc.Cid())
		return nil
	}); err != nil {
		return nil, err
	}

	var doc *docState
	if err := conn.WithTx(false, func() error {
		doc, err = api.loadDocument(ctx, conn, true, obj, []cid.Cid{vc.Cid()})
		return err
	}); err != nil {
		return nil, err
	}

	return doc.hydrate(), nil
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

	chid, err := conn.GetDraftChange(oid)
	if err != nil {
		return nil, fmt.Errorf("no draft change for document %s: %w", in.DocumentId, err)
	}

	var oldChange vcs.Change
	oldPatch := &documents.UpdateDraftRequestV2{}
	{
		blk, err := conn.GetBlock(ctx, chid)
		if err != nil {
			return nil, err
		}

		oldChange, err = vcs.DecodeChange(blk.RawData())
		if err != nil {
			return nil, err
		}

		if err := proto.Unmarshal(oldChange.Body, oldPatch); err != nil {
			return nil, err
		}
	}

	// Combine new patch with the old one and cleanup redundant operations.
	// This is a bit nasty at the moment. Will need to be improved.
	// We want to store only latest relevant operation, so we iterate backwards
	// combining old an new patch.
	newPatch := &documents.UpdateDraftRequestV2{}
	if err := cleanupPatch(newPatch, oldPatch, in); err != nil {
		return nil, fmt.Errorf("failed to cleanup draft patch: %w", err)
	}

	newBody, err := proto.Marshal(newPatch)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal updated change body: %w", err)
	}

	newChange, err := vcs.NewChange(me, oid, oldChange.Parents, oldChange.Kind,
		hlc.NewClockAt(oldChange.Time).Now(), newBody).Block()
	if err != nil {
		return nil, fmt.Errorf("failed to create rewritten change: %w", err)
	}

	if err := conn.WithTx(true, func() error {
		conn.RewriteChange(chid, newChange)
		return nil
	}); err != nil {
		return nil, err
	}

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
	// TODO: Check if draft change exists.

	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	var doc *docState
	if err := conn.WithTx(false, func() error {
		// We don't want to get changes that we might have created concurrently with this draft.
		draft, err := conn.GetDraftChange(oid)
		if err != nil {
			return err
		}

		doc, err = api.loadDocument(ctx, conn, true, oid, []cid.Cid{draft})
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return doc.hydrate(), nil
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

		var docperma mttdoc.DocumentPermanode
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
