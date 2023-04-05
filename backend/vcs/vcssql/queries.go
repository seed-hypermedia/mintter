// Package vcssql provide SQL queries for vcs package.
// It must not be used outside of vcs, but it can't be internal package
// because otherwise code generation with gorun wouldn't work.
package vcssql

import (
	"fmt"
	"io/ioutil"
	sgen "mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	s "mintter/backend/db/sqliteschema"
)

// Doing this indirection here so that it's easier to navigate the file with CMD+R
// in the IDE and skip to the desired "group" of queries by variable name.
// Should probably split them in different files instead, to avoid linters complaining
// about unused variables. Also could explicitly pass each variable to the codegen function,
// but it's easy to forget to do that when iterating quickly.

var global []sgen.QueryTemplate

func add(qq ...sgen.QueryTemplate) int {
	global = append(global, qq...)
	return 0
}

var (
	accounts = add(
		qb.MakeQuery(s.Schema, "AccountsLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.AccountsID,
			), '\n',
			"FROM", s.Accounts, '\n',
			"WHERE", s.AccountsMultihash, "=", qb.VarCol(s.AccountsMultihash),
		),
		qb.MakeQuery(s.Schema, "AccountsInsertPK", sgen.QueryKindSingle,
			"INSERT INTO", s.Accounts, qb.ListColShort(
				s.AccountsMultihash,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.AccountsMultihash),
			),
			"RETURNING", qb.Results(s.AccountsID),
		),
		qb.MakeQuery(s.Schema, "AccountsGetForDevice", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.AccountsID,
				s.AccountsMultihash,
			), '\n',
			"FROM", s.Accounts, '\n',
			"JOIN", s.AccountDevices, "ON", s.AccountDevicesAccountID, "=", s.AccountsID, '\n',
			"WHERE", s.AccountDevicesDeviceID, "=", qb.LookupSubQuery(s.DevicesID, s.Devices,
				"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
			),
		),
		qb.MakeQuery(s.Schema, "AccountsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.AccountsID,
				s.AccountsMultihash,
			), '\n',
			"FROM", s.Accounts, '\n',
			"WHERE", s.AccountsMultihash, "!=", qb.Var("ownAccountMultihash", sgen.TypeBytes),
		),
	)
	_ = accounts

	contentLinks = add(
		qb.MakeQuery(s.Schema, "ContentLinksInsert", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.ContentLinks, qb.ListColShort(
				s.ContentLinksSourceDocumentID,
				s.ContentLinksSourceBlockID,
				s.ContentLinksSourceChangeID,
				s.ContentLinksSourceVersion,
				s.ContentLinksTargetDocumentID,
				s.ContentLinksTargetBlockID,
				s.ContentLinksTargetVersion,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ContentLinksSourceDocumentID),
				qb.VarCol(s.ContentLinksSourceBlockID),
				qb.VarCol(s.ContentLinksSourceChangeID),
				qb.VarCol(s.ContentLinksSourceVersion),
				qb.VarCol(s.ContentLinksTargetDocumentID),
				qb.VarCol(s.ContentLinksTargetBlockID),
				qb.VarCol(s.ContentLinksTargetVersion),
			),
		),
		qb.MakeQuery(s.Schema, "BacklinksListByTargetDocument", sgen.QueryKindMany,
			"WITH RECURSIVE",
			"parent AS", qb.SubQuery(
				"SELECT", fmt.Sprintf("%s.*, 0 AS level", s.ContentLinks),
				"FROM", s.ContentLinks, "WHERE", s.ContentLinksTargetDocumentID, "=", qb.Var("targetDocumentID", sgen.TypeInt),
				"UNION ALL",
				"SELECT", fmt.Sprintf("%s.*, parent.level + 1 AS child_level", s.ContentLinks),
				"FROM", qb.Enumeration(s.ContentLinks, "parent"),
				"WHERE", "parent."+s.ContentLinksSourceDocumentID.ShortName(), "=", s.ContentLinksTargetDocumentID,
				"AND child_level <=", qb.Var("depth", sgen.TypeInt),
				"ORDER BY child_level",
			),
			"SELECT", qb.Results(
				qb.ResultRaw("s.multihash", "source_document_multihash", sgen.TypeBytes),
				s.ContentLinksSourceBlockID,
				s.ContentLinksSourceVersion,
				qb.ResultRaw("t.multihash", "target_document_multihash", sgen.TypeBytes),
				s.ContentLinksTargetBlockID,
				s.ContentLinksTargetVersion,
			),
			"FROM parent AS content_links",
			"JOIN ipfs_blocks s ON s.id =", s.ContentLinksSourceDocumentID,
			"JOIN ipfs_blocks t on t.id =", s.ContentLinksTargetDocumentID,
			"WHERE", s.ContentLinksSourceDocumentID, "!= :targetDocumentID",
		),
		qb.MakeQuery(s.Schema, "ContentLinksDelete", sgen.QueryKindExec,
			"DELETE FROM", s.ContentLinks, '\n',
			"WHERE", s.ContentLinksSourceDocumentID, "=", qb.VarCol(s.ContentLinksSourceDocumentID), '\n',
			"AND", s.ContentLinksSourceBlockID, "=", qb.VarCol(s.ContentLinksSourceBlockID), '\n',
			"AND", s.ContentLinksSourceChangeID, "=", qb.VarCol(s.ContentLinksSourceChangeID),
		),
	)
	_ = contentLinks

	devices = add(
		qb.MakeQuery(s.Schema, "DevicesLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.DevicesID,
			), '\n',
			"FROM", s.Devices, '\n',
			"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
		),
		qb.MakeQuery(s.Schema, "DevicesInsertPK", sgen.QueryKindSingle,
			"INSERT INTO", s.Devices, qb.ListColShort(
				s.DevicesMultihash,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.DevicesMultihash),
			),
			"RETURNING", qb.Results(s.DevicesID),
		),
		qb.MakeQuery(s.Schema, "AccountDevicesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.AccountDevices, qb.ListColShort(
				s.AccountDevicesAccountID,
				s.AccountDevicesDeviceID,
			), "VALUES", qb.List(
				qb.VarCol(s.AccountDevicesAccountID),
				qb.VarCol(s.AccountDevicesDeviceID),
			),
		),
		qb.MakeQuery(s.Schema, "AccountDevicesUpdateDelegation", sgen.QueryKindExec,
			"UPDATE", s.AccountDevices, '\n',
			"SET", s.AccountDevicesDelegationID.ShortName(), "=", qb.VarCol(s.AccountDevicesDelegationID), '\n',
			"WHERE", s.AccountDevicesAccountID.ShortName(), "=", qb.VarCol(s.AccountDevicesAccountID), '\n',
			"AND", s.AccountDevicesDeviceID.ShortName(), "=", qb.VarCol(s.AccountDevicesDeviceID), '\n',
		),
		qb.MakeQuery(s.Schema, "AccountDevicesList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.DevicesMultihash,
				s.AccountsMultihash,
			), '\n',
			"FROM", s.AccountDevices, '\n',
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.AccountDevicesAccountID,
			"JOIN", s.Devices, "ON", s.DevicesID, "=", s.AccountDevicesDeviceID,
		),
		qb.MakeQuery(s.Schema, "DevicesList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.DevicesMultihash,
				s.AccountDevicesDeviceID,
				s.AccountDevicesAccountID,
			), '\n',
			"FROM", s.AccountDevices, '\n',
			"JOIN", s.Devices, "ON", s.DevicesID, "=", s.AccountDevicesDeviceID,
		),
	)
	_ = devices

	ipfsBlocks = add(
		qb.MakeQuery(s.Schema, "IPFSBlocksLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.IPFSBlocksID,
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash), '\n',
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksLookupCID", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.IPFSBlocksID,
				s.IPFSBlocksCodec,
				s.IPFSBlocksMultihash,
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksID, "=", qb.VarCol(s.IPFSBlocksID), '\n',
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksInsert", sgen.QueryKindExec,
			"INSERT INTO", s.IPFSBlocks, qb.ListColShort(
				s.IPFSBlocksID,
				s.IPFSBlocksMultihash,
				s.IPFSBlocksCodec,
				s.IPFSBlocksData,
				s.IPFSBlocksSize,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.IPFSBlocksID),
				qb.VarCol(s.IPFSBlocksMultihash),
				qb.VarCol(s.IPFSBlocksCodec),
				qb.VarCol(s.IPFSBlocksData),
				qb.VarCol(s.IPFSBlocksSize),
			),
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksUpsert", sgen.QueryKindSingle,
			"INSERT INTO", s.IPFSBlocks, qb.ListColShort(
				s.IPFSBlocksMultihash,
				s.IPFSBlocksCodec,
				s.IPFSBlocksData,
				s.IPFSBlocksSize,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.IPFSBlocksMultihash),
				qb.VarCol(s.IPFSBlocksCodec),
				qb.VarCol(s.IPFSBlocksData),
				qb.VarCol(s.IPFSBlocksSize),
			), '\n',
			// Update existing record if the existing one was pending, and we're inserting found content to make it non-pending.
			"ON CONFLICT", qb.ListColShort(s.IPFSBlocksMultihash), '\n',
			"DO UPDATE SET codec = excluded.codec, data = excluded.data, size = excluded.size", '\n',
			"WHERE size = -1", '\n',
			"RETURNING", qb.Results(s.IPFSBlocksID),
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksListValid", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.IPFSBlocksID,
				s.IPFSBlocksMultihash,
				s.IPFSBlocksCodec,
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksSize, ">=", "0",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksHas", sgen.QueryKindSingle,
			"SELECT", qb.Results(qb.ResultExpr("1", "has", sgen.TypeInt)), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash), '\n',
			"AND", s.IPFSBlocksSize, ">=", "0",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.IPFSBlocksID,
				s.IPFSBlocksMultihash,
				s.IPFSBlocksCodec,
				s.IPFSBlocksData,
				s.IPFSBlocksSize,
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
			"AND", s.IPFSBlocksSize, ">=", "0",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksGetSize", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.IPFSBlocksID,
				s.IPFSBlocksSize,
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
			"AND", s.IPFSBlocksSize, ">=", "0",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksDelete", sgen.QueryKindSingle,
			"DELETE FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash), '\n',
			"RETURNING", qb.Results(s.IPFSBlocksID),
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksDeleteByID", sgen.QueryKindExec,
			"DELETE FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksID, "=", qb.VarCol(s.IPFSBlocksID),
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksGetHash", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.IPFSBlocksCodec,
				s.IPFSBlocksMultihash,
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksID, "=", qb.VarCol(s.IPFSBlocksID), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksUpdate", sgen.QueryKindExec,
			"UPDATE", s.IPFSBlocks, '\n',
			"SET", qb.ListColShort(
				s.IPFSBlocksData,
				s.IPFSBlocksSize,
			), "=", qb.List(), '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash), '\n',
			"AND", s.IPFSBlocksSize, "= -1",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksNewID", sgen.QueryKindSingle,
			"UPDATE sqlite_sequence", '\n',
			"SET seq = seq + 1", '\n',
			"WHERE name", "=", qb.Quote(string(s.IPFSBlocks)), '\n',
			"RETURNING", qb.Results(qb.ResultRaw("seq", "seq", sgen.TypeInt)),
		),
		qb.MakeQuery(s.Schema, "IPLDLinksInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.IPLDLinks, qb.ListColShort(
				s.IPLDLinksChild,
				s.IPLDLinksParent,
				s.IPLDLinksPath,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.IPLDLinksChild),
				qb.VarCol(s.IPLDLinksParent),
				qb.VarCol(s.IPLDLinksPath),
			),
		),
	)
	_ = ipfsBlocks

	permanodes = add(
		qb.MakeQuery(s.Schema, "PermanodesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Permanodes, qb.ListColShort(
				s.PermanodesType,
				s.PermanodesID,
				s.PermanodesCreateTime,
				s.PermanodesAccountID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.PermanodesType),
				qb.VarCol(s.PermanodesID),
				qb.VarCol(s.PermanodesCreateTime),
				qb.VarCol(s.PermanodesAccountID),
			),
		),
		qb.MakeQuery(s.Schema, "PermanodeOwnersGetOne", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.AccountsMultihash,
			), '\n',
			"FROM", s.Permanodes, '\n',
			"JOIN", s.Accounts, "ON", s.PermanodesAccountID, "=", s.AccountsID, '\n',
			"WHERE", s.PermanodesID, "=", qb.VarCol(s.PermanodesID), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "PermanodesListByType", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.PermanodesID,
				s.PermanodesAccountID,
				s.AccountsMultihash,
				qb.ResultColAlias(s.IPFSBlocksCodec, "permanode_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "permanode_multihash"),
				s.PermanodesCreateTime,
			), '\n',
			"FROM", s.Permanodes, '\n',
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.PermanodesID, '\n',
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.PermanodesAccountID,
			"WHERE", s.PermanodesType, "=", qb.VarCol(s.PermanodesType),
		),
	)
	_ = permanodes

	changes = add(
		qb.MakeQuery(s.Schema, "ChangesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Changes, qb.ListColShort(
				s.ChangesID,
				s.ChangesPermanodeID,
				s.ChangesAccountID,
				s.ChangesDeviceID,
				s.ChangesKind,
				s.ChangesStartTime,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ChangesID),
				qb.VarCol(s.ChangesPermanodeID),
				qb.VarCol(s.ChangesAccountID),
				qb.VarCol(s.ChangesDeviceID),
				qb.VarCol(s.ChangesKind),
				qb.VarCol(s.ChangesStartTime),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesGetOne", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.ChangesID,
				s.IPFSBlocksCodec,
				s.IPFSBlocksMultihash,
				s.ChangesPermanodeID,
				s.ChangesKind,
				s.ChangesStartTime,
				s.AccountsMultihash,
				s.DevicesMultihash,
				s.ChangesAccountID,
				s.ChangesDeviceID,
			), '\n',
			"FROM", s.Changes, '\n',
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.ChangesAccountID, '\n',
			"JOIN", s.Devices, "ON", s.DevicesID, "=", s.ChangesDeviceID, '\n',
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.ChangesPermanodeID, '\n',
			"WHERE", s.ChangesID, "=", qb.VarCol(s.ChangesID), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "ChangesGetParents", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ChangeDepsParent,
				s.ChangeDepsChild,
				s.IPFSBlocksCodec,
				s.IPFSBlocksMultihash,
			), '\n',
			"FROM", s.ChangeDeps, '\n',
			"LEFT OUTER JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.ChangeDepsParent, '\n',
			"WHERE", s.ChangeDepsChild, "=", qb.VarCol(s.ChangeDepsChild), '\n',
			"ORDER BY", s.IPFSBlocksMultihash,
		),
		qb.MakeQuery(s.Schema, "ChangesInsertParent", sgen.QueryKindExec,
			"INSERT INTO", s.ChangeDeps, qb.ListColShort(
				s.ChangeDepsChild,
				s.ChangeDepsParent,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ChangeDepsChild),
				qb.VarCol(s.ChangeDepsParent),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesDeleteByID", sgen.QueryKindExec,
			"DELETE FROM", s.Changes, '\n',
			"WHERE", s.ChangesID, "=", qb.VarCol(s.ChangesID),
		),
	)
	_ = changes
)

//go:generate gorun generateQueries
func generateQueries() error {
	code, err := sgen.CodegenQueries("vcssql", global...)

	if err != nil {
		return err
	}

	return ioutil.WriteFile("queries.gen.go", code, 0600)
}

var _ = generateQueries
