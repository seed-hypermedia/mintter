// Package sitesql implements all the database related functions.
package sitesql

import (
	s "mintter/backend/daemon/storage"
	"mintter/backend/pkg/sqlitegen"
	"mintter/backend/pkg/sqlitegen/qb"
	"os"
)

var _ = generateQueries

const (
	// SiteRegistrationLinkKey is the column name of the meta table where we store the registration link.
	SiteRegistrationLinkKey = "site_registration_link"
	// SiteGroupIDKey is the group ID this site is serving. This is populated once the site is remotely initialized with the secret link.
	SiteGroupIDKey = "site_group_id"
	// SiteGroupVersionKey is the specific versiont of the group this site is serving. This may change through the life of the site as editors update it.
	SiteGroupVersionKey = "site_group_version"
)

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("sitesql",
		qb.MakeQuery(s.Schema, "SetServedGroupID", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.KV, qb.ListColShort(
				s.KVKey,
				s.KVValue,
			), '\n',
			"VALUES", qb.List(
				"'"+SiteGroupIDKey+"'",
				qb.Var("link", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(s.Schema, "GetServedGroupID", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.KVValue),
			),
			"FROM", s.KV,
			"WHERE", s.KVKey, "='"+SiteGroupIDKey+"'",
		),
	)
	if err != nil {
		return err
	}

	return os.WriteFile("queries.gen.go", code, 0600)
}
