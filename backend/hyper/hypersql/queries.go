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

		qb.MakeQuery(s.Schema, "BlobLinksInsertOrIgnore", sgen.QueryKindExec,
			qb.InsertOrIgnore(s.BlobLinksSource, s.BlobLinksRel, s.BlobLinksTarget),
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
			"INSERT INTO", s.Lookup, qb.ListColShort(
				s.LookupType,
				s.LookupValue,
			), '\n',
			"VALUES", qb.List(
				storage.LookupPublicKey,
				qb.Var("principal", sgen.TypeBytes),
			), '\n',
			"RETURNING", qb.Results(qb.ResultColAlias(s.LookupID, "public_keys_id")),
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
		qb.MakeQuery(s.Schema, "KeyDelegationsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.KeyDelegationsViewBlob,
				s.KeyDelegationsViewBlobCodec,
				s.KeyDelegationsViewBlobMultihash,
				s.KeyDelegationsViewIssuer,
				s.KeyDelegationsViewDelegate,
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
			"INSERT OR IGNORE INTO", s.Lookup, qb.ListColShort(
				s.LookupType,
				s.LookupValue,
			), '\n',
			"VALUES", qb.List(
				storage.LookupResource,
				qb.Var("entity_id", sgen.TypeText),
			), '\n',
			"RETURNING", qb.Results(qb.ResultColAlias(s.LookupID, "entities_id")),
		),
		qb.MakeQuery(s.Schema, "EntitiesLookupID", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.EntitiesID,
			), '\n',
			"FROM", s.Entities, '\n',
			"WHERE", s.EntitiesEID, "=", qb.Var("entities_eid", sgen.TypeText), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "EntitiesListByPrefix", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.EntitiesID,
				s.EntitiesEID,
			), '\n',
			"FROM", s.Entities, '\n',
			"WHERE", s.EntitiesEID, "GLOB", qb.Var("prefix", sgen.TypeText), '\n',
			"ORDER BY", s.EntitiesID,
		),
		qb.MakeQuery(s.Schema, "EntitiesDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Lookup, '\n',
			"WHERE", s.LookupType, "=", storage.LookupResource, '\n',
			"AND", s.LookupValue, "=", qb.Var("entities_eid", sgen.TypeText),
		),

		qb.MakeQuery(s.Schema, "ChangesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Changes, qb.ListColShort(
				s.ChangesBlob,
				s.ChangesEntity,
				s.ChangesHLCTime,
				s.ChangesAuthor,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ChangesBlob),
				qb.VarCol(s.ChangesEntity),
				qb.VarCol(s.ChangesHLCTime),
				qb.VarCol(s.ChangesAuthor),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesListFromChangeSet", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ChangesViewBlobID,
				s.ChangesViewCodec,
				s.ChangesViewData,
				s.ChangesViewEntityID,
				s.ChangesViewHLCTime,
				s.ChangesViewMultihash,
				s.ChangesViewSize,
			), '\n',
			"FROM", qb.Concat(s.ChangesView, ", ", "json_each(", qb.Var("cset", sgen.TypeBytes), ") AS cset"), '\n',
			"WHERE", s.ChangesViewEntity, "=", qb.VarColType(s.ChangesViewEntity, sgen.TypeText), '\n',
			"AND", s.ChangesViewBlobID, "= cset.value", '\n',
			"ORDER BY", s.ChangesViewHLCTime,
		),
		qb.MakeQuery(s.Schema, "ChangesListForEntity", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ChangesViewBlobID,
				s.ChangesViewCodec,
				s.ChangesViewData,
				s.ChangesViewEntityID,
				s.ChangesViewHLCTime,
				s.ChangesViewMultihash,
				s.ChangesViewSize,
			), '\n',
			"FROM", s.ChangesView, '\n',
			"WHERE", s.ChangesViewEntity, "=", qb.VarColType(s.ChangesViewEntity, sgen.TypeText), '\n',
			"ORDER BY", s.ChangesViewHLCTime,
		),
		qb.MakeQuery(s.Schema, "ChangesListPublicNoData", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ChangesViewBlobID,
				s.ChangesViewCodec,
				s.ChangesViewEntityID,
				s.ChangesViewHLCTime,
				s.ChangesViewMultihash,
				s.ChangesViewSize,
				s.ChangesViewEntity,
				s.DraftsBlob,
			), '\n',
			"FROM", s.ChangesView, '\n',
			"LEFT JOIN", s.Drafts, "ON", s.DraftsEntity, "=", s.ChangesViewEntityID, '\n',
			"WHERE", s.DraftsBlob, "IS NULL", '\n',
			"ORDER BY", qb.Enumeration(s.ChangesViewEntity, s.ChangesViewHLCTime),
		),
		qb.MakeQuery(s.Schema, "ChangesResolveHeads", sgen.QueryKindSingle,
			"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
				"SELECT value",
				"FROM", qb.Concat("json_each(", qb.Var("heads", sgen.TypeBytes), ")"),
				"UNION",
				"SELECT", storage.ChangeDepsParent,
				"FROM", storage.ChangeDeps,
				"JOIN changeset ON changeset.change", "=", storage.ChangeDepsChild,
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
	SELECT ` + s.C_ChangesBlob + `
	FROM ` + s.T_Changes + `
	LEFT JOIN ` + s.T_Drafts + ` ON ` + s.C_DraftsEntity + ` = ` + s.C_ChangesEntity + ` AND ` + s.C_ChangesBlob + ` = ` + s.C_DraftsBlob + `
	WHERE ` + s.C_ChangesEntity + ` = :entity
	AND ` + s.C_DraftsBlob + ` IS NULL
),
deps (blob) AS (
	SELECT DISTINCT ` + s.C_ChangeDepsParent + `
	FROM ` + s.T_ChangeDeps + `
	JOIN non_drafts ON non_drafts.blob = ` + s.C_ChangeDepsChild + `
)
SELECT json_group_array(blob) AS heads
FROM non_drafts
WHERE blob NOT IN deps`,
		},
		sgen.QueryTemplate{
			Name: "ChangesGetTrustedHeadsJSON",
			Kind: sgen.QueryKindSingle,
			Inputs: []sgen.GoSymbol{
				{Name: "entity", Type: sgen.TypeInt},
			},
			Outputs: []sgen.GoSymbol{
				{Name: "Heads", Type: sgen.TypeBytes},
			},
			SQL: `SELECT json_group_array(` + s.C_ChangesBlob + `) AS heads
FROM ` + s.T_Changes + `
LEFT JOIN ` + s.T_Drafts + ` ON ` + s.C_DraftsEntity + ` = ` + s.C_ChangesEntity + ` AND ` + s.C_ChangesBlob + ` = ` + s.C_DraftsBlob + `
JOIN ` + s.T_TrustedAccounts + ` ON ` + s.C_TrustedAccountsID + ` = ` + s.C_ChangesAuthor + `
WHERE ` + s.C_ChangesEntity + ` = :entity
AND ` + s.C_DraftsBlob + ` IS NULL`,
		},
		qb.MakeQuery(s.Schema, "ChangesDeleteForEntity", sgen.QueryKindExec,
			"DELETE FROM", s.Blobs, '\n',
			"WHERE", s.BlobsID, "IN", qb.SubQuery(
				"SELECT", s.ChangesBlob,
				"FROM", s.Changes,
				"WHERE", s.ChangesEntity, "=", qb.VarCol(s.ChangesEntity),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesGetInfo", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.ChangesBlob,
				s.ChangesHLCTime,
				s.PublicKeysPrincipal,
				qb.ResultExpr(s.C_TrustedAccountsID+" > 0", "is_trusted", sgen.TypeInt),
			), '\n',
			"FROM", s.Changes, '\n',
			"JOIN", s.PublicKeys, "ON", s.PublicKeysID, "=", s.ChangesAuthor, '\n',
			"LEFT JOIN", s.TrustedAccounts, "ON", s.TrustedAccountsID, "=", s.ChangesAuthor, '\n',
			"WHERE", s.ChangesBlob, "=", qb.VarCol(s.ChangesBlob), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "ChangesGetDeps", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.BlobsCodec,
				s.BlobsMultihash,
			), '\n',
			"FROM", s.ChangeDeps, '\n',
			"JOIN", s.Blobs, "ON", s.BlobsID, "=", s.ChangeDepsParent, '\n',
			"WHERE", s.ChangeDepsChild, "=", qb.VarCol(s.ChangeDepsChild),
		),
		qb.MakeQuery(s.Schema, "ChangesInfoForEntity", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.BlobsCodec,
				s.BlobsMultihash,
				s.ChangesBlob,
				s.ChangesHLCTime,
				s.PublicKeysPrincipal,
				qb.ResultExpr(s.C_TrustedAccountsID+" > 0", "is_trusted", sgen.TypeInt),
			), '\n',
			"FROM", s.Changes, '\n',
			"JOIN", s.Blobs, "ON", s.BlobsID, "=", s.ChangesBlob, '\n',
			"JOIN", s.PublicKeys, "ON", s.PublicKeysID, "=", s.ChangesAuthor, '\n',
			"LEFT JOIN", s.TrustedAccounts, "ON", s.TrustedAccountsID, "=", s.ChangesAuthor, '\n',
			"WHERE", s.ChangesEntity, "=", qb.VarCol(s.ChangesEntity),
		),

		qb.MakeQuery(s.Schema, "BacklinksForEntity", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.EntitiesID,
				s.EntitiesEID,
				s.BlobsCodec,
				s.BlobsMultihash,
				s.BlobAttrsBlob,
				s.BlobAttrsKey,
				s.BlobAttrsAnchor,
				s.BlobAttrsExtra,
			), '\n',
			"FROM", s.BlobAttrs, '\n',
			"JOIN", s.Changes, "ON", s.ChangesBlob, "=", s.BlobAttrsBlob, '\n',
			"JOIN", s.Entities, "ON", s.EntitiesID, "=", s.ChangesEntity, '\n',
			"JOIN", s.Blobs, "ON", s.BlobsID, "=", s.BlobAttrsBlob, '\n',
			"WHERE", s.BlobAttrsKey, "GLOB 'href/*'", '\n',
			"AND", s.BlobAttrsValuePtr, "IS NOT NULL", '\n',
			"AND", s.BlobAttrsValuePtr, "=", qb.VarCol(s.BlobAttrsValuePtr),
		),

		qb.MakeQuery(s.Schema, "DraftsInsert", sgen.QueryKindExec,
			"INSERT INTO", s.Drafts, qb.ListColShort(
				s.DraftsEntity,
				s.DraftsBlob,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.DraftsEntity),
				qb.VarCol(s.DraftsBlob),
			),
		),
		qb.MakeQuery(s.Schema, "DraftsGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.DraftsViewBlobID,
				s.DraftsViewCodec,
				s.DraftsViewEntity,
				s.DraftsViewEntityID,
				s.DraftsViewMultihash,
			), '\n',
			"FROM", s.DraftsView, '\n',
			"WHERE", s.DraftsViewEntity, "=", qb.VarColType(s.DraftsViewEntity, sgen.TypeText), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "DraftsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Drafts, '\n',
			"WHERE", s.DraftsBlob, "=", qb.VarCol(s.DraftsBlob),
		),

		qb.MakeQuery(s.Schema, "SetReindexTime", sgen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.KV, qb.ListColShort(
				s.KVKey,
				s.KVValue,
			), '\n',
			"VALUES", qb.List(
				"'last_reindex_time'",
				qb.VarCol(s.KVValue),
			), '\n',
		),
		qb.MakeQuery(s.Schema, "GetReindexTime", sgen.QueryKindSingle,
			"SELECT", qb.Results(s.KVValue), '\n',
			"FROM", s.KV, '\n',
			"WHERE", s.KVKey, "= 'last_reindex_time'", '\n',
			"LIMIT 1",
		),
	)

	if err != nil {
		return err
	}

	return ioutil.WriteFile("queries.gen.go", code, 0600)
}

var _ = generateQueries
