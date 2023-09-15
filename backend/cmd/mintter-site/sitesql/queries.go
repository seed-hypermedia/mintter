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
		qb.MakeQuery(s.Schema, "RegisterSite", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.ServedSites, qb.ListColShort(
				s.ServedSitesHostname,
				s.ServedSitesGroupID,
				s.ServedSitesVersion,
				s.ServedSitesOwnerID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ServedSitesHostname),
				qb.SubQuery(
					"SELECT", s.EntitiesID,
					"FROM", s.Entities,
					"WHERE", s.EntitiesEID, "=", qb.Var("group_eid", sqlitegen.TypeText),
				),
				qb.VarCol(s.ServedSitesVersion),
				qb.SubQuery(
					"SELECT", s.PublicKeysID,
					"FROM", s.PublicKeys,
					"WHERE", s.PublicKeysPrincipal, "=", qb.VarCol(s.PublicKeysPrincipal),
				),
			),
		),
		qb.MakeQuery(s.Schema, "GetSiteInfo", sqlitegen.QueryKindSingle,
			"SELECT",
			qb.Results(
				qb.ResultCol(s.EntitiesEID),
				qb.ResultCol(s.ServedSitesVersion),
				qb.ResultCol(s.PublicKeysPrincipal),
			), '\n',
			"FROM", s.ServedSites, '\n',
			"JOIN", s.Entities, "ON", s.EntitiesID, "=", s.ServedSitesGroupID, '\n',
			"JOIN", s.PublicKeys, "ON", s.PublicKeysPrincipal, "=", s.ServedSitesOwnerID, '\n',
			"WHERE", s.ServedSitesHostname, "=", qb.VarCol(s.ServedSitesHostname),
		),

		qb.MakeQuery(s.Schema, "SetSiteRegistrationLink", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.KV, qb.ListColShort(
				s.KVKey,
				s.KVValue,
			), '\n',
			"VALUES", qb.List(
				"'"+SiteRegistrationLinkKey+"'",
				qb.Var("link", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(s.Schema, "GetSiteRegistrationLink", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.KVValue),
			),
			"FROM", s.KV,
			"WHERE", s.KVKey, "='"+SiteRegistrationLinkKey+"'",
		),

		qb.MakeQuery(s.Schema, "SetSiteGroupID", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.KV, qb.ListColShort(
				s.KVKey,
				s.KVValue,
			), '\n',
			"VALUES", qb.List(
				"'"+SiteGroupIDKey+"'",
				qb.Var("eid", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(s.Schema, "GetSiteGroupID", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.KVValue),
			),
			"FROM", s.KV,
			"WHERE", s.KVKey, "='"+SiteGroupIDKey+"'",
		),

		qb.MakeQuery(s.Schema, "SetSiteGroupVersion", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.KV, qb.ListColShort(
				s.KVKey,
				s.KVValue,
			), '\n',
			"VALUES", qb.List(
				"'"+SiteGroupVersionKey+"'",
				qb.Var("eid", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(s.Schema, "GetSiteGroupVersion", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.KVValue),
			),
			"FROM", s.KV,
			"WHERE", s.KVKey, "='"+SiteGroupVersionKey+"'",
		),
	)
	if err != nil {
		return err
	}

	return os.WriteFile("queries.gen.go", code, 0600)
}
