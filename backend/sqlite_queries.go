package backend

import (
	"fmt"
	"io/ioutil"
	sgen "mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	s "mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs"
	"mintter/backend/vcs/vcssql"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
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
			"INSERT OR IGNORE", qb.Line,
			"INTO", s.Devices, qb.ListColShort(
				s.DevicesMultihash,
				s.DevicesCodec,
				s.DevicesAccountID,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(s.DevicesMultihash),
				qb.VarCol(s.DevicesCodec),
				qb.LookupSubQuery(s.AccountsID, s.Accounts,
					"WHERE", s.AccountsMultihash, "=", qb.VarCol(s.AccountsMultihash),
					"AND", s.AccountsCodec, "=", qb.VarCol(s.AccountsCodec),
				),
			),
		),

		qb.MakeQuery(s.Schema, "draftsUpdate", sgen.QueryKindExec,
			"UPDATE", s.Drafts, qb.Line,
			"SET", qb.ListColShort(
				s.DraftsTitle,
				s.DraftsSubtitle,
				s.DraftsContent,
				s.DraftsUpdateTime,
			), "=", qb.List(
				qb.VarCol(s.DraftsTitle),
				qb.VarCol(s.DraftsSubtitle),
				qb.VarCol(s.DraftsContent),
				qb.VarCol(s.DraftsUpdateTime),
			), qb.Line,
			"WHERE", s.DraftsID, "=", qb.LookupSubQuery(s.ObjectsID, s.Objects,
				"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
				"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
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
			"WHERE", s.DraftsID, "=", qb.LookupSubQuery(s.ObjectsID, s.Objects,
				"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
				"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
			),
		),

		qb.MakeQuery(s.Schema, "draftsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Drafts, qb.Line,
			"WHERE", s.DraftsID, "=", qb.LookupSubQuery(s.ObjectsID, s.Objects,
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
			"INSERT OR REPLACE", qb.Line,
			"INTO", s.Publications, qb.ListColShort(
				s.PublicationsID,
				s.PublicationsTitle,
				s.PublicationsSubtitle,
				s.PublicationsCreateTime,
				s.PublicationsUpdateTime,
				s.PublicationsPublishTime,
				s.PublicationsLatestVersion,
			), qb.Line,
			"VALUES", qb.List(
				qb.LookupSubQuery(s.ObjectsID, s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
					"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
				),
				qb.VarCol(s.PublicationsTitle),
				qb.VarCol(s.PublicationsSubtitle),
				qb.VarCol(s.PublicationsCreateTime),
				qb.VarCol(s.PublicationsUpdateTime),
				qb.VarCol(s.PublicationsPublishTime),
				qb.VarCol(s.PublicationsLatestVersion),
			),
		),

		qb.MakeQuery(s.Schema, "publicationsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.ObjectsCodec),
				qb.ResultCol(s.ObjectsMultihash),
				qb.ResultCol(s.AccountsCodec),
				qb.ResultCol(s.AccountsMultihash),
				qb.ResultCol(s.PublicationsTitle),
				qb.ResultCol(s.PublicationsSubtitle),
				qb.ResultCol(s.PublicationsCreateTime),
				qb.ResultCol(s.PublicationsUpdateTime),
				qb.ResultCol(s.PublicationsPublishTime),
				qb.ResultCol(s.PublicationsLatestVersion),
			), qb.Line,
			"FROM", s.Publications, qb.Line,
			"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.PublicationsID, qb.Line,
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.ObjectsAccountID,
		),

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
				qb.ResultCol(s.AccountsID),
				qb.ResultCol(s.AccountsMultihash),
				qb.ResultCol(s.AccountsCodec),
			), qb.Line,
			"FROM", s.Accounts, qb.Line,
			"WHERE", s.AccountsID, "=", qb.LookupSubQuery(s.DevicesAccountID, s.Devices,
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
				qb.LookupSubQuery(s.ObjectsID, s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
					"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
				),
				qb.LookupSubQuery(s.DevicesID, s.Devices,
					"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
				),
				qb.VarCol(s.HeadsSeq),
				qb.VarCol(s.HeadsLamportTime),
				qb.LookupSubQuery(s.IPFSBlocksID, s.IPFSBlocks,
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

		qb.MakeQuery(s.Schema, "linksListBySource", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.LinksID),
				qb.ResultCol(s.LinksSourceBlockID),
				qb.ResultCol(s.LinksTargetVersion),
				qb.ResultCol(s.LinksTargetBlockID),
				qb.ResultExpr(string(s.LinksSourceIPFSBlockID)+" IS NULL", "is_draft", sgen.TypeInt),
				qb.ResultColAlias(s.IPFSBlocksCodec, "source_ipfs_block_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "source_ipfs_block_multihash"),
				qb.ResultColAlias(s.ObjectsCodec, "target_object_codec"),
				qb.ResultColAlias(s.ObjectsMultihash, "target_object_multihash"),
			), qb.Line,
			"FROM", s.Links, qb.Line,
			"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.LinksTargetObjectID, qb.Line,
			"LEFT JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.LinksSourceIPFSBlockID, qb.Line,
			"WHERE", s.LinksSourceObjectID, "=", qb.LookupSubQuery(s.ObjectsID, s.Objects,
				"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
				"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
			),
		),

		qb.MakeQuery(s.Schema, "linksInsertFromDraft", sgen.QueryKindExec,
			"INSERT OR IGNORE", qb.Line,
			"INTO", s.Links, qb.ListColShort(
				s.LinksSourceObjectID,
				s.LinksSourceBlockID,
				s.LinksTargetObjectID,
				s.LinksTargetBlockID,
				s.LinksTargetVersion,
			), qb.Line,
			"VALUES", qb.List(
				qb.LookupSubQuery(s.ObjectsID, s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.Var("sourceObjectMultihash", sgen.TypeBytes),
					"AND", s.ObjectsCodec, "=", qb.Var("sourceObjectCodec", sgen.TypeInt),
				),
				qb.VarCol(s.LinksSourceBlockID),
				qb.LookupSubQuery(s.ObjectsID, s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.Var("targetObjectMultihash", sgen.TypeBytes),
					"AND", s.ObjectsCodec, "=", qb.Var("targetObjectCodec", sgen.TypeInt),
				),
				qb.VarCol(s.LinksTargetBlockID),
				qb.VarCol(s.LinksTargetVersion),
			),
		),

		qb.MakeQuery(s.Schema, "linksInsertFromPublication", sgen.QueryKindExec,
			"INSERT OR IGNORE", qb.Line,
			"INTO", s.Links, qb.ListColShort(
				s.LinksSourceObjectID,
				s.LinksSourceBlockID,
				s.LinksSourceIPFSBlockID,
				s.LinksTargetObjectID,
				s.LinksTargetBlockID,
				s.LinksTargetVersion,
			), qb.Line,
			"VALUES", qb.List(
				qb.LookupSubQuery(s.ObjectsID, s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.Var("sourceObjectMultihash", sgen.TypeBytes),
					"AND", s.ObjectsCodec, "=", qb.Var("sourceObjectCodec", sgen.TypeInt),
				),
				qb.VarCol(s.LinksSourceBlockID),
				qb.LookupSubQuery(s.IPFSBlocksID, s.IPFSBlocks,
					"WHERE", s.IPFSBlocksCodec, "=", qb.Var("sourceChangeCodec", sgen.TypeInt),
					"AND", s.IPFSBlocksMultihash, "=", qb.Var("sourceChangeMultihash", sgen.TypeBytes),
				),
				qb.LookupSubQuery(s.ObjectsID, s.Objects,
					"WHERE", s.ObjectsMultihash, "=", qb.Var("targetObjectMultihash", sgen.TypeBytes),
					"AND", s.ObjectsCodec, "=", qb.Var("targetObjectCodec", sgen.TypeInt),
				),
				qb.VarCol(s.LinksTargetBlockID),
				qb.VarCol(s.LinksTargetVersion),
			),
		),

		qb.MakeQuery(s.Schema, "linksDeleteByID", sgen.QueryKindExec,
			"DELETE FROM", s.Links, qb.Line,
			"WHERE", s.LinksID, "=", qb.VarCol(s.LinksID),
		),

		// When we publish the latest draft, we want to mark all those links we might have to be assigned
		// to the newly published document.
		qb.MakeQuery(s.Schema, "linksUpdatePublication", sgen.QueryKindExec,
			"UPDATE", s.Links, qb.Line,
			"SET", s.LinksSourceIPFSBlockID.ShortName(), "=", qb.LookupSubQuery(s.IPFSBlocksID, s.IPFSBlocks,
				"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
				"AND", s.IPFSBlocksCodec, "=", qb.VarCol(s.IPFSBlocksCodec),
			), qb.Line,
			"WHERE", s.LinksSourceObjectID.ShortName(), "=", qb.LookupSubQuery(s.ObjectsID, s.Objects,
				"WHERE", s.ObjectsMultihash, "=", qb.VarCol(s.ObjectsMultihash),
				"AND", s.ObjectsCodec, "=", qb.VarCol(s.ObjectsCodec),
			),
		),

		qb.MakeQuery(s.Schema, "backlinksListForPublication", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultColAlias(s.ObjectsCodec, "source_object_codec"),
				qb.ResultColAlias(s.ObjectsMultihash, "source_object_multihash"),
				qb.ResultCol(s.LinksSourceBlockID),
				qb.ResultColAlias(s.IPFSBlocksCodec, "source_ipfs_block_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "source_ipfs_block_multihash"),
				qb.ResultCol(s.LinksTargetBlockID),
				qb.ResultCol(s.LinksTargetVersion),
				qb.ResultExpr(string(s.LinksSourceIPFSBlockID)+" IS NULL", "is_draft", sgen.TypeInt),
			), qb.Line,
			"FROM", s.Backlinks, qb.Line,
			"JOIN", s.Links, "ON", s.LinksSourceObjectID, "=", s.BacklinksID, qb.Line,
			"JOIN", s.Objects, "ON", s.ObjectsID, "=", s.LinksSourceObjectID, qb.Line,
			"LEFT JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.LinksSourceIPFSBlockID,
			"WHERE", s.BacklinksDepth, "!=", "0", qb.Line,
			"AND", s.BacklinksDepth, "<=", qb.Var("depth", sgen.TypeInt), qb.Line,
			"AND", "backlinks.root", "=", qb.LookupSubQuery(s.ObjectsID, s.Objects,
				"WHERE", s.ObjectsMultihash, "=", qb.Var("targetObjectMultihash", sgen.TypeBytes),
				"AND", s.ObjectsCodec, "=", qb.Var("targetObjectCodec", sgen.TypeInt),
			),
		),
	)
	if err != nil {
		return err
	}

	return ioutil.WriteFile("sqlite_queries.gen.go", code, 0600)
}

func lookupAccID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	ocodec, ohash := ipfs.DecodeCID(c)

	res, err := vcssql.AccountsLookupPK(conn, ohash, int(ocodec))
	if err != nil {
		return 0, err
	}

	if res.AccountsID != 0 {
		return res.AccountsID, nil
	}

	insert, err := vcssql.AccountsInsertPK(conn, ohash, int(ocodec))
	if err != nil {
		return 0, err
	}

	if insert.AccountsID == 0 {
		return 0, fmt.Errorf("failed to insert account")
	}

	return insert.AccountsID, nil
}
