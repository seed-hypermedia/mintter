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
				s.HyperEntitiesEid,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.HyperEntitiesEid),
			), '\n',
			"RETURNING", qb.Results(s.HyperEntitiesID),
		),
		qb.MakeQuery(s.Schema, "EntitiesLookupID", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.HyperEntitiesID,
			), '\n',
			"FROM", s.HyperEntities, '\n',
			"WHERE", s.HyperEntitiesEid, "=", qb.VarCol(s.HyperEntitiesEid), '\n',
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
		qb.MakeQuery(s.Schema, "ChangesListForEntity", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.HyperChangesByEntityViewBlobID,
				s.HyperChangesByEntityViewCodec,
				s.HyperChangesByEntityViewData,
				s.HyperChangesByEntityViewHlcTime,
				s.HyperChangesByEntityViewMultihash,
				s.HyperChangesByEntityViewSize,
				qb.ResultExpr("IIF("+s.HyperChangesByEntityViewDraft.String()+" IS NULL, 0, 1)", "is_draft", sgen.TypeInt),
			), '\n',
			"FROM", s.HyperChangesByEntityView, '\n',
			"WHERE", s.HyperChangesByEntityViewEntityID, "=", qb.VarCol(s.HyperChangesByEntityViewEntityID), '\n',
			"AND is_draft <=", qb.Var("is_draft", sgen.TypeInt),
		),
		qb.MakeQuery(s.Schema, "ChangesResolveHeads", sgen.QueryKindSingle,
			"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
				"SELECT value",
				"FROM", qb.Concat("json_each(", qb.Var("heads", sgen.TypeBytes), ")"),
				"UNION",
				"SELECT", sqliteschema.HyperLinksTargetBlob,
				"FROM", sqliteschema.HyperLinks,
				"JOIN changeset ON changeset.change", "=", sqliteschema.HyperLinksSourceBlob,
				"WHERE", sqliteschema.HyperLinksRel, "=", "change:depends",
			), '\n',
			"SELECT", qb.Results(
				qb.ResultRaw("json_group_array(change) AS resolved_json", "resolved_json", sgen.TypeBytes),
			), '\n',
			"FROM changeset", '\n',
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
			"INSERT INTO", s.DraftBlobs, qb.ListColShort(
				s.DraftBlobsBlob,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.DraftBlobsBlob),
			),
		),
		qb.MakeQuery(s.Schema, "DraftsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.HyperChangesBlob,
			), '\n',
			"FROM", s.HyperChanges, '\n',
			"JOIN", s.DraftBlobs, "ON", s.DraftBlobsBlob, "=", s.HyperChangesBlob, '\n',
			"WHERE", s.HyperChangesEntity, "=", qb.VarCol(s.HyperChangesEntity),
		),
	)

	if err != nil {
		return err
	}

	return ioutil.WriteFile("queries.gen.go", code, 0600)
}

var _ = generateQueries
