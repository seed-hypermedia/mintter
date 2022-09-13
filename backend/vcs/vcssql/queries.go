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
		qb.MakeQuery(s.Schema, "AccountsIndexProfile", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Profiles, qb.ListColShort(
				s.ProfilesAccountID,
				s.ProfilesAlias,
				s.ProfilesEmail,
				s.ProfilesBio,
				s.ProfilesChangeID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ProfilesAccountID),
				qb.VarCol(s.ProfilesAlias),
				qb.VarCol(s.ProfilesEmail),
				qb.VarCol(s.ProfilesBio),
				qb.VarCol(s.ProfilesChangeID),
			),
		),
		qb.MakeQuery(s.Schema, "AccountsListProfiles", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ProfilesAccountID,
				s.ProfilesAlias,
				s.ProfilesEmail,
				s.ProfilesBio,
				s.ProfilesChangeID,
			), '\n',
			"FROM", s.Profiles, '\n',
		),
	)

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
			"AND", s.ContentLinksSourceBlockID, "=", qb.VarCol(s.ContentLinksSourceBlockID),
		),
	)

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

	namedVersions = add(
		qb.MakeQuery(s.Schema, "NamedVersionsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.NamedVersions, '\n',
			"WHERE", s.NamedVersionsObjectID, "=", qb.VarCol(s.NamedVersionsObjectID), '\n',
			"AND", s.NamedVersionsAccountID, "=", qb.VarCol(s.NamedVersionsAccountID), '\n',
			"AND", s.NamedVersionsDeviceID, "=", qb.VarCol(s.NamedVersionsDeviceID), '\n',
			"AND", s.NamedVersionsName, "=", qb.VarCol(s.NamedVersionsName),
		),
		qb.MakeQuery(s.Schema, "NamedVersionsReplace", sgen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.NamedVersions, qb.ListColShort(
				s.NamedVersionsObjectID,
				s.NamedVersionsAccountID,
				s.NamedVersionsDeviceID,
				s.NamedVersionsName,
				s.NamedVersionsVersion,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.NamedVersionsObjectID),
				qb.VarCol(s.NamedVersionsAccountID),
				qb.VarCol(s.NamedVersionsDeviceID),
				qb.VarCol(s.NamedVersionsName),
				qb.VarCol(s.NamedVersionsVersion),
			),
		),
		qb.MakeQuery(s.Schema, "NamedVersionsGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.NamedVersionsVersion,
			), '\n',
			"FROM", s.NamedVersions, '\n',
			"WHERE", s.NamedVersionsObjectID, "=", qb.VarCol(s.NamedVersionsObjectID), '\n',
			"AND", s.NamedVersionsAccountID, "=", qb.VarCol(s.NamedVersionsAccountID), '\n',
			"AND", s.NamedVersionsDeviceID, "=", qb.VarCol(s.NamedVersionsDeviceID), '\n',
			"AND", s.NamedVersionsName, "=", qb.VarCol(s.NamedVersionsName), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "NamedVersionsListByObjectOwner", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.AccountsMultihash,
				s.DevicesMultihash,
				s.NamedVersionsVersion,
				qb.ResultColAlias(s.IPFSBlocksCodec, "permanode_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "permanode_multihash"),
			), '\n',
			"FROM", s.NamedVersions, '\n',
			"INNER JOIN", s.PermanodeOwners, "ON", s.PermanodeOwnersPermanodeID, "=", s.NamedVersionsObjectID, '\n',
			"INNER JOIN", s.Devices, "ON", s.DevicesID, "=", s.NamedVersionsDeviceID, '\n',
			"INNER JOIN", s.Accounts, "ON", s.AccountsID, "=", s.NamedVersionsAccountID, '\n',
			"INNER JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.NamedVersionsObjectID, '\n',
			"WHERE", s.PermanodeOwnersAccountID, "=", qb.VarCol(s.PermanodeOwnersAccountID), '\n',
		),
		qb.MakeQuery(s.Schema, "NamedVersionsListAll", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.AccountsMultihash,
				s.DevicesMultihash,
				s.NamedVersionsVersion,
				s.NamedVersionsName,
				qb.ResultColAlias(s.IPFSBlocksCodec, "permanode_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "permanode_multihash"),
			), '\n',
			"FROM", s.NamedVersions, '\n',
			"INNER JOIN", s.Devices, "ON", s.DevicesID, "=", s.NamedVersionsDeviceID, '\n',
			"INNER JOIN", s.Accounts, "ON", s.AccountsID, "=", s.NamedVersionsAccountID, '\n',
			"INNER JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.NamedVersionsObjectID, '\n',
		),
	)

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
				s.IPFSBlocksPending,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.IPFSBlocksID),
				qb.VarCol(s.IPFSBlocksMultihash),
				qb.VarCol(s.IPFSBlocksCodec),
				qb.VarCol(s.IPFSBlocksData),
				qb.VarCol(s.IPFSBlocksSize),
				qb.VarCol(s.IPFSBlocksPending),
			),
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksUpsert", sgen.QueryKindSingle,
			"INSERT INTO", s.IPFSBlocks, qb.ListColShort(
				s.IPFSBlocksMultihash,
				s.IPFSBlocksCodec,
				s.IPFSBlocksData,
				s.IPFSBlocksSize,
				s.IPFSBlocksPending,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.IPFSBlocksMultihash),
				qb.VarCol(s.IPFSBlocksCodec),
				qb.VarCol(s.IPFSBlocksData),
				qb.VarCol(s.IPFSBlocksSize),
				qb.VarCol(s.IPFSBlocksPending),
			), '\n',
			// Update existing record if the existing one was pending, and we're inserting found content to make it non-pending.
			"ON CONFLICT", qb.ListColShort(s.IPFSBlocksMultihash), '\n',
			"DO UPDATE SET codec = excluded.codec, data = excluded.data, size = excluded.size, pending = excluded.pending", '\n',
			"WHERE pending = 1 AND excluded.pending = 0", '\n',
			"RETURNING", qb.Results(s.IPFSBlocksID),
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksListValid", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.IPFSBlocksID,
				s.IPFSBlocksMultihash,
				s.IPFSBlocksCodec,
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksPending, "=", "0",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksHas", sgen.QueryKindSingle,
			"SELECT", qb.Results(qb.ResultExpr("1", "has", sgen.TypeInt)), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash), '\n',
			"AND", s.IPFSBlocksPending, "=", "0",
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
			"AND", s.IPFSBlocksPending, "=", "0",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksGetSize", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.IPFSBlocksID,
				s.IPFSBlocksSize,
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
			"AND", s.IPFSBlocksPending, "=", "0",
		),
		qb.MakeQuery(s.Schema, "IPFSBlocksDelete", sgen.QueryKindExec,
			"DELETE FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
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
	)

	permanodes = add(
		qb.MakeQuery(s.Schema, "PermanodesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Permanodes, qb.ListColShort(
				s.PermanodesType,
				s.PermanodesID,
				s.PermanodesCreateTime,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.PermanodesType),
				qb.VarCol(s.PermanodesID),
				qb.VarCol(s.PermanodesCreateTime),
			),
		),
		qb.MakeQuery(s.Schema, "PermanodeOwnersInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.PermanodeOwners, qb.ListColShort(
				s.PermanodeOwnersAccountID,
				s.PermanodeOwnersPermanodeID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.PermanodeOwnersAccountID),
				qb.VarCol(s.PermanodeOwnersPermanodeID),
			),
		),
		qb.MakeQuery(s.Schema, "PermanodeOwnersGetOne", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.AccountsMultihash,
			), '\n',
			"FROM", s.PermanodeOwners, '\n',
			"JOIN", s.Accounts, "ON", s.PermanodeOwnersAccountID, "=", s.AccountsID, '\n',
			"WHERE", s.PermanodeOwnersPermanodeID, "=", qb.VarCol(s.PermanodeOwnersPermanodeID), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "PermanodesListWithVersionsByType", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.PermanodesID,
				s.PermanodeOwnersAccountID,
				s.AccountsMultihash,
				qb.ResultColAlias(s.IPFSBlocksCodec, "permanode_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "permanode_multihash"),
				s.PermanodesCreateTime,
			), '\n',
			"FROM", s.Permanodes, '\n',
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.PermanodesID, '\n',
			"JOIN", s.PermanodeOwners, "ON", s.PermanodeOwnersPermanodeID, "=", s.PermanodesID, '\n',
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.PermanodeOwnersAccountID, '\n',
			"WHERE", s.PermanodesType, "=", qb.VarCol(s.PermanodesType), '\n',
			"AND", s.PermanodesID, "IN", qb.SubQuery(
				"SELECT DISTINCT", s.NamedVersionsObjectID,
				"FROM", s.NamedVersions,
			),
		),
		qb.MakeQuery(s.Schema, "PermanodesListByType", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.PermanodesID,
				s.PermanodeOwnersAccountID,
				s.AccountsMultihash,
				qb.ResultColAlias(s.IPFSBlocksCodec, "permanode_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "permanode_multihash"),
				s.PermanodesCreateTime,
			), '\n',
			"FROM", s.Permanodes, '\n',
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.PermanodesID, '\n',
			"JOIN", s.PermanodeOwners, "ON", s.PermanodeOwnersPermanodeID, "=", s.PermanodesID,
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.PermanodeOwnersAccountID,
			"WHERE", s.PermanodesType, "=", qb.VarCol(s.PermanodesType),
		),
	)

	changes = add(
		qb.MakeQuery(s.Schema, "ChangesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Changes, qb.ListColShort(
				s.ChangesID,
				s.ChangesPermanodeID,
				s.ChangesKind,
				s.ChangesLamportTime,
				s.ChangesCreateTime,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ChangesID),
				qb.VarCol(s.ChangesPermanodeID),
				qb.VarCol(s.ChangesKind),
				qb.VarCol(s.ChangesLamportTime),
				qb.VarCol(s.ChangesCreateTime),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesGetBase", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultExpr(qb.SQLFunc("COUNT", "id"), "count", sgen.TypeInt),
				qb.ResultExpr(qb.SQLFunc("MAX", s.ChangesLamportTime.ShortName()), "max_clock", sgen.TypeInt),
			), '\n',
			"FROM", s.Changes, '\n',
			"WHERE", s.ChangesID, "IN", qb.SubQuery(
				"SELECT value FROM json_each(", qb.Var("jsonHeads", sgen.TypeText), ")",
			), '\n',
			"AND", s.ChangesPermanodeID, "=", qb.VarCol(s.ChangesPermanodeID),
		),
		qb.MakeQuery(s.Schema, "ChangesGetWithAuthors", sgen.QueryKindMany,
			"SELECT", qb.Results(
				s.ChangesID,
				s.IPFSBlocksCodec,
				s.IPFSBlocksMultihash,
				s.ChangesPermanodeID,
				s.ChangesKind,
				s.ChangesLamportTime,
				s.ChangesCreateTime,
				s.AccountsMultihash,
				s.DevicesMultihash,
				s.ChangeAuthorsAccountID,
				s.ChangeAuthorsDeviceID,
			), '\n',
			"FROM", s.Changes, '\n',
			"JOIN", s.ChangeAuthors, "ON", s.ChangeAuthorsChangeID, "=", s.ChangesID, '\n',
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.ChangeAuthorsAccountID, '\n',
			"JOIN", s.Devices, "ON", s.DevicesID, "=", s.ChangeAuthorsDeviceID, '\n',
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.ChangesPermanodeID, '\n',
			"WHERE", s.ChangesID, "=", qb.VarCol(s.ChangesID),
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
		qb.MakeQuery(s.Schema, "ChangeAuthorsInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.ChangeAuthors, qb.ListColShort(
				s.ChangeAuthorsChangeID,
				s.ChangeAuthorsAccountID,
				s.ChangeAuthorsDeviceID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ChangeAuthorsChangeID),
				qb.VarCol(s.ChangeAuthorsAccountID),
				qb.VarCol(s.ChangeAuthorsDeviceID),
			),
		),
		qb.MakeQuery(s.Schema, "ChangesAllocateID", sgen.QueryKindSingle,
			"UPDATE sqlite_sequence", '\n',
			"SET seq = seq + 1", '\n',
			"WHERE name", "=", qb.Quote(string(s.IPFSBlocks)), '\n',
			"RETURNING", qb.Results(qb.ResultRaw("seq", "seq", sgen.TypeInt)),
		),
		qb.MakeQuery(s.Schema, "ChangesDeleteByID", sgen.QueryKindExec,
			"DELETE FROM", s.Changes, '\n',
			"WHERE", s.ChangesID, "=", qb.VarCol(s.ChangesID),
		),
	)

	datoms = add(
		qb.MakeQuery(s.Schema, "DatomsAttrInsert", sgen.QueryKindSingle,
			"INSERT INTO", s.DatomAttrs, qb.ListColShort(
				s.DatomAttrsAttr,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.DatomAttrsAttr),
			), '\n',
			"RETURNING", qb.Results(
				s.DatomAttrsID,
			),
		),
		qb.MakeQuery(s.Schema, "DatomsAttrLookup", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				s.DatomAttrsID,
			), '\n',
			"FROM", s.DatomAttrs, '\n',
			"WHERE", s.DatomAttrsAttr, "=", qb.VarCol(s.DatomAttrsAttr),
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "DatomsMaxSeq", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultExpr(qb.SQLFunc("MAX", s.DatomsSeq.String()), "max", sgen.TypeInt),
			), '\n',
			"FROM", s.Datoms, '\n',
			"WHERE", s.DatomsPermanode, "=", qb.VarCol(s.DatomsPermanode), '\n',
			"AND", s.DatomsChange, "=", qb.VarCol(s.DatomsChange), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "DatomsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Datoms, '\n',
			"WHERE", s.DatomsPermanode, "=", qb.VarCol(s.DatomsPermanode), '\n',
			"AND", s.DatomsEntity, "=", qb.VarCol(s.DatomsEntity), '\n',
			"AND", s.DatomsChange, "=", qb.VarCol(s.DatomsChange), '\n',
			"AND", s.DatomsAttr, "=", qb.VarCol(s.DatomsAttr),
		),
	)
)

//go:generate gorun generateQueries
func generateQueries() error {
	code, err := sgen.CodegenQueries("vcssql", global...)

	if err != nil {
		return err
	}

	return ioutil.WriteFile("queries.gen.go", code, 0600)
}
