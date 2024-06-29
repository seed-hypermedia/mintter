// Package documents implements Documents API v2.
package documents

import (
	"context"
	"seed/backend/core"
	"seed/backend/daemon/api/documents/v2alpha/docmodel"
	"seed/backend/daemon/index"
	documents "seed/backend/genproto/documents/v2alpha"
	"seed/backend/hlc"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements Documents API v2.
type Server struct {
	documents.UnimplementedDraftsServer
	documents.UnimplementedDocumentsServer

	keys core.KeyStore
	idx  *index.Index
}

// NewServer creates a new Documents API v2 server.
func NewServer(keys core.KeyStore, idx *index.Index) *Server {
	return &Server{
		keys: keys,
		idx:  idx,
	}
}

// RegisterServer registers the server with the gRPC server.
func (srv *Server) RegisterServer(rpc grpc.ServiceRegistrar) {
	documents.RegisterDraftsServer(rpc, srv)
	documents.RegisterDocumentsServer(rpc, srv)
}

func (srv *Server) GetProfileDocument(ctx context.Context, in *documents.GetProfileDocumentRequest) (*documents.Document, error) {
	if in.Version != "" {
		// TODO(hm24): Implement this.
		return nil, status.Errorf(codes.Unimplemented, "getting profile document by version is not implemented yet")
	}

	if in.AccountId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "account_id is required")
	}

	acc, err := core.DecodePrincipal(in.AccountId)
	if err != nil {
		return nil, err
	}

	kp, err := srv.getKey(ctx, acc)
	if err != nil {
		return nil, err
	}

	adoc := index.IRI("hm://a/" + acc.String())

	clock := hlc.NewClock()
	e := docmodel.NewEntityWithClock(index.IRI("hm://a/"+acc.String()), clock)

	if err := srv.idx.WalkChanges(ctx, adoc, acc, func(c cid.Cid, ch *index.Change) error {
		return e.ApplyChange(c, ch)
	}); err != nil {
		return nil, err
	}

	doc, err := docmodel.New(e, kp, clock.MustNow())
	if err != nil {
		return nil, err
	}

	return doc.Hydrate(ctx)
}

// ChangeProfileDocument implements Documents API v2.
func (srv *Server) ChangeProfileDocument(ctx context.Context, in *documents.ChangeProfileDocumentRequest) (*documents.Document, error) {
	if in.AccountId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "account_id is required")
	}

	if len(in.Changes) == 0 {
		return nil, status.Errorf(codes.InvalidArgument, "at least one change is required")
	}

	acc, err := core.DecodePrincipal(in.AccountId)
	if err != nil {
		return nil, err
	}

	kp, err := srv.getKey(ctx, acc)
	if err != nil {
		return nil, err
	}

	adoc := index.IRI("hm://a/" + acc.String())

	if err := srv.ensureProfileGenesis(ctx, kp); err != nil {
		return nil, err
	}

	clock := hlc.NewClock()
	e := docmodel.NewEntityWithClock(index.IRI("hm://a/"+acc.String()), clock)

	if err := srv.idx.WalkChanges(ctx, adoc, acc, func(c cid.Cid, ch *index.Change) error {
		return e.ApplyChange(c, ch)
	}); err != nil {
		return nil, err
	}

	doc, err := docmodel.New(e, kp, clock.MustNow())
	if err != nil {
		return nil, err
	}

	for _, op := range in.Changes {
		switch o := op.Op.(type) {
		case *documents.DocumentChange_SetMetadata_:
			if err := doc.SetMetadata(o.SetMetadata.Key, o.SetMetadata.Value); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_MoveBlock_:
			if err := doc.MoveBlock(o.MoveBlock.BlockId, o.MoveBlock.Parent, o.MoveBlock.LeftSibling); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_DeleteBlock:
			if err := doc.DeleteBlock(o.DeleteBlock); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_ReplaceBlock:
			if err := doc.ReplaceBlock(o.ReplaceBlock); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_SetIndex_:
			return nil, status.Errorf(codes.Unimplemented, "setting index is not implemented yet")
		case *documents.DocumentChange_UpdateMember_:
			return nil, status.Errorf(codes.InvalidArgument, "updating members is not supported on profile documents")
		default:
			return nil, status.Errorf(codes.Unimplemented, "unknown operation %T", o)
		}
	}

	if _, err := doc.Commit(ctx, srv.idx); err != nil {
		return nil, err
	}

	return srv.GetProfileDocument(ctx, &documents.GetProfileDocumentRequest{
		AccountId: in.AccountId,
	})
}

func (srv *Server) getKey(ctx context.Context, account core.Principal) (kp core.KeyPair, err error) {
	// TODO(hm24): This is a hack here.
	// We don't have a way to get a key by account ID.
	// This call should either accept a key name, or get rid of this idea.
	keys, err := srv.keys.ListKeys(ctx)
	if err != nil {
		return core.KeyPair{}, err
	}

	var found bool
	for _, k := range keys {
		if k.PublicKey.Equal(account) {
			kp, err = srv.keys.GetKey(ctx, k.Name)
			if err != nil {
				return core.KeyPair{}, err
			}
			found = true
			break
		}
	}

	if !found {
		return core.KeyPair{}, status.Errorf(codes.NotFound, "there's no private key for the specified account ID %s", account)
	}

	return kp, nil
}

func (srv *Server) ensureProfileGenesis(ctx context.Context, kp core.KeyPair) error {
	ebc, err := index.NewChange(kp, nil, "Create", nil, index.ProfileGenesisEpoch)
	if err != nil {
		return err
	}

	ebr, err := index.NewRef(kp, ebc.CID, index.IRI("hm://a/"+kp.Principal().String()), []cid.Cid{ebc.CID}, index.ProfileGenesisEpoch)
	if err != nil {
		return err
	}

	if err := srv.idx.PutMany(ctx, []blocks.Block{ebc, ebr}); err != nil {
		return err
	}

	return nil
}
