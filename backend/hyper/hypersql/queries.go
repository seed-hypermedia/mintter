// Package hypersql provides SQL queries.
package hypersql

import (
	"io/ioutil"
	"mintter/backend/daemon/storage"
	s "mintter/backend/daemon/storage"
	sgen "mintter/backend/pkg/sqlitegen"
	"mintter/backend/pkg/sqlitegen/qb"
)

//go:generate gorun generateQueries
func generateQueries() error {
	code, err := sgen.CodegenQueries("hypersql",
		qb.MakeQuery(s.Schema, "BlobsHave", sgen.QueryKindSingle,
			"SELECT", qb.Results(qb.ResultExpr("1", "have", sgen.TypeInt)), '\n',
			"FROM", s.Blobs, '\n',
			"WHERE", s.BlobsMultihash, "=", qb.VarCol(s.BlobsMultihash), '\n',
			"AND", s.BlobsSize, ">=", "0",
		),
		qb.MakeQuery(s.Schema, "BlobsGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.BlobsID,
				s.BlobsMultihash,
				s.BlobsCodec,
				s.BlobsData,
				s.BlobsSize,
			), '\n',
			"FROM", s.Blobs, '\n',
			"WHERE", s.BlobsMultihash, "=", qb.VarCol(s.BlobsMultihash),
			"AND", s.BlobsSize, ">=", "0",
		),
		qb.MakeQuery(s.Schema, "BlobsGetSize", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.BlobsID,
				s.BlobsSize,
			), '\n',
			"FROM", s.Blobs, '\n',
			"WHERE", s.BlobsMultihash, "=", qb.VarCol(s.BlobsMultihash),
		),
		qb.MakeQuery(s.Schema, "BlobsUpdate", sgen.QueryKindExec,
			"UPDATE", s.Blobs, '\n',
			"SET", qb.ListColShort(
				s.BlobsData,
				s.BlobsSize,
			), "=", qb.List(qb.VarCol(s.BlobsData), qb.VarCol(s.BlobsSize)), '\n',
			"WHERE", s.BlobsID, "=", qb.VarCol(s.BlobsID),
		),
		qb.MakeQuery(s.Schema, "BlobsInsert", sgen.QueryKindSingle,
			"INSERT INTO", s.Blobs, qb.ListColShort(
				s.BlobsID,
				s.BlobsMultihash,
				s.BlobsCodec,
				s.BlobsData,
				s.BlobsSize,
			), '\n',
			"VALUES", qb.List(
				qb.Concat("NULLIF(", qb.VarCol(s.BlobsID), ", 0)"),
				qb.VarCol(s.BlobsMultihash),
				qb.VarCol(s.BlobsCodec),
				qb.VarCol(s.BlobsData),
				qb.VarCol(s.BlobsSize),
			), '\n',
			"RETURNING", qb.Results(s.BlobsID),
		),
		qb.MakeQuery(s.Schema, "BlobsDelete", sgen.QueryKindSingle,
			"DELETE FROM", s.Blobs, '\n',
			"WHERE", s.BlobsMultihash, "=", qb.VarCol(s.BlobsMultihash), '\n',
			"RETURNING", qb.Results(s.BlobsID),
		),
		qb.MakeQuery(s.Schema, "BlobsListKnown", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.BlobsID,
				s.BlobsMultihash,
				s.BlobsCodec,
			), '\n',
			"FROM", s.Blobs, '\n',
			"WHERE", s.BlobsSize, ">=", "0",
		),

		qb.MakeQuery(s.Schema, "PublicKeysLookupID", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.PublicKeysID,
			), '\n',
			"FROM", s.PublicKeys, '\n',
			"WHERE", s.PublicKeysPrincipal, "=", qb.VarCol(s.PublicKeysPrincipal), '\n',
			"LIMIT 1",
		),

		qb.MakeQuery(s.Schema, "PublicKeysLookupPrincipal", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.PublicKeysPrincipal,
			), '\n',
			"FROM", s.PublicKeys, '\n',
			"WHERE", s.PublicKeysID, "=", qb.VarCol(s.PublicKeysID), '\n',
			"LIMIT 1",
		),

		qb.MakeQuery(s.Schema, "PublicKeysInsert", sgen.QueryKindSingle,
			"INSERT INTO", s.PublicKeys, qb.ListColShort(
				s.PublicKeysPrincipal,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.PublicKeysPrincipal),
			), '\n',
			"RETURNING", qb.Results(s.PublicKeysID),
		),

		qb.MakeQuery(s.Schema, "SetAccountTrust", sgen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.TrustedAccounts, qb.ListColShort(
				s.TrustedAccountsID,
			), '\n',
			"VALUES", qb.List(
				qb.SubQuery(
					"SELECT", s.PublicKeysID,
					"FROM", s.PublicKeys,
					"WHERE", s.PublicKeysPrincipal, "=", qb.VarCol(s.PublicKeysPrincipal),
				),
			),
		),
		qb.MakeQuery(s.Schema, "UnsetAccountTrust", sgen.QueryKindExec,
			"DELETE FROM", s.TrustedAccounts, '\n',
			"WHERE", s.TrustedAccountsID, "IN", qb.SubQuery(
				"SELECT", s.PublicKeysID,
				"FROM", s.PublicKeys,
				"WHERE", s.PublicKeysPrincipal, "=", qb.VarCol(s.PublicKeysPrincipal),
			),
		),
		qb.MakeQuery(s.Schema, "IsTrustedAccount", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.TrustedAccountsID,
			), '\n',
			"FROM", s.TrustedAccounts, '\n',
			"WHERE", s.TrustedAccountsID, "IN", qb.SubQuery(
				"SELECT", s.PublicKeysID,
				"FROM", s.PublicKeys,
				"WHERE", s.PublicKeysPrincipal, "=", qb.Var("principal", sgen.TypeBytes),
			),
		),
		qb.MakeQuery(s.Schema, "KeyDelegationsInsertOrIgnore", sgen.QueryKindSingle,
			"INSERT OR IGNORE INTO", s.KeyDelegations, qb.ListColShort(
				s.KeyDelegationsBlob,
				s.KeyDelegationsIssuer,
				s.KeyDelegationsDelegate,
				s.KeyDelegationsIssueTime,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.KeyDelegationsBlob),
				qb.VarCol(s.KeyDelegationsIssuer),
				qb.VarCol(s.KeyDelegationsDelegate),
				qb.VarCol(s.KeyDelegationsIssueTime),
			), '\n',
			"RETURNING", qb.Results(s.KeyDelegationsBlob),
		),
		qb.MakeQuery(s.Schema, "KeyDelegationsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.KeyDelegationsViewBlob,
				s.KeyDelegationsViewBlobCodec,
				s.KeyDelegationsViewBlobMultihash,
				s.KeyDelegationsViewIssuer,
				s.KeyDelegationsViewDelegate,
				s.KeyDelegationsViewIssueTime,
			), '\n',
			"FROM", s.KeyDelegationsView, '\n',
			"WHERE", s.KeyDelegationsViewIssuer, "=", qb.VarCol(s.KeyDelegationsViewIssuer),
		),
		qb.MakeQuery(s.Schema, "KeyDelegationsListAll", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.KeyDelegationsViewBlob,
				s.KeyDelegationsViewBlobCodec,
				s.KeyDelegationsViewBlobMultihash,
				s.KeyDelegationsViewIssuer,
				s.KeyDelegationsViewDelegate,
				s.KeyDelegationsViewIssueTime,
			), '\n',
			"FROM", s.KeyDelegationsView,
		),
		qb.MakeQuery(s.Schema, "KeyDelegationsListByDelegate", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.KeyDelegationsViewBlob,
				s.KeyDelegationsViewBlobCodec,
				s.KeyDelegationsViewBlobMultihash,
				s.KeyDelegationsViewIssuer,
				s.KeyDelegationsViewDelegate,
				s.KeyDelegationsViewIssueTime,
			), '\n',
			"FROM", s.KeyDelegationsView, '\n',
			"WHERE", s.KeyDelegationsViewDelegate, "=", qb.VarCol(s.KeyDelegationsViewDelegate),
		),
		qb.MakeQuery(s.Schema, "KeyDelegationsGetIssuer", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.KeyDelegationsIssuer,
			), '\n',
			"FROM", s.KeyDelegations, '\n',
			"JOIN", s.Blobs, "ON", s.BlobsID, "=", s.KeyDelegationsBlob, '\n',
			"WHERE", s.BlobsMultihash, "=", qb.VarCol(s.BlobsMultihash), '\n',
			"LIMIT 1",
		),

		qb.MakeQuery(s.Schema, "EntitiesInsertOrIgnore", sgen.QueryKindSingle,
			"INSERT OR IGNORE INTO", s.HDEntities, qb.ListColShort(
				s.HDEntitiesEID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HDEntitiesEID),
			), '\n',
			"RETURNING", qb.Results(s.HDEntitiesID),
		),
		qb.MakeQuery(s.Schema, "EntitiesLookupID", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.HDEntitiesID,
			), '\n',
			"FROM", s.HDEntities, '\n',
			"WHERE", s.HDEntitiesEID, "=", qb.VarCol(s.HDEntitiesEID), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "EntitiesListByPrefix", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.HDEntitiesID,
				s.HDEntitiesEID,
			), '\n',
			"FROM", s.HDEntities, '\n',
			"WHERE", s.HDEntitiesEID, "GLOB", qb.Var("prefix", sgen.TypeText), '\n',
			"ORDER BY", s.HDEntitiesID,
		),
		qb.MakeQuery(s.Schema, "EntitiesDelete", sgen.QueryKindExec,
			"DELETE FROM", s.HDEntities, '\n',
			"WHERE", s.HDEntitiesEID, "=", qb.VarCol(s.HDEntitiesEID),
		),

		qb.MakeQuery(s.Schema, "ChangesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.HDChanges, qb.ListColShort(
				s.HDChangesBlob,
				s.HDChangesEntity,
				s.HDChangesHlcTime,
				s.HDChangesAuthor,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HDChangesBlob),
				qb.VarCol(s.HDChangesEntity),
				qb.VarCol(s.HDChangesHlcTime),
				qb.VarCol(s.HDChangesAuthor),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesListFromChangeSet", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.HDChangesViewBlobID,
				s.HDChangesViewCodec,
				s.HDChangesViewData,
				s.HDChangesViewEntityID,
				s.HDChangesViewHlcTime,
				s.HDChangesViewMultihash,
				s.HDChangesViewSize,
			), '\n',
			"FROM", qb.Concat(s.HDChangesView, ", ", "json_each(", qb.Var("cset", sgen.TypeBytes), ") AS cset"), '\n',
			"WHERE", s.HDChangesViewEntity, "=", qb.VarCol(s.HDChangesViewEntity), '\n',
			"AND", s.HDChangesViewBlobID, "= cset.value", '\n',
			"ORDER BY", s.HDChangesViewHlcTime,
		),
		qb.MakeQuery(s.Schema, "ChangesListForEntity", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.HDChangesViewBlobID,
				s.HDChangesViewCodec,
				s.HDChangesViewData,
				s.HDChangesViewEntityID,
				s.HDChangesViewHlcTime,
				s.HDChangesViewMultihash,
				s.HDChangesViewSize,
			), '\n',
			"FROM", s.HDChangesView, '\n',
			"WHERE", s.HDChangesViewEntity, "=", qb.VarCol(s.HDChangesViewEntity), '\n',
			"ORDER BY", s.HDChangesViewHlcTime,
		),
		qb.MakeQuery(s.Schema, "ChangesListPublicNoData", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.HDChangesViewBlobID,
				s.HDChangesViewCodec,
				s.HDChangesViewEntityID,
				s.HDChangesViewHlcTime,
				s.HDChangesViewMultihash,
				s.HDChangesViewSize,
				s.HDChangesViewEntity,
				s.HDDraftsBlob,
			), '\n',
			"FROM", s.HDChangesView, '\n',
			"LEFT JOIN", s.HDDrafts, "ON", s.HDDraftsEntity, "=", s.HDChangesViewEntityID, '\n',
			"WHERE", s.HDDraftsBlob, "IS NULL", '\n',
			"ORDER BY", qb.Enumeration(s.HDChangesViewEntity, s.HDChangesViewHlcTime),
		),
		qb.MakeQuery(s.Schema, "ChangesResolveHeads", sgen.QueryKindSingle,
			"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
				"SELECT value",
				"FROM", qb.Concat("json_each(", qb.Var("heads", sgen.TypeBytes), ")"),
				"UNION",
				"SELECT", storage.HDChangeDepsParent,
				"FROM", storage.HDChangeDeps,
				"JOIN changeset ON changeset.change", "=", storage.HDChangeDepsChild,
			), '\n',
			"SELECT", qb.Results(
				qb.ResultRaw("json_group_array(change) AS resolved_json", "resolved_json", sgen.TypeBytes),
			), '\n',
			"FROM changeset", '\n',
			"LIMIT 1",
		),
		sgen.QueryTemplate{
			Name: "ChangesGetPublicHeadsJSON",
			Kind: sgen.QueryKindSingle,
			Inputs: []sgen.GoSymbol{
				{Name: "entity", Type: sgen.TypeInt},
			},
			Outputs: []sgen.GoSymbol{
				{Name: "Heads", Type: sgen.TypeBytes},
			},
			SQL: `WITH
non_drafts (blob) AS (
	SELECT ` + s.C_HDChangesBlob + `
	FROM ` + s.T_HDChanges + `
	LEFT JOIN ` + s.T_HDDrafts + ` ON ` + s.C_HDDraftsEntity + ` = ` + s.C_HDChangesEntity + ` AND ` + s.C_HDChangesBlob + ` = ` + s.C_HDDraftsBlob + `
	WHERE ` + s.C_HDChangesEntity + ` = :entity
	AND ` + s.C_HDDraftsBlob + ` IS NULL
),
deps (blob) AS (
	SELECT DISTINCT ` + s.C_HDChangeDepsParent + `
	FROM ` + s.T_HDChangeDeps + `
	JOIN non_drafts ON non_drafts.blob = ` + s.C_HDChangeDepsChild + `
)
SELECT json_group_array(blob) AS heads
FROM non_drafts
WHERE blob NOT IN deps`,
		},
		qb.MakeQuery(s.Schema, "ChangesDeleteForEntity", sgen.QueryKindExec,
			"DELETE FROM", s.Blobs, '\n',
			"WHERE", s.BlobsID, "IN", qb.SubQuery(
				"SELECT", s.HDChangesBlob,
				"FROM", s.HDChanges,
				"WHERE", s.HDChangesEntity, "=", qb.VarCol(s.HDChangesEntity),
			),
		),

		qb.MakeQuery(s.Schema, "LinksInsert", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.HDLinks, qb.ListColShort(
				s.HDLinksSourceBlob,
				s.HDLinksRel,
				s.HDLinksTargetBlob,
				s.HDLinksTargetEntity,
				s.HDLinksData,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HDLinksSourceBlob),
				qb.VarCol(s.HDLinksRel),
				qb.Concat("NULLIF(", qb.VarCol(s.HDLinksTargetBlob), ", 0)"),
				qb.Concat("NULLIF(", qb.VarCol(s.HDLinksTargetEntity), ", 0)"),
				qb.VarCol(s.HDLinksData),
			),
		),
		qb.MakeQuery(s.Schema, "BacklinksForEntity", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ContentLinksViewData,
				s.ContentLinksViewRel,
				s.ContentLinksViewSourceBlob,
				s.ContentLinksViewSourceBlobCodec,
				s.ContentLinksViewSourceBlobMultihash,
				s.ContentLinksViewSourceEID,
				s.ContentLinksViewSourceEntity,
				s.ContentLinksViewTargetEID,
				s.ContentLinksViewTargetEntity,
			), '\n',
			"FROM", s.ContentLinksView, '\n',
			"WHERE", s.ContentLinksViewTargetEID, "=", qb.VarCol(s.ContentLinksViewTargetEID),
		),

		qb.MakeQuery(s.Schema, "DraftsInsert", sgen.QueryKindExec,
			"INSERT INTO", s.HDDrafts, qb.ListColShort(
				s.HDDraftsEntity,
				s.HDDraftsBlob,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HDDraftsEntity),
				qb.VarCol(s.HDDraftsBlob),
			),
		),
		qb.MakeQuery(s.Schema, "DraftsGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.HDDraftsViewBlobID,
				s.HDDraftsViewCodec,
				s.HDDraftsViewEntity,
				s.HDDraftsViewEntityID,
				s.HDDraftsViewMultihash,
			), '\n',
			"FROM", s.HDDraftsView, '\n',
			"WHERE", s.HDDraftsViewEntity, "=", qb.VarCol(s.HDDraftsViewEntity),
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "DraftsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.HDDrafts, '\n',
			"WHERE", s.HDDraftsBlob, "=", qb.VarCol(s.HDDraftsBlob),
		),

		qb.MakeQuery(s.Schema, "SetReindexTime", sgen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.GlobalMeta, qb.ListColShort(
				s.GlobalMetaKey,
				s.GlobalMetaValue,
			), '\n',
			"VALUES", qb.List(
				"'last_reindex_time'",
				qb.VarCol(s.GlobalMetaValue),
			), '\n',
		),
		qb.MakeQuery(s.Schema, "GetReindexTime", sgen.QueryKindSingle,
			"SELECT", qb.Results(s.GlobalMetaValue), '\n',
			"FROM", s.GlobalMeta, '\n',
			"WHERE", s.GlobalMetaKey, "= 'last_reindex_time'", '\n',
			"LIMIT 1",
		),
	)

	if err != nil {
		return err
	}

	return ioutil.WriteFile("queries.gen.go", code, 0600)
}

var _ = generateQueries
