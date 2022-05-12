package backend

import (
	"mintter/backend/core"
	documents "mintter/backend/daemon/api/documents/v1alpha"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"

	"crawshaw.io/sqlite/sqlitex"
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

func newDocsAPI(id *future.ReadOnly[core.Identity], vcs *vcs.SQLite, pool *sqlitex.Pool) DocsServer {
	return &docsAPI{
		Server: documents.NewServer(id, pool, vcs),
	}
}
