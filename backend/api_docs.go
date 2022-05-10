package backend

import (
	"github.com/ipfs/go-cid"

	documents "mintter/backend/api/documents/v1alpha"
	"mintter/backend/core"
	"mintter/backend/vcs"
)

// DocsServer combines Drafts and Publications servers.
type DocsServer interface {
	documents.DraftsServer
	documents.PublicationsServer
	documents.ContentGraphServer
}
type docsAPI struct {
	*documents.Server
}

func newDocsAPI(back *backend) DocsServer {
	srv := &docsAPI{}

	// This is ugly as hell, and racy. It's all mess right now while we're refactoring.
	// The problem here is lazy account initialization. We start up all the things
	// before actually having an account, so lots of things are messy because of that.
	go func() {
		<-back.repo.Ready()
		acc, err := back.Account()
		if err != nil {
			panic(err)
		}

		aid := cid.Cid(acc.CID())

		id := core.NewIdentity(aid, back.repo.Device())

		vcs := vcs.New(back.pool)

		docsapi := documents.NewServer(id, back.pool, vcs)
		srv.Server = docsapi

	}()

	return srv
}
