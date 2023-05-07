// Package hypersql provides SQL queries.
package hypersql

import (
	"io/ioutil"
	sgen "mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
	s "mintter/backend/db/sqliteschema"
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
				s.BlobsMultihash,
				s.BlobsCodec,
				s.BlobsData,
				s.BlobsSize,
			), '\n',
			"VALUES", qb.List(
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
		qb.MakeQuery(s.Schema, "PublicKeysInsert", sgen.QueryKindSingle,
			"INSERT INTO", s.PublicKeys, qb.ListColShort(
				s.PublicKeysPrincipal,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.PublicKeysPrincipal),
			), '\n',
			"RETURNING", qb.Results(s.PublicKeysID),
		),

		qb.MakeQuery(s.Schema, "KeyDelegationsInsertOrIgnore", sgen.QueryKindSingle,
			"INSERT OR IGNORE INTO", s.KeyDelegations, qb.ListColShort(
				s.KeyDelegationsID,
				s.KeyDelegationsIssuer,
				s.KeyDelegationsDelegate,
				s.KeyDelegationsIssueTime,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.KeyDelegationsID),
				qb.VarCol(s.KeyDelegationsIssuer),
				qb.VarCol(s.KeyDelegationsDelegate),
				qb.VarCol(s.KeyDelegationsIssueTime),
			), '\n',
			"RETURNING", qb.Results(s.KeyDelegationsID),
		),
		qb.MakeQuery(s.Schema, "KeyDelegationsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.KeyDelegationsViewID,
				s.KeyDelegationsViewBlobCodec,
				s.KeyDelegationsViewBlobsMultihash,
				s.KeyDelegationsViewIssuer,
				s.KeyDelegationsViewDelegate,
				s.KeyDelegationsViewIssueTime,
			), '\n',
			"FROM", s.KeyDelegationsView, '\n',
			"WHERE", s.KeyDelegationsViewIssuer, "=", qb.VarCol(s.KeyDelegationsViewIssuer),
		),

		qb.MakeQuery(s.Schema, "EntitiesInsertOrIgnore", sgen.QueryKindSingle,
			"INSERT OR IGNORE INTO", s.HyperEntities, qb.ListColShort(
				s.HyperEntitiesEID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HyperEntitiesEID),
			), '\n',
			"RETURNING", qb.Results(s.HyperEntitiesID),
		),
		qb.MakeQuery(s.Schema, "EntitiesLookupID", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.HyperEntitiesID,
			), '\n',
			"FROM", s.HyperEntities, '\n',
			"WHERE", s.HyperEntitiesEID, "=", qb.VarCol(s.HyperEntitiesEID), '\n',
			"LIMIT 1",
		),

		qb.MakeQuery(s.Schema, "ChangesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.HyperChanges, qb.ListColShort(
				s.HyperChangesBlob,
				s.HyperChangesEntity,
				s.HyperChangesHlcTime,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HyperChangesBlob),
				qb.VarCol(s.HyperChangesEntity),
				qb.VarCol(s.HyperChangesHlcTime),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesListFromChangeSet", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.HyperChangesViewBlobID,
				s.HyperChangesViewCodec,
				s.HyperChangesViewData,
				s.HyperChangesViewEntityID,
				s.HyperChangesViewHlcTime,
				s.HyperChangesViewMultihash,
				s.HyperChangesViewSize,
			), '\n',
			"FROM", qb.Concat(s.HyperChangesView, ", ", "json_each(", qb.Var("cset", sgen.TypeBytes), ") AS cset"), '\n',
			"WHERE", s.HyperChangesViewBlobID, "= cset.value",
		),
		qb.MakeQuery(s.Schema, "ChangesResolveHeads", sgen.QueryKindSingle,
			"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
				"SELECT value",
				"FROM", qb.Concat("json_each(", qb.Var("heads", sgen.TypeBytes), ")"),
				"UNION",
				"SELECT", sqliteschema.HyperChangeDepsParent,
				"FROM", sqliteschema.HyperChangeDeps,
				"JOIN changeset ON changeset.change", "=", sqliteschema.HyperChangeDepsChild,
			), '\n',
			"SELECT", qb.Results(
				qb.ResultRaw("json_group_array(change) AS resolved_json", "resolved_json", sgen.TypeBytes),
			), '\n',
			"FROM changeset", '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "ChangesGetPublicHeadsJSON", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultExpr("json_group_array("+s.HyperChangesBlob.String()+")", "heads", sgen.TypeBytes),
			), '\n',
			"FROM", s.HyperChanges, '\n',
			"LEFT JOIN", s.HyperDrafts, "ON", s.HyperDraftsEntity, "=", s.HyperChangesEntity, '\n',
			"WHERE", s.HyperChangesEntity, "=", qb.VarCol(s.HyperChangesEntity), '\n',
			"AND", s.HyperDraftsBlob, "IS NULL", '\n',
			"AND", s.HyperChangesBlob, "NOT IN", qb.SubQuery(
				"SELECT", s.HyperChangeDepsParent,
				"FROM", s.HyperChangeDeps,
			), '\n',
			"LIMIT 1",
		),

		qb.MakeQuery(s.Schema, "LinksInsert", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.HyperLinks, qb.ListColShort(
				s.HyperLinksSourceBlob,
				s.HyperLinksRel,
				s.HyperLinksTargetBlob,
				s.HyperLinksTargetEntity,
				s.HyperLinksData,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HyperLinksSourceBlob),
				qb.VarCol(s.HyperLinksRel),
				qb.Concat("NULLIF(", qb.VarCol(s.HyperLinksTargetBlob), ", 0)"),
				qb.Concat("NULLIF(", qb.VarCol(s.HyperLinksTargetEntity), ", 0)"),
				qb.VarCol(s.HyperLinksData),
			),
		),

		qb.MakeQuery(s.Schema, "DraftsInsert", sgen.QueryKindExec,
			"INSERT INTO", s.HyperDrafts, qb.ListColShort(
				s.HyperDraftsEntity,
				s.HyperDraftsBlob,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HyperDraftsEntity),
				qb.VarCol(s.HyperDraftsBlob),
			),
		),
		qb.MakeQuery(s.Schema, "DraftsGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.HyperDraftsViewBlobID,
				s.HyperDraftsViewCodec,
				s.HyperDraftsViewEntity,
				s.HyperDraftsViewEntityID,
				s.HyperDraftsViewMultihash,
			), '\n',
			"FROM", s.HyperDraftsView, '\n',
			"WHERE", s.HyperDraftsViewEntity, "=", qb.VarCol(s.HyperDraftsViewEntity),
			"LIMIT 1",
		),
	)

	if err != nil {
		return err
	}

	return ioutil.WriteFile("queries.gen.go", code, 0600)
}

var _ = generateQueries
