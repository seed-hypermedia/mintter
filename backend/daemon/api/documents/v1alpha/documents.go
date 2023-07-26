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
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/jaevor/go-nanoid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

// Discoverer is a subset of the syncing service that
// is able to discover given Mintter objects, optionally specifying versions.
type Discoverer interface {
	DiscoverObject(context.Context, hyper.EntityID, hyper.Version) error
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
	me           *future.ReadOnly[core.Identity]
	disc         Discoverer
	RemoteCaller RemoteCaller
	blobs        *hyper.Storage
}

// NewServer creates a new RPC handler.
func NewServer(me *future.ReadOnly[core.Identity], db *sqlitex.Pool, disc Discoverer, remoteCaller RemoteCaller) *Server {
	srv := &Server{
		db:           db,
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
		eid := hyper.EntityID("hd://d/" + in.ExistingDocumentId)

		_, err := api.blobs.FindDraft(ctx, eid)
		if err == nil {
			return nil, status.Errorf(codes.FailedPrecondition, "draft for %s already exists", in.ExistingDocumentId)
		}

		var entity *hyper.Entity
		if in.Version == "" {
			entity, err = api.blobs.LoadEntity(ctx, eid, false)
			if err != nil {
				return nil, err
			}
		} else {
			heads, err := hyper.Version(in.Version).Parse()
			if err != nil {
				return nil, status.Errorf(codes.InvalidArgument, "unable to parse version %s: %v", in.Version, err)
			}

			entity, err = api.blobs.LoadEntityFromHeads(ctx, eid, heads...)
			if err != nil {
				return nil, err
			}
		}

		del, err := api.getDelegation(ctx)
		if err != nil {
			return nil, err
		}

		hb, err := entity.CreateChange(entity.NextTimestamp(), me.DeviceKey(), del, map[string]any{})
		if err != nil {
			return nil, err
		}

		if err := api.blobs.SaveDraftBlob(ctx, eid, hb); err != nil {
			return nil, err
		}

		return api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: in.ExistingDocumentId})
	}

	docid := newDocumentID()
	eid := hyper.EntityID("hd://d/" + docid)

	entity := hyper.NewEntity(eid)

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	dm, err := newDocModel(entity, me.DeviceKey(), del)
	if err != nil {
		return nil, err
	}

	dm.nextHLC = dm.e.NextTimestamp() // TODO(burdiyan): this is a workaround that should not be necessary.

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

// UpdateDraft implements the corresponding gRPC method.
func (api *Server) UpdateDraft(ctx context.Context, in *documents.UpdateDraftRequest) (*documents.UpdateDraftResponse, error) {
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

	eid := hyper.EntityID("hd://d/" + in.DocumentId)

	draft, err := api.blobs.LoadDraft(ctx, eid)
	if err != nil {
		return nil, err
	}
	if draft == nil {
		return nil, status.Errorf(codes.NotFound, "no draft for entity %s", eid)
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	mut, err := newDocModel(draft.Entity, me.DeviceKey(), del)
	if err != nil {
		return nil, err
	}

	if err := mut.restoreDraft(draft.CID, draft.Change); err != nil {
		return nil, fmt.Errorf("failed to restore draft: %w", err)
	}

	for _, op := range in.Changes {
		switch o := op.Op.(type) {
		case *documents.DocumentChange_SetTitle:
			if err := mut.SetTitle(o.SetTitle); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_MoveBlock_:
			if err := mut.MoveBlock(o.MoveBlock.BlockId, o.MoveBlock.Parent, o.MoveBlock.LeftSibling); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_DeleteBlock:
			if err := mut.DeleteBlock(o.DeleteBlock); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_ReplaceBlock:
			if err := mut.ReplaceBlock(o.ReplaceBlock); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_SetWebUrl:
			if err := mut.SetWebURL(o.SetWebUrl); err != nil {
				return nil, err
			}
		default:
			panic("BUG: unhandled document change")
		}
	}

	blob, err := mut.Commit(ctx, api.blobs)
	if err != nil {
		return nil, err
	}

	return &documents.UpdateDraftResponse{
		ChangeId: blob.CID.String(),
	}, nil
}

// GetDraft implements the corresponding gRPC method.
func (api *Server) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID to get the draft")
	}

	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	eid := hyper.EntityID("hd://d/" + in.DocumentId)

	entity, err := api.blobs.LoadDraftEntity(ctx, eid)
	if err != nil {
		return nil, err
	}
	if entity == nil {
		return nil, status.Errorf(codes.NotFound, "not found draft for entity %s", eid)
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	mut, err := newDocModel(entity, me.DeviceKey(), del)
	if err != nil {
		return nil, err
	}

	return mut.hydrate(ctx, api.blobs)
}

// ListDrafts implements the corresponding gRPC method.
func (api *Server) ListDrafts(ctx context.Context, in *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	entities, err := api.blobs.ListEntities(ctx, "hd://d/")
	if err != nil {
		return nil, err
	}

	resp := &documents.ListDraftsResponse{
		Documents: make([]*documents.Document, 0, len(entities)),
	}

	for _, e := range entities {
		docid := e.TrimPrefix("hd://d/")
		draft, err := api.GetDraft(ctx, &documents.GetDraftRequest{
			DocumentId: docid,
		})
		if err != nil {
			continue
		}
		resp.Documents = append(resp.Documents, draft)
	}

	return resp, nil
}

// PublishDraft implements the corresponding gRPC method.
func (api *Server) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID to get the draft")
	}

	eid := hyper.EntityID("hd://d/" + in.DocumentId)

	oid, err := eid.CID()
	if err != nil {
		return nil, fmt.Errorf("failed to conver document to CID: %w", err)
	}

	c, err := api.blobs.PublishDraft(ctx, eid)
	if err != nil {
		return nil, err
	}

	if api.disc != nil {
		if err := api.disc.ProvideCID(oid); err != nil {
			return nil, err
		}
	}

	return api.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: in.DocumentId,
		Version:    c.String(),
		LocalOnly:  true,
	})
}

// DeleteDraft implements the corresponding gRPC method.
func (api *Server) DeleteDraft(ctx context.Context, in *documents.DeleteDraftRequest) (*emptypb.Empty, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify draft ID to delete")
	}

	eid := hyper.EntityID("hd://d/" + in.DocumentId)

	if err := api.blobs.DeleteDraft(ctx, eid); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

// GetPublication implements the corresponding gRPC method.
func (api *Server) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (docpb *documents.Publication, err error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID to get the draft")
	}

	eid := hyper.EntityID("hd://d/" + in.DocumentId)
	version := hyper.Version(in.Version)

	pub, err := api.loadPublication(ctx, eid, version)
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

	if err := api.disc.DiscoverObject(ctx, eid, version); err != nil {
		return nil, status.Errorf(codes.NotFound, "failed to discover object %q at version %q", eid, version)
	}

	return api.loadPublication(ctx, eid, version)
}

func (api *Server) loadPublication(ctx context.Context, docid hyper.EntityID, version hyper.Version) (docpb *documents.Publication, err error) {
	var entity *hyper.Entity
	if version != "" {
		heads, err := hyper.Version(version).Parse()
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "bad version: %v", err)
		}

		entity, err = api.blobs.LoadEntityFromHeads(ctx, docid, heads...)
		if err != nil {
			return nil, err
		}
	} else {
		entity, err = api.blobs.LoadEntity(ctx, docid, false)
		if err != nil {
			return nil, err
		}
	}
	if entity == nil {
		return nil, status.Errorf(codes.NotFound, "no published changes for entity %s", docid)
	}

	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	mut, err := newDocModel(entity, me.DeviceKey(), del)
	if err != nil {
		return nil, err
	}

	doc, err := mut.hydrate(ctx, api.blobs)
	if err != nil {
		return nil, err
	}
	doc.PublishTime = doc.UpdateTime

	return &documents.Publication{
		Document: doc,
		Version:  mut.e.Version().String(),
	}, nil
}

// DeletePublication implements the corresponding gRPC method.
func (api *Server) DeletePublication(ctx context.Context, in *documents.DeletePublicationRequest) (*emptypb.Empty, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify publication ID to delete")
	}

	eid := hyper.EntityID("hd://d/" + in.DocumentId)

	if err := api.blobs.DeleteEntity(ctx, eid); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

// ListPublications implements the corresponding gRPC method.
func (api *Server) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	entities, err := api.blobs.ListEntities(ctx, "hd://d/")
	if err != nil {
		return nil, err
	}

	resp := &documents.ListPublicationsResponse{
		Publications: make([]*documents.Publication, 0, len(entities)),
	}

	for _, e := range entities {
		docid := e.TrimPrefix("hd://d/")
		pub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{
			DocumentId: docid,
			LocalOnly:  true,
		})
		if err != nil {
			continue
		}
		resp.Publications = append(resp.Publications, pub)
	}

	return resp, nil
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
				out = cid.NewCidV1(uint64(res.KeyDelegationsViewBlobCodec), res.KeyDelegationsViewBlobMultihash)
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

// Almost same as standard nanoid, but removing non-alphanumeric chars, to get a bit nicer selectable string.
// Using a bit larger length to compensate.
// See https://zelark.github.io/nano-id-cc for playing around with collision resistance.
var nanogen = must.Do2(nanoid.CustomASCII("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 22))

func newDocumentID() string {
	return nanogen()
}
