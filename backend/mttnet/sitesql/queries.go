// Package sitesql implements all the database related functions.
package sitesql

import (
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
	"os"
)

var _ = generateQueries

const (
	// SiteTitleKey is the column name of the meta table where the site title (in case this node is a site) is stored.
	SiteTitleKey = "site_title"
	// SiteDescriptionKey is the column name of the meta table where the site description (in case this node is a site) is stored.
	SiteDescriptionKey = "site_description"
)

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("sitesql",

		qb.MakeQuery(sqliteschema.Schema, "addSite", sqlitegen.QueryKindExec,
			qb.Insert(sqliteschema.SitesAccountID, sqliteschema.SitesAddresses, sqliteschema.SitesHostname,
				sqliteschema.SitesRole),
		),

		qb.MakeQuery(sqliteschema.Schema, "removeSite", sqlitegen.QueryKindExec,
			"DELETE FROM", sqliteschema.Sites,
			"WHERE", sqliteschema.SitesHostname, "=", qb.VarCol(sqliteschema.SitesHostname),
		),

		qb.MakeQuery(sqliteschema.Schema, "getSite", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.SitesAccountID),
				qb.ResultCol(sqliteschema.SitesAddresses),
				qb.ResultCol(sqliteschema.SitesHostname),
				qb.ResultCol(sqliteschema.SitesRole),
			), qb.Line,
			"FROM", sqliteschema.Sites,
			"WHERE", sqliteschema.SitesHostname, "=", qb.VarCol(sqliteschema.SitesHostname),
		),

		qb.MakeQuery(sqliteschema.Schema, "listSites", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.SitesAccountID),
				qb.ResultCol(sqliteschema.SitesAddresses),
				qb.ResultCol(sqliteschema.SitesHostname),
				qb.ResultCol(sqliteschema.SitesRole),
			), qb.Line,
			"FROM", sqliteschema.Sites,
		),

		qb.MakeQuery(sqliteschema.Schema, "setSiteTitle", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", sqliteschema.GlobalMeta, qb.ListColShort(
				sqliteschema.GlobalMetaKey,
				sqliteschema.GlobalMetaValue,
			), qb.Line,
			"VALUES", qb.List(
				SiteTitleKey,
				qb.Var("title", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(sqliteschema.Schema, "getSiteTitle", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.GlobalMetaValue),
			),
			"FROM", sqliteschema.GlobalMeta,
			"WHERE", sqliteschema.GlobalMetaKey, "=", SiteTitleKey,
		),

		qb.MakeQuery(sqliteschema.Schema, "setSiteDescription", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", sqliteschema.GlobalMeta, qb.ListColShort(
				sqliteschema.GlobalMetaKey,
				sqliteschema.GlobalMetaValue,
			), qb.Line,
			"VALUES", qb.List(
				SiteDescriptionKey,
				qb.Var("description", sqlitegen.TypeText),
			),
		),

		qb.MakeQuery(sqliteschema.Schema, "getSiteDescription", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.GlobalMetaValue),
			),
			"FROM", sqliteschema.GlobalMeta,
			"WHERE", sqliteschema.GlobalMetaKey, "=", SiteDescriptionKey,
		),

		qb.MakeQuery(sqliteschema.Schema, "addToken", sqlitegen.QueryKindExec,
			qb.Insert(sqliteschema.InviteTokensToken, sqliteschema.InviteTokensExpirationTime,
				sqliteschema.InviteTokensRole),
		),

		qb.MakeQuery(sqliteschema.Schema, "getToken", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.InviteTokensRole),
				qb.ResultCol(sqliteschema.InviteTokensExpirationTime),
			), qb.Line,
			"FROM", sqliteschema.InviteTokens,
			"WHERE", sqliteschema.InviteTokensToken, "=", qb.VarCol(sqliteschema.InviteTokensToken),
		),

		qb.MakeQuery(sqliteschema.Schema, "listTokens", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.InviteTokensRole),
				qb.ResultCol(sqliteschema.InviteTokensExpirationTime),
				qb.ResultCol(sqliteschema.InviteTokensToken),
			), qb.Line,
			"FROM", sqliteschema.InviteTokens,
		),

		qb.MakeQuery(sqliteschema.Schema, "removeToken", sqlitegen.QueryKindExec,
			"DELETE FROM", sqliteschema.InviteTokens,
			"WHERE", sqliteschema.InviteTokensToken, "=", qb.VarCol(sqliteschema.InviteTokensToken),
		),

		qb.MakeQuery(sqliteschema.Schema, "removeExpiredTokens", sqlitegen.QueryKindExec,
			"DELETE FROM", sqliteschema.InviteTokens,
			"WHERE", sqliteschema.InviteTokensExpirationTime, "<", qb.SQLFunc("strftime", "'%s'", "'now'"),
		),

		qb.MakeQuery(sqliteschema.Schema, "addMember", sqlitegen.QueryKindSingle,
			"INSERT OR REPLACE INTO", sqliteschema.SiteMembers, qb.ListColShort(
				sqliteschema.SiteMembersAccountID,
				sqliteschema.SiteMembersRole,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(sqliteschema.SiteMembersAccountID),
				qb.VarCol(sqliteschema.SiteMembersRole),
			), qb.Line,
			"RETURNING", qb.Results(sqliteschema.SiteMembersRole),
		),

		qb.MakeQuery(sqliteschema.Schema, "removeMember", sqlitegen.QueryKindExec,
			"DELETE FROM", sqliteschema.SiteMembers,
			"WHERE", sqliteschema.SiteMembersAccountID, "=", qb.VarCol(sqliteschema.SiteMembersAccountID),
		),

		qb.MakeQuery(sqliteschema.Schema, "getMember", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.SiteMembersAccountID),
				qb.ResultCol(sqliteschema.SiteMembersRole),
			), qb.Line,
			"FROM", sqliteschema.SiteMembers,
			"WHERE", sqliteschema.SiteMembersAccountID, "=", qb.VarCol(sqliteschema.SiteMembersAccountID),
		),

		qb.MakeQuery(sqliteschema.Schema, "listMembers", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.SiteMembersAccountID),
				qb.ResultCol(sqliteschema.SiteMembersRole),
			), qb.Line,
			"FROM", sqliteschema.SiteMembers,
		),

		qb.MakeQuery(sqliteschema.Schema, "addWebPublicationRecord", sqlitegen.QueryKindExec,
			qb.Insert(sqliteschema.WebPublicationRecordsDocumentID,
				sqliteschema.WebPublicationRecordsDocumentVersion, sqliteschema.WebPublicationRecordsPath),
		),

		qb.MakeQuery(sqliteschema.Schema, "removeWebPublicationRecord", sqlitegen.QueryKindExec,
			"DELETE FROM", sqliteschema.WebPublicationRecords,
			"WHERE", sqliteschema.WebPublicationRecordsID, "=", qb.VarCol(sqliteschema.WebPublicationRecordsID),
		),

		qb.MakeQuery(sqliteschema.Schema, "listWebPublicationRecords", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WebPublicationRecordsID),
				qb.ResultCol(sqliteschema.WebPublicationRecordsDocumentID),
				qb.ResultCol(sqliteschema.WebPublicationRecordsDocumentVersion),
				qb.ResultCol(sqliteschema.WebPublicationRecordsPath),
			), qb.Line,
			"FROM", sqliteschema.WebPublicationRecords,
		),

		qb.MakeQuery(sqliteschema.Schema, "getWebPublicationRecord", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WebPublicationRecordsDocumentID),
				qb.ResultCol(sqliteschema.WebPublicationRecordsDocumentVersion),
				qb.ResultCol(sqliteschema.WebPublicationRecordsPath),
			), qb.Line,
			"FROM", sqliteschema.WebPublicationRecords,
			"WHERE", sqliteschema.WebPublicationRecordsID, "=", qb.VarCol(sqliteschema.WebPublicationRecordsID),
		),

		qb.MakeQuery(sqliteschema.Schema, "getWebPublicationReferences", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.ContentLinksTargetDocumentID),
				qb.ResultCol(sqliteschema.ContentLinksTargetVersion),
			), qb.Line,
			"FROM", sqliteschema.WebPublicationRecords,
			"WHERE", sqliteschema.ContentLinksSourceDocumentID, "=", qb.VarCol(sqliteschema.WebPublicationRecordsDocumentID),
		),

		qb.MakeQuery(sqliteschema.Schema, "getWebPublicationReferencesWithVersion", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.ContentLinksTargetDocumentID),
				qb.ResultCol(sqliteschema.ContentLinksTargetVersion),
			), qb.Line,
			"FROM", sqliteschema.WebPublicationRecords,
			"WHERE", sqliteschema.ContentLinksSourceDocumentID, "=", qb.VarCol(sqliteschema.WebPublicationRecordsDocumentID),
			"AND", sqliteschema.ContentLinksSourceVersion, "=", qb.VarCol(sqliteschema.WebPublicationRecordsDocumentVersion),
		),

		// count how many references we actually have on any given published doc id.
		qb.MakeQuery(sqliteschema.Schema, "countWebPublicationExistingReferences", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultExpr(qb.SQLFunc("COUNT", "DISTINCT "+sqliteschema.ContentLinksTargetVersion.ShortName()), "count", sqlitegen.TypeInt),
				qb.ResultCol(sqliteschema.ContentLinksSourceDocumentID),
			), qb.Line,
			"FROM", sqliteschema.ContentLinks,
			"WHERE", sqliteschema.ContentLinksSourceDocumentID, "=", qb.VarCol(sqliteschema.WebPublicationRecordsDocumentID),
		),

		// count how many references we actually have on any given published doc id and version.
		qb.MakeQuery(sqliteschema.Schema, "countWebPublicationExistingReferencesWithVersion", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultExpr(qb.SQLFunc("COUNT", "DISTINCT "+sqliteschema.ContentLinksTargetVersion.ShortName()), "count", sqlitegen.TypeInt),
				qb.ResultCol(sqliteschema.ContentLinksSourceDocumentID),
			), qb.Line,
			"FROM", sqliteschema.ContentLinks,
			"WHERE", sqliteschema.ContentLinksSourceDocumentID, "=", qb.VarCol(sqliteschema.WebPublicationRecordsDocumentID),
			"AND", sqliteschema.ContentLinksSourceVersion, "=", qb.VarCol(sqliteschema.WebPublicationRecordsDocumentVersion),
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
