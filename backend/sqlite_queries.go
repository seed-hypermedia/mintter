package backend

import (
	"io/ioutil"
	sgen "mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	s "mintter/backend/db/sqliteschema"
)

var _ = generateQueries

//go:generate gorun generateQueries
func generateQueries() error {
	code, err := sgen.CodegenQueries("backend",
		qb.MakeQuery(s.Schema, "accountsInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Accounts, qb.ListColShort(
				s.AccountsMultihash,
				s.AccountsCodec,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(s.AccountsMultihash),
				qb.VarCol(s.AccountsCodec),
			),
		),

		qb.MakeQuery(s.Schema, "devicesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Devices, qb.ListColShort(
				s.DevicesMultihash,
				s.DevicesCodec,
				s.DevicesAccountID,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(s.DevicesMultihash),
				qb.VarCol(s.DevicesCodec),
				qb.SubQuery(
					"SELECT", s.AccountsID,
					"FROM", s.Accounts,
					"WHERE", s.AccountsMultihash, "=", qb.VarCol(s.AccountsMultihash),
				),
			),
		),

		qb.MakeQuery(s.Schema, "objectsInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Objects, qb.ListColShort(
				s.ObjectsMultihash,
				s.ObjectsCodec,
				s.ObjectsAccountID,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(s.ObjectsMultihash),
				qb.VarCol(s.ObjectsCodec),
				qb.SubQuery(
					"SELECT", s.AccountsID,
					"FROM", s.Accounts,
					"WHERE", s.AccountsMultihash, "=", qb.VarCol(s.AccountsMultihash),
				),
			),
		),

		// qb.MakeQuery(s.Schema, "insertChange", sgen.QueryKindExec,
		// 	"INSERT INTO", s.Changes, qb.ListColShort(
		// 		s.ChangesObjectID,
		// 		s.ChangesDeviceID,
		// 		s.ChangesSeq,
		// 		s.ChangesLamportTime,
		// 		s.ChangesIPFSBlockID,
		// 	), qb.Line,
		// 	"VALUES", qb.List(
		// 		qb.SubQuery(
		// 			"SELECT", s.ObjectsID,
		// 			"FROM", s.Objects,
		// 			"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
		// 		),
		// 		qb.SubQuery(
		// 			"SELECT", s.DevicesID,
		// 			"FROM", s.Devices,
		// 			"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
		// 		),
		// 		qb.VarCol(s.ChangesSeq),
		// 		qb.VarCol(s.ChangesLamportTime),
		// 		qb.SubQuery(
		// 			"SELECT", s.IPFSBlocksID,
		// 			"FROM", s.IPFSBlocks,
		// 			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
		// 		),
		// 	),
		// ),

		// qb.MakeQuery(s.Schema, "getObjectHeads", sgen.QueryKindMany,
		// 	"SELECT", qb.Results(
		// 		qb.ResultCol(s.DevicesMultihash),
		// 		qb.ResultCol(s.DevicesCodec),
		// 		qb.ResultCol(s.IPFSBlocksMultihash),
		// 		qb.ResultCol(s.IPFSBlocksCodec),
		// 		qb.ResultExpr(qb.SQLFunc("MAX", s.ChangesSeq.String()), "seq", sgen.TypeInt),
		// 		qb.ResultCol(s.ChangesLamportTime),
		// 	), qb.Line,
		// 	"FROM", s.Changes, qb.Line,
		// 	"JOIN", s.Devices, "ON", s.DevicesID, "=", s.ChangesDeviceID, qb.Line,
		// 	"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.ChangesIPFSBlockID, qb.Line,
		// 	"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.ChangesObjectID, qb.Line,
		// 	"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash), qb.Line,
		// 	"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec), qb.Line,
		// 	"GROUP BY", s.ChangesDeviceID,
		// ),

		// qb.MakeQuery(s.Schema, "getLastSeq", sgen.QueryKindSingle,
		// 	"SELECT", qb.Results(
		// 		qb.ResultExpr(qb.SQLFunc("MAX", s.ChangesSeq.String()), "seq", sgen.TypeInt),
		// 	), qb.Line,
		// 	"FROM", s.Changes, qb.Line,
		// 	"JOIN", s.Devices, "ON", s.DevicesID, "=", s.ChangesDeviceID, qb.Line,
		// 	"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.ChangesObjectID, qb.Line,
		// 	"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash), qb.Line,
		// 	"AND", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
		// ),

		qb.MakeQuery(s.Schema, "draftsUpsert", sgen.QueryKindExec,
			"INSERT INTO", s.Drafts, qb.ListColShort(
				s.DraftsID,
				s.DraftsTitle,
				s.DraftsSubtitle,
				s.DraftsContent,
				s.DraftsCreateTime,
				s.DraftsUpdateTime,
			), qb.Line,
			"VALUES", qb.List(
				qb.SubQuery(
					"SELECT", s.ObjectsID,
					"FROM", s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
					"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
				),
				qb.VarCol(s.DraftsTitle),
				qb.VarCol(s.DraftsSubtitle),
				qb.VarCol(s.DraftsContent),
				qb.VarCol(s.DraftsCreateTime),
				qb.VarCol(s.DraftsUpdateTime),
			), qb.Line,
			"ON CONFLICT", qb.ListColShort(s.DraftsID), "DO UPDATE", qb.Line,
			"SET", qb.ListColShort(
				s.DraftsTitle,
				s.DraftsSubtitle,
				s.DraftsContent,
				s.DraftsUpdateTime,
			), "=", qb.List(
				"excluded."+s.DraftsTitle.ShortName(),
				"excluded."+s.DraftsSubtitle.ShortName(),
				"excluded."+s.DraftsContent.ShortName(),
				"excluded."+s.DraftsUpdateTime.ShortName(),
			),
		),

		qb.MakeQuery(s.Schema, "draftsGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.DraftsTitle),
				qb.ResultCol(s.DraftsSubtitle),
				qb.ResultCol(s.DraftsContent),
				qb.ResultCol(s.DraftsCreateTime),
				qb.ResultCol(s.DraftsUpdateTime),
			), qb.Line,
			"FROM", s.Drafts, qb.Line,
			"WHERE", s.DraftsID, "=", qb.SubQuery(
				"SELECT", s.ObjectsID,
				"FROM", s.Objects,
				"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
				"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
			),
		),

		qb.MakeQuery(s.Schema, "draftsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Drafts, qb.Line,
			"WHERE", s.DraftsID, "=", qb.SubQuery(
				"SELECT", s.ObjectsID,
				"FROM", s.Objects,
				"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
				"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
			),
		),

		qb.MakeQuery(s.Schema, "draftsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.ObjectsMultihash),
				qb.ResultCol(s.ObjectsCodec),
				qb.ResultCol(s.DraftsTitle),
				qb.ResultCol(s.DraftsSubtitle),
				qb.ResultCol(s.DraftsCreateTime),
				qb.ResultCol(s.DraftsUpdateTime),
			), qb.Line,
			"FROM", s.Drafts, qb.Line,
			"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.DraftsID, qb.Line,
		),

		qb.MakeQuery(s.Schema, "publicationsUpsert", sgen.QueryKindExec,
			"INSERT INTO", s.Publications, qb.ListColShort(
				s.PublicationsID,
				s.PublicationsTitle,
				s.PublicationsSubtitle,
				s.PublicationsCreateTime,
				s.PublicationsUpdateTime,
				s.PublicationsPublishTime,
				s.PublicationsLatestVersion,
			), qb.Line,
			"VALUES", qb.List(
				qb.SubQuery(
					"SELECT", s.ObjectsID,
					"FROM", s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
					"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
				),
				qb.VarCol(s.PublicationsTitle),
				qb.VarCol(s.PublicationsSubtitle),
				qb.VarCol(s.PublicationsCreateTime),
				qb.VarCol(s.PublicationsUpdateTime),
				qb.VarCol(s.PublicationsPublishTime),
				qb.VarCol(s.PublicationsLatestVersion),
			), qb.Line,
			"ON CONFLICT", qb.ListColShort(s.PublicationsID), "DO UPDATE", qb.Line,
			"SET", qb.ListColShort(
				s.PublicationsTitle,
				s.PublicationsSubtitle,
				s.PublicationsCreateTime,
				s.PublicationsUpdateTime,
				s.PublicationsPublishTime,
				s.PublicationsLatestVersion,
			), "=", qb.List(
				"excluded."+s.PublicationsTitle.ShortName(),
				"excluded."+s.PublicationsSubtitle.ShortName(),
				"excluded."+s.PublicationsCreateTime.ShortName(),
				"excluded."+s.PublicationsUpdateTime.ShortName(),
				"excluded."+s.PublicationsPublishTime.ShortName(),
				"excluded."+s.PublicationsLatestVersion.ShortName(),
			),
		),

		qb.MakeQuery(s.Schema, "publicationsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.ObjectsMultihash),
				qb.ResultCol(s.ObjectsCodec),
				qb.ResultCol(s.PublicationsTitle),
				qb.ResultCol(s.PublicationsSubtitle),
				qb.ResultCol(s.PublicationsCreateTime),
				qb.ResultCol(s.PublicationsUpdateTime),
				qb.ResultCol(s.PublicationsPublishTime),
				qb.ResultCol(s.PublicationsLatestVersion),
			), qb.Line,
			"FROM", s.Publications, qb.Line,
			"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.PublicationsID, qb.Line,
		),

		// qb.MakeQuery(s.Schema, "documentsDelete", sgen.QueryKindExec,
		// 	"DELETE FROM", s.Documents, qb.Line,
		// 	"WHERE", s.DocumentsID, "=", qb.SubQuery(
		// 		"SELECT", s.ObjectsID,
		// 		"FROM", s.Objects,
		// 		"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
		// 	),
		// ),

		qb.MakeQuery(s.Schema, "objectsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Objects, qb.Line,
			"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
			"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
		),

		qb.MakeQuery(s.Schema, "devicesList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.DevicesCodec),
				qb.ResultCol(s.DevicesMultihash),
				qb.ResultCol(s.AccountsCodec),
				qb.ResultCol(s.AccountsMultihash),
			), qb.Line,
			"FROM", s.Devices, qb.Line,
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.DevicesAccountID,
		),

		qb.MakeQuery(s.Schema, "accountsGetForDevice", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.AccountsMultihash),
				qb.ResultCol(s.AccountsCodec),
			), qb.Line,
			"FROM", s.Accounts, qb.Line,
			"WHERE", s.AccountsID, "=", qb.SubQuery(
				"SELECT", s.DevicesAccountID,
				"FROM", s.Devices,
				"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
			),
		),

		qb.MakeQuery(s.Schema, "accountsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.AccountsCodec),
				qb.ResultCol(s.AccountsMultihash),
				qb.ResultCol(s.AccountsAlias),
				qb.ResultCol(s.AccountsEmail),
				qb.ResultCol(s.AccountsBio),
			), qb.Line,
			"FROM", s.Accounts, qb.Line,
			"WHERE", s.AccountsMultihash, "!=", qb.Var("ownAccountMultihash", sgen.TypeBytes),
		),

		qb.MakeQuery(s.Schema, "headsUpsert", sgen.QueryKindExec,
			"INSERT INTO", s.Heads, qb.ListColShort(
				s.HeadsObjectID,
				s.HeadsDeviceID,
				s.HeadsSeq,
				s.HeadsLamportTime,
				s.HeadsIPFSBlockID,
			), qb.Line,
			"VALUES", qb.List(
				qb.SubQuery(
					"SELECT", s.ObjectsID,
					"FROM", s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
					"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
				),
				qb.SubQuery(
					"SELECT", s.DevicesID,
					"FROM", s.Devices,
					"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
				),
				qb.VarCol(s.HeadsSeq),
				qb.VarCol(s.HeadsLamportTime),
				qb.SubQuery(
					"SELECT", s.IPFSBlocksID,
					"FROM", s.IPFSBlocks,
					"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
					"AND", s.IPFSBlocksCodec, "=", qb.VarCol(s.IPFSBlocksCodec),
				),
			), qb.Line,
			"ON CONFLICT", qb.ListColShort(s.HeadsObjectID, s.HeadsDeviceID), "DO UPDATE", qb.Line,
			"SET", qb.ListColShort(
				s.HeadsObjectID,
				s.HeadsDeviceID,
				s.HeadsSeq,
				s.HeadsLamportTime,
				s.HeadsIPFSBlockID,
			), "=", qb.List(
				"excluded."+s.HeadsObjectID.ShortName(),
				"excluded."+s.HeadsDeviceID.ShortName(),
				"excluded."+s.HeadsSeq.ShortName(),
				"excluded."+s.HeadsLamportTime.ShortName(),
				"excluded."+s.HeadsIPFSBlockID.ShortName(),
			), qb.Line,
			"WHERE", "(excluded."+s.HeadsSeq.ShortName(), "-", s.HeadsSeq.ShortName(), "= 1)",
		),

		qb.MakeQuery(s.Schema, "headsListForObject", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.DevicesMultihash),
				qb.ResultCol(s.DevicesCodec),
				qb.ResultCol(s.IPFSBlocksMultihash),
				qb.ResultCol(s.IPFSBlocksCodec),
				qb.ResultCol(s.HeadsSeq),
				qb.ResultCol(s.HeadsLamportTime),
			), qb.Line,
			"FROM", s.Heads, qb.Line,
			"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.HeadsObjectID, qb.Line,
			"JOIN", s.Devices, "ON", s.DevicesID, "=", s.HeadsDeviceID, qb.Line,
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.HeadsIPFSBlockID, qb.Line,
			"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
			"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec), qb.Line,
		),

		qb.MakeQuery(s.Schema, "headsGetForObjectAndDevice", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.DevicesMultihash),
				qb.ResultCol(s.DevicesCodec),
				qb.ResultCol(s.IPFSBlocksMultihash),
				qb.ResultCol(s.IPFSBlocksCodec),
				qb.ResultCol(s.HeadsSeq),
				qb.ResultCol(s.HeadsLamportTime),
			), qb.Line,
			"FROM", s.Heads, qb.Line,
			"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.HeadsObjectID, qb.Line,
			"JOIN", s.Devices, "ON", s.DevicesID, "=", s.HeadsDeviceID, qb.Line,
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.HeadsIPFSBlockID, qb.Line,
			"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash), qb.Line,
			"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec), qb.Line,
			"AND", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
		),

		qb.MakeQuery(s.Schema, "linksInsertFromDraft", sgen.QueryKindExec,
			"INSERT INTO", s.Links, qb.ListColShort(
				s.LinksSourceDraft,
				s.LinksSourceDocumentID,
				s.LinksSourceBlockID,
				s.LinksTargetDocumentID,
				s.LinksTargetBlockID,
				s.LinksTargetDocumentVersion,
			), qb.Line,
			"VALUES", qb.List(
				qb.SubQuery(
					"SELECT", s.ObjectsID,
					"FROM", s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
					"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
					"LIMIT 1",
				),
				qb.VarCol(s.LinksSourceDocumentID),
				qb.VarCol(s.LinksSourceBlockID),
				qb.VarCol(s.LinksTargetDocumentID),
				qb.VarCol(s.LinksTargetBlockID),
				qb.VarCol(s.LinksTargetDocumentVersion),
			),
		),

		// delete draft links

		// insert draft links

		// upsert publication links

		// list backlinks

	)
	if err != nil {
		return err
	}

	return ioutil.WriteFile("sqlite_queries.gen.go", code, 0600)
}
