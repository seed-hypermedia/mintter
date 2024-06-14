// Package hypersql provides SQL queries.
package hypersql

import (
	"io/ioutil"
	"seed/backend/daemon/storage"
	s "seed/backend/daemon/storage"
	sgen "seed/backend/pkg/sqlitegen"
	"seed/backend/pkg/sqlitegen/qb"
)

//go:generate gorun generateQueries
func generateQueries() error {
	code, err := sgen.CodegenQueries("hypersql",
		qb.MakeQuery(s.Schema, "BlobsHave", sgen.QueryKindSingle,
			"SELECT", qb.Results(qb.ResultExpr("1", "have", sgen.TypeInt)), '\n',
			"FROM", s.Blobs, "INDEXED BY blobs_metadata_by_hash", '\n',
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
			"FROM", s.Blobs, "INDEXED BY blobs_metadata_by_hash", '\n',
			"WHERE", s.BlobsMultihash, "=", qb.VarCol(s.BlobsMultihash),
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
		qb.MakeQuery(s.Schema, "BlobsEmptyByHash", sgen.QueryKindExec,
			"UPDATE", s.Blobs, '\n',
			"SET", s.BlobsData.ShortName(), "='NULL',", s.BlobsSize.ShortName(), "=-1", '\n',
			"WHERE", s.BlobsMultihash, "=", qb.VarCol(s.BlobsMultihash),
		),
		qb.MakeQuery(s.Schema, "BlobsEmptyByEID", sgen.QueryKindExec,
			"UPDATE", s.Blobs, '\n',
			"SET", s.BlobsData.ShortName(), "= 'NULL',", s.BlobsSize.ShortName(), "=-1", '\n',
			"WHERE", s.BlobsID, "IN", qb.SubQuery(
				"SELECT", s.StructuralBlobsViewBlobID,
				"FROM", s.StructuralBlobsView,
				"WHERE", s.StructuralBlobsViewResource, "=", qb.Var("eid", sgen.TypeText),
			),
		),

		qb.MakeQuery(s.Schema, "BlobsStructuralDelete", sgen.QueryKindExec,
			"DELETE FROM", s.StructuralBlobs, '\n',
			"WHERE", s.StructuralBlobsID, "IN", qb.SubQuery(
				"SELECT", s.StructuralBlobsViewBlobID,
				"FROM", s.StructuralBlobsView,
				"WHERE", s.StructuralBlobsViewResource, "=", qb.Var("eid", sgen.TypeText),
			),
		),
		qb.MakeQuery(s.Schema, "BlobsListKnown", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.BlobsID,
				s.BlobsMultihash,
				s.BlobsCodec,
			), '\n',
			"FROM", s.Blobs, "INDEXED BY blobs_metadata", '\n',
			"LEFT JOIN", s.Drafts, "ON", s.DraftsBlob, "=", s.BlobsID, '\n',
			"WHERE", s.BlobsSize, ">=", "0", '\n',
			"AND", s.DraftsBlob, "IS NULL", '\n',
			"ORDER BY", s.BlobsID,
		),

		qb.MakeQuery(s.Schema, "BlobLinksInsertOrIgnore", sgen.QueryKindExec,
			qb.InsertOrIgnore(s.BlobLinksSource, s.BlobLinksType, s.BlobLinksTarget),
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
				qb.Var("principal", sgen.TypeBytes),
			), '\n',
			"RETURNING", qb.Results(qb.ResultColAlias(s.PublicKeysID, "public_keys_id")),
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
			"JOIN", s.Blobs, "INDEXED BY blobs_metadata_by_hash ON", s.BlobsID, "=", s.KeyDelegationsID, '\n',
			"WHERE", s.BlobsMultihash, "=", qb.VarCol(s.BlobsMultihash), '\n',
			"LIMIT 1",
		),

		qb.MakeQuery(s.Schema, "EntitiesInsertOrIgnore", sgen.QueryKindSingle,
			"INSERT OR IGNORE INTO", s.Resources, qb.ListColShort(
				s.ResourcesIRI,
			), '\n',
			"VALUES", qb.List(
				qb.Var("entity_id", sgen.TypeText),
			), '\n',
			"RETURNING", qb.Results(qb.ResultColAlias(s.ResourcesID, "entities_id")),
		),
		qb.MakeQuery(s.Schema, "EntitiesLookupID", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.ResourcesID,
				s.ResourcesOwner,
			), '\n',
			"FROM", s.Resources, '\n',
			"WHERE", s.ResourcesIRI, "=", qb.Var("entities_eid", sgen.TypeText), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "EntitiesListByPrefix", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ResourcesID,
				s.ResourcesIRI,
				s.ResourcesOwner,
			), '\n',
			"FROM", s.Resources, '\n',
			"WHERE", s.ResourcesIRI, "GLOB", qb.Var("prefix", sgen.TypeText), '\n',
			"ORDER BY", s.ResourcesID,
		),
		qb.MakeQuery(s.Schema, "EntitiesDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Resources, '\n',
			"WHERE", s.ResourcesIRI, "=", qb.Var("entities_eid", sgen.TypeText),
		),
		qb.MakeQuery(s.Schema, "EntitiesInsertRemovedRecord", sgen.QueryKindSingle,
			"INSERT OR IGNORE INTO", s.DeletedResources, qb.ListColShort(
				s.DeletedResourcesIRI,
				s.DeletedResourcesReason,
				s.DeletedResourcesMeta,
			), '\n',
			"VALUES", qb.List(
				qb.Var("iri", sgen.TypeText),
				qb.Var("reason", sgen.TypeText),
				qb.Var("meta", sgen.TypeText),
			), '\n',
			"RETURNING", qb.Results(qb.ResultColAlias(s.DeletedResourcesIRI, "resource_eid")),
		),
		qb.MakeQuery(s.Schema, "EntitiesDeleteRemovedRecord", sgen.QueryKindExec,
			"DELETE FROM", s.DeletedResources, '\n',
			"WHERE", s.DeletedResourcesIRI, "=", qb.Var("resource_eid", sgen.TypeText),
		),
		qb.MakeQuery(s.Schema, "EntitiesLookupRemovedRecord", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.DeletedResourcesIRI,
				s.DeletedResourcesDeleteTime,
				s.DeletedResourcesReason,
				s.DeletedResourcesMeta,
			), '\n',
			"FROM", s.DeletedResources, '\n',
			"WHERE", s.DeletedResourcesIRI, "=", qb.Var("resource_eid", sgen.TypeText), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "EntitiesListRemovedRecords", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.DeletedResourcesIRI,
				s.DeletedResourcesDeleteTime,
				s.DeletedResourcesReason,
				s.DeletedResourcesMeta,
			), '\n',
			"FROM", s.DeletedResources,
		),
		qb.MakeQuery(s.Schema, "ChangesListFromChangeSet", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.StructuralBlobsViewBlobID,
				s.StructuralBlobsViewCodec,
				s.StructuralBlobsViewData,
				s.StructuralBlobsViewResourceID,
				s.StructuralBlobsViewTs,
				s.StructuralBlobsViewMultihash,
				s.StructuralBlobsViewSize,
			), '\n',
			"FROM", qb.Concat(s.StructuralBlobsView, ", ", "json_each(", qb.Var("cset", sgen.TypeText), ") AS cset"), '\n',
			"WHERE", s.StructuralBlobsViewResource, "=", qb.VarColType(s.StructuralBlobsViewResource, sgen.TypeText), '\n',
			"AND", s.StructuralBlobsViewBlobID, "= cset.value", '\n',
			"ORDER BY", s.StructuralBlobsViewTs,
		),
		qb.MakeQuery(s.Schema, "ChangesListForEntity", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.BlobsID,
				s.BlobsCodec,
				s.BlobsData,
				s.BlobsMultihash,
				s.BlobsSize,
				s.ResourcesID,
				s.StructuralBlobsTs,
			), '\n',
			"FROM", s.StructuralBlobs, '\n',
			"JOIN", s.Blobs, "ON", s.BlobsID, "=", s.StructuralBlobsID, '\n',
			"JOIN", s.Resources, "ON", s.ResourcesID, "=", s.StructuralBlobsResource, '\n',
			"WHERE", s.ResourcesIRI, "=", qb.VarCol(s.ResourcesIRI), '\n',
			"ORDER BY", s.StructuralBlobsTs,
		),
		qb.MakeQuery(s.Schema, "ChangesResolveHeads", sgen.QueryKindSingle,
			"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
				"SELECT value",
				"FROM", qb.Concat("json_each(", qb.Var("heads", sgen.TypeText), ")"),
				"UNION",
				"SELECT", storage.ChangeDepsParent,
				"FROM", storage.ChangeDeps,
				"JOIN changeset ON changeset.change", "=", storage.ChangeDepsChild,
			), '\n',
			"SELECT", qb.Results(
				qb.ResultRaw("json_group_array(change) AS resolved_json", "resolved_json", sgen.TypeText),
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
				{Name: "Heads", Type: sgen.TypeText},
			},
			SQL: `WITH
non_drafts (blob) AS (
	SELECT ` + s.C_StructuralBlobsID + `
	FROM ` + s.T_StructuralBlobs + `
	LEFT JOIN ` + s.T_Drafts + ` ON ` + s.C_DraftsResource + ` = ` + s.C_StructuralBlobsResource + ` AND ` + s.C_StructuralBlobsID + ` = ` + s.C_DraftsBlob + `
	WHERE ` + s.C_StructuralBlobsResource + ` = :entity
	AND ` + s.C_StructuralBlobsType + ` = 'Change'
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
		qb.MakeQuery(s.Schema, "ChangesDeleteForEntity", sgen.QueryKindExec,
			"DELETE FROM", s.Blobs, '\n',
			"WHERE", s.BlobsID, "IN", qb.SubQuery(
				"SELECT", s.StructuralBlobsID,
				"FROM", s.StructuralBlobs,
				"WHERE", s.StructuralBlobsResource, "=", qb.VarCol(s.StructuralBlobsResource),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesGetInfo", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.StructuralBlobsID,
				s.StructuralBlobsTs,
				s.PublicKeysPrincipal,
				qb.ResultExpr(s.C_TrustedAccountsID+" > 0", "is_trusted", sgen.TypeInt),
			), '\n',
			"FROM", s.StructuralBlobs, '\n',
			"JOIN", s.PublicKeys, "ON", s.PublicKeysID, "=", s.StructuralBlobsAuthor, '\n',
			"LEFT JOIN", s.TrustedAccounts, "ON", s.TrustedAccountsID, "=", s.StructuralBlobsAuthor, '\n',
			"WHERE", s.StructuralBlobsID, "=", qb.VarCol(s.StructuralBlobsID), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "ChangesGetDeps", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.BlobsCodec,
				s.BlobsMultihash,
			), '\n',
			"FROM", s.ChangeDeps, '\n',
			"JOIN", s.Blobs, "INDEXED BY blobs_metadata ON", s.BlobsID, "=", s.ChangeDepsParent, '\n',
			"WHERE", s.ChangeDepsChild, "=", qb.VarCol(s.ChangeDepsChild),
		),

		qb.MakeQuery(s.Schema, "BacklinksForDocument", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ResourcesID,
				s.ResourcesIRI,
				s.BlobsCodec,
				s.BlobsMultihash,
				s.StructuralBlobsID,
				s.ResourceLinksType,
				s.ResourceLinksMeta,
				s.ResourceLinksIsPinned,
			), '\n',
			"FROM", s.ResourceLinks, '\n',
			"JOIN", s.StructuralBlobs, "ON", s.StructuralBlobsID, "=", s.ResourceLinksSource, '\n',
			"JOIN", s.Resources, "ON", s.ResourcesID, "=", s.StructuralBlobsResource, '\n',
			"JOIN", s.Blobs, "INDEXED BY blobs_metadata ON", s.BlobsID, "=", s.StructuralBlobsID, '\n',
			"WHERE", s.ResourceLinksType, "GLOB 'doc/*'", '\n',
			"AND", s.ResourceLinksTarget, "=", qb.VarCol(s.ResourceLinksTarget),
		),

		qb.MakeQuery(s.Schema, "DraftsInsert", sgen.QueryKindExec,
			"INSERT INTO", s.Drafts, qb.ListColShort(
				s.DraftsResource,
				s.DraftsBlob,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.DraftsResource),
				qb.VarCol(s.DraftsBlob),
			),
		),
		qb.MakeQuery(s.Schema, "DraftsGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.DraftsViewBlobID,
				s.DraftsViewCodec,
				s.DraftsViewResource,
				s.DraftsViewResourceID,
				s.DraftsViewMultihash,
			), '\n',
			"FROM", s.DraftsView, '\n',
			"WHERE", s.DraftsViewResource, "=", qb.VarColType(s.DraftsViewResource, sgen.TypeText), '\n',
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
