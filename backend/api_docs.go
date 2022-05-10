package backend

import (
	"context"
	"sync"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	documents "mintter/backend/api/documents/v1alpha"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
)

// DocsServer combines Drafts and Publications servers.
type DocsServer interface {
	documents.DraftsServer
	documents.PublicationsServer
	documents.ContentGraphServer
}
type docsAPI struct {
	feedMu   sync.Mutex
	back     *backend
	draftsMu sync.Mutex

	*vcstypes.DocsAPI
}

func newDocsAPI(back *backend) DocsServer {
	srv := &docsAPI{
		back: back,
	}

	// This is ugly as hell, and racy. It's all mess right now while we're refactoring.
	// The problem here is lazy account initialization. We start up all the things
	// before actually having an account, so lots of things are messy because of that.
	go func() {
		<-back.repo.Ready()
		acc, err := back.Account()
		if err != nil {
			panic(err)
		}

		aid := cid.Cid(acc.id)

		device, err := core.NewKeyPair(core.CodecDeviceKey, back.repo.Device().priv.(*crypto.Ed25519PrivateKey))
		if err != nil {
			panic(err)
		}

		id := core.NewIdentity(aid, device)

		vcs := vcs.New(back.pool)

		docsapi := vcstypes.NewDocsAPI(id, back.pool, vcs)
		srv.DocsAPI = docsapi

	}()

	return srv
}

func draftToProto(d Draft) *documents.Document {
	return &documents.Document{
		Id:         d.ID.String(),
		Author:     d.Author.String(),
		Title:      d.Title,
		Subtitle:   d.Subtitle,
		Content:    string(d.Content),
		CreateTime: timestamppb.New(d.CreateTime),
		UpdateTime: timestamppb.New(d.UpdateTime),
	}
}

func (srv *docsAPI) UpdateDraft(ctx context.Context, in *documents.UpdateDraftRequest) (*documents.Document, error) {
	return nil, status.Error(codes.Unimplemented, "deprecated")
}

func (srv *docsAPI) parseDocumentID(id string) (cid.Cid, error) {
	c, err := cid.Decode(id)
	if err != nil {
		return cid.Undef, status.Errorf(codes.InvalidArgument, "failed to parse document id %s: %v", id, err)
	}
	return c, nil
}
