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
	// SiteTitleKey is the column name of the meta table where the site title (in case this node is a site) is stored.
	SiteTitleKey = "site_title"
	// SiteDescriptionKey is the column name of the meta table where the site description (in case this node is a site) is stored.
	SiteDescriptionKey = "site_description"
)

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("sitesql",
		qb.MakeQuery(s.Schema, "AddSite", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.Sites, qb.ListColShort(
				s.SitesAccountID,
				s.SitesAddresses,
				s.SitesHostname,
				s.SitesRole,
			), '\n',
			"VALUES", qb.List(
				qb.SubQuery(
					"SELECT", s.PublicKeysID,
					"FROM", s.PublicKeys,
					"WHERE", s.PublicKeysPrincipal, "=", qb.VarCol(s.PublicKeysPrincipal),
				),
				qb.VarCol(s.SitesAddresses),
				qb.VarCol(s.SitesHostname),
				qb.VarCol(s.SitesRole),
			),
		),
		qb.MakeQuery(s.Schema, "RemoveSite", sqlitegen.QueryKindExec,
			"DELETE FROM", s.Sites,
			"WHERE", s.SitesHostname, "=", qb.VarCol(s.SitesHostname),
		),

		qb.MakeQuery(s.Schema, "GetSite", sqlitegen.QueryKindSingle,
			"SELECT",
			qb.Results(
				qb.ResultCol(s.SitesAddresses),
				qb.ResultCol(s.SitesHostname),
				qb.ResultCol(s.SitesRole),
				qb.ResultCol(s.PublicKeysPrincipal),
			), '\n',
			"FROM", s.Sites, '\n',
			"JOIN", s.PublicKeys, "ON", s.PublicKeysID, "=", s.SitesAccountID, '\n',
			"WHERE", s.SitesHostname, "=", qb.VarCol(s.SitesHostname),
		),

		qb.MakeQuery(s.Schema, "ListSites", sqlitegen.QueryKindMany,
			"SELECT",
			qb.Results(
				qb.ResultCol(s.SitesAddresses),
				qb.ResultCol(s.SitesHostname),
				qb.ResultCol(s.SitesRole),
				qb.ResultCol(s.PublicKeysPrincipal),
			), '\n',
			"FROM", s.Sites, '\n',
			"JOIN", s.PublicKeys, "ON", s.PublicKeysID, "=", s.SitesAccountID,
		),

		qb.MakeQuery(s.Schema, "SetSiteRegistrationLink", sqlitegen.QueryKindExec,
			"INSERT INTO", s.GlobalMeta, qb.ListColShort(
				s.GlobalMetaKey,
				s.GlobalMetaValue,
			), '\n',
			"VALUES", qb.List(
				"'"+SiteRegistrationLinkKey+"'",
				qb.Var("link", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(s.Schema, "GetSiteRegistrationLink", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.GlobalMetaValue),
			),
			"FROM", s.GlobalMeta,
			"WHERE", s.GlobalMetaKey, "='"+SiteRegistrationLinkKey+"'",
		),

		qb.MakeQuery(s.Schema, "SetSiteTitle", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.GlobalMeta, qb.ListColShort(
				s.GlobalMetaKey,
				s.GlobalMetaValue,
			), '\n',
			"VALUES", qb.List(
				"'"+SiteTitleKey+"'",
				qb.Var("title", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(s.Schema, "GetSiteTitle", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.GlobalMetaValue),
			),
			"FROM", s.GlobalMeta,
			"WHERE", s.GlobalMetaKey, "='"+SiteTitleKey+"'",
		),

		qb.MakeQuery(s.Schema, "SetSiteDescription", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.GlobalMeta, qb.ListColShort(
				s.GlobalMetaKey,
				s.GlobalMetaValue,
			), '\n',
			"VALUES", qb.List(
				"'"+SiteDescriptionKey+"'",
				qb.Var("description", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(s.Schema, "GetSiteDescription", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.GlobalMetaValue),
			),
			"FROM", s.GlobalMeta,
			"WHERE", s.GlobalMetaKey, "='"+SiteDescriptionKey+"'",
		),

		qb.MakeQuery(s.Schema, "AddToken", sqlitegen.QueryKindExec,
			qb.Insert(s.InviteTokensToken, s.InviteTokensExpireTime,
				s.InviteTokensRole),
		),

		qb.MakeQuery(s.Schema, "GetToken", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.InviteTokensRole),
				qb.ResultCol(s.InviteTokensExpireTime),
			), '\n',
			"FROM", s.InviteTokens,
			"WHERE", s.InviteTokensToken, "=", qb.VarCol(s.InviteTokensToken),
		),

		qb.MakeQuery(s.Schema, "RemoveToken", sqlitegen.QueryKindExec,
			"DELETE FROM", s.InviteTokens,
			"WHERE", s.InviteTokensToken, "=", qb.VarCol(s.InviteTokensToken),
		),

		qb.MakeQuery(s.Schema, "RemoveExpiredTokens", sqlitegen.QueryKindExec,
			"DELETE FROM", s.InviteTokens,
			"WHERE", s.InviteTokensExpireTime, "<", qb.SQLFunc("strftime", "'%s'", "'now'"),
		),

		qb.MakeQuery(s.Schema, "InsertMember", sqlitegen.QueryKindSingle,
			"INSERT OR REPLACE INTO", s.SiteMembers, qb.ListColShort(
				s.SiteMembersAccountID,
				s.SiteMembersRole,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.SiteMembersAccountID),
				qb.VarCol(s.SiteMembersRole),
			), '\n',
			"RETURNING", qb.Results(s.SiteMembersRole),
		),

		qb.MakeQuery(s.Schema, "RemoveMember", sqlitegen.QueryKindExec,
			"DELETE FROM", s.SiteMembers,
			"WHERE", s.SiteMembersAccountID, "=", qb.SubQuery(
				"SELECT", s.PublicKeysID,
				"FROM", s.PublicKeys,
				"WHERE", s.PublicKeysPrincipal, "=", qb.VarCol(s.PublicKeysPrincipal),
			),
		),

		qb.MakeQuery(s.Schema, "GetMember", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.SiteMembersRole),
			), '\n',
			"FROM", s.SiteMembers, '\n',
			"WHERE", s.SiteMembersAccountID, "=", qb.SubQuery(
				"SELECT", s.PublicKeysID,
				"FROM", s.PublicKeys,
				"WHERE", s.PublicKeysPrincipal, "=", qb.VarCol(s.PublicKeysPrincipal),
			),
		),

		qb.MakeQuery(s.Schema, "ListMembers", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.SiteMembersRole),
				qb.ResultCol(s.PublicKeysPrincipal),
			), '\n',
			"FROM", s.SiteMembers, '\n',
			"JOIN", s.PublicKeys, "ON", s.PublicKeysID, "=", s.SiteMembersAccountID,
		),

		qb.MakeQuery(s.Schema, "InsertWebPublicationRecord", sqlitegen.QueryKindExec,
			"INSERT INTO", s.WebPublications, qb.ListColShort(
				s.WebPublicationsEID,
				s.WebPublicationsVersion,
				s.WebPublicationsPath,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.WebPublicationsEID),
				qb.VarCol(s.WebPublicationsVersion),
				qb.VarCol(s.WebPublicationsPath),
			),
		),

		qb.MakeQuery(s.Schema, "RemoveWebPublicationRecord", sqlitegen.QueryKindExec,
			"DELETE FROM", s.WebPublications,
			"WHERE", s.WebPublicationsEID, "=", qb.VarCol(s.HDEntitiesEID),
			"AND", s.WebPublicationsVersion, "=", qb.VarCol(s.WebPublicationsVersion),
		),

		qb.MakeQuery(s.Schema, "ListWebPublications", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.HDEntitiesID),
				qb.ResultCol(s.HDEntitiesEID),
				qb.ResultCol(s.WebPublicationsVersion),
				qb.ResultCol(s.WebPublicationsPath),
			), '\n',
			"FROM", s.WebPublications, '\n',
			"JOIN", s.HDEntities, "ON", s.WebPublicationsEID, "=", s.HDEntitiesEID,
		),

		qb.MakeQuery(s.Schema, "GetWebPublicationRecordByPath", sqlitegen.QueryKindSingle,
			"SELECT",
			qb.Results(
				qb.ResultCol(s.HDEntitiesID),
				qb.ResultCol(s.HDEntitiesEID),
				qb.ResultCol(s.WebPublicationsVersion),
				qb.ResultCol(s.WebPublicationsPath),
			), '\n',
			"FROM", s.WebPublications, '\n',
			"JOIN", s.HDEntities, "ON", s.WebPublicationsEID, "=", s.HDEntitiesEID,
			"WHERE", s.WebPublicationsPath, "=", qb.VarCol(s.WebPublicationsPath),
		),

		qb.MakeQuery(s.Schema, "GetWebPublicationsByID", sqlitegen.QueryKindMany,
			"SELECT",
			qb.Results(
				qb.ResultCol(s.HDEntitiesID),
				qb.ResultCol(s.HDEntitiesEID),
				qb.ResultCol(s.WebPublicationsVersion),
				qb.ResultCol(s.WebPublicationsPath),
			), '\n',
			"FROM", s.WebPublications, '\n',
			"JOIN", s.HDEntities, "ON", s.WebPublicationsEID, "=", s.HDEntitiesEID,
			"WHERE", s.HDEntitiesEID, "=", qb.VarCol(s.HDEntitiesEID),
		),
	)
	if err != nil {
		return err
	}
	if err := os.WriteFile("queries.gen.go", code, 0600); err != nil {
		return err
	}

	return nil
}
