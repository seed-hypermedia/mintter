// Package vcssql provide SQL queries for vcs package.
// It must not be used outside of vcs, but it can't be internal package
// because otherwise code generation with gorun wouldn't work.
package vcssql

import (
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
	workingCopy = add(
		qb.MakeQuery(s.Schema, "WorkingCopyReplace", sgen.QueryKindExec,
			"INSERT OR REPLACE INTO", s.WorkingCopy, qb.ListColShort(
				s.WorkingCopyObjectID,
				s.WorkingCopyName,
				s.WorkingCopyVersion,
				s.WorkingCopyData,
				s.WorkingCopyCreateTime,
				s.WorkingCopyUpdateTime,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.WorkingCopyObjectID),
				qb.VarCol(s.WorkingCopyName),
				qb.VarCol(s.WorkingCopyVersion),
				qb.VarCol(s.WorkingCopyData),
				qb.VarCol(s.WorkingCopyCreateTime),
				qb.VarCol(s.WorkingCopyUpdateTime),
			),
		),
		qb.MakeQuery(s.Schema, "WorkingCopyGet", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.WorkingCopyData),
				qb.ResultCol(s.WorkingCopyCreateTime),
				qb.ResultCol(s.WorkingCopyUpdateTime),
				qb.ResultCol(s.WorkingCopyVersion),
			), '\n',
			"FROM", s.WorkingCopy, '\n',
			"WHERE", s.WorkingCopyObjectID, "=", qb.VarCol(s.WorkingCopyObjectID), '\n',
			"AND", s.WorkingCopyName, "=", qb.VarCol(s.WorkingCopyName), '\n',
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "WorkingCopyDelete", sgen.QueryKindExec,
			"DELETE FROM", s.WorkingCopy, '\n',
			"WHERE", s.WorkingCopyObjectID, "=", qb.VarCol(s.WorkingCopyObjectID), '\n',
			"AND", s.WorkingCopyName, "=", qb.VarCol(s.WorkingCopyName),
		),
	)

	accounts = add(
		qb.MakeQuery(s.Schema, "AccountsLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.AccountsID),
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
			"RETURNING", qb.Results(qb.ResultCol(s.AccountsID)),
		),
		qb.MakeQuery(s.Schema, "AccountsGetForDevice", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.AccountsID),
				qb.ResultCol(s.AccountsMultihash),
			), '\n',
			"FROM", s.Accounts, '\n',
			"JOIN", s.AccountDevices, "ON", s.AccountDevicesAccountID, "=", s.AccountsID, '\n',
			"WHERE", s.AccountDevicesDeviceID, "=", qb.LookupSubQuery(s.DevicesID, s.Devices,
				"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
			),
		),
		qb.MakeQuery(s.Schema, "AccountsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.AccountsID),
				qb.ResultCol(s.AccountsMultihash),
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
				qb.ResultCol(s.ProfilesAccountID),
				qb.ResultCol(s.ProfilesAlias),
				qb.ResultCol(s.ProfilesEmail),
				qb.ResultCol(s.ProfilesBio),
				qb.ResultCol(s.ProfilesChangeID),
			), '\n',
			"FROM", s.Profiles, '\n',
		),
	)

	documents = add(
		qb.MakeQuery(s.Schema, "DocumentsIndex", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Documents, qb.ListColShort(
				s.DocumentsID,
				s.DocumentsTitle,
				s.DocumentsSubtitle,
				s.DocumentsChangeID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.DocumentsID),
				qb.VarCol(s.DocumentsTitle),
				qb.VarCol(s.DocumentsSubtitle),
				qb.VarCol(s.DocumentsChangeID),
			),
		),
		qb.MakeQuery(s.Schema, "DocumentsListIndexed", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.DocumentsID),
				qb.ResultCol(s.DocumentsTitle),
				qb.ResultCol(s.DocumentsSubtitle),
				qb.ResultCol(s.DocumentsChangeID),
				qb.ResultColAlias(s.IPFSBlocksData, "change_data"),
			), '\n',
			"FROM", s.Documents, '\n',
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.DocumentsChangeID, '\n',
		),
	)

	devices = add(
		qb.MakeQuery(s.Schema, "DevicesLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.DevicesID),
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
			"RETURNING", qb.Results(qb.ResultCol(s.DevicesID)),
		),
		qb.MakeQuery(s.Schema, "AccountDevicesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.AccountDevices, qb.ListColShort(
				s.AccountDevicesAccountID,
				s.AccountDevicesDeviceID,
				s.AccountDevicesChangeID,
			), "VALUES", qb.List(
				qb.VarCol(s.AccountDevicesAccountID),
				qb.VarCol(s.AccountDevicesDeviceID),
				qb.VarCol(s.AccountDevicesChangeID),
			),
		),
		qb.MakeQuery(s.Schema, "AccountDevicesList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.DevicesMultihash),
				qb.ResultCol(s.AccountsMultihash),
			), '\n',
			"FROM", s.AccountDevices, '\n',
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.AccountDevicesAccountID,
			"JOIN", s.Devices, "ON", s.DevicesID, "=", s.AccountDevicesDeviceID,
		),
		qb.MakeQuery(s.Schema, "DevicesList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.DevicesMultihash),
				qb.ResultCol(s.AccountDevicesDeviceID),
				qb.ResultCol(s.AccountDevicesAccountID),
			), '\n',
			"FROM", s.AccountDevices, '\n',
			"JOIN", s.Devices, "ON", s.DevicesID, "=", s.AccountDevicesDeviceID,
		),
	)

	namedVersions = add(
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
				qb.ResultCol(s.NamedVersionsVersion),
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
				qb.ResultCol(s.AccountsMultihash),
				qb.ResultCol(s.DevicesMultihash),
				qb.ResultCol(s.NamedVersionsVersion),
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
	)

	/*
		with my_permanodes as (
			select id from permanodes where account_id = ?
		),


		select
		from permanode_owners
		inner join named_versions on named_versions.object_id = permanode_owners.permanode_id
		inner join devices on devices.id = named_versions
		where permanode_owners.account_id = ?
		select * from named_versions
		inner join permanode_owners
		on permanode_owners.permanode_id = named_versions.object_id
		and permanode_owners.account_it = ?


		select * from named_versions
		where object_id in (
			select id from permanodes
			where account_id = ?
		)

	*/

	ipfsBlocks = add(
		qb.MakeQuery(s.Schema, "IPFSBlocksLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.IPFSBlocksID),
			), '\n',
			"FROM", s.IPFSBlocks, '\n',
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash), '\n',
		),
	)

	drafts = add(
		qb.MakeQuery(s.Schema, "DraftsInsert", sgen.QueryKindExec,
			"INSERT INTO", s.Drafts, qb.ListColShort(
				s.DraftsID,
				s.DraftsTitle,
				s.DraftsSubtitle,
				s.DraftsCreateTime,
				s.DraftsUpdateTime,
			), '\n',
			"VALUES", qb.List(
				qb.LookupSubQuery(s.IPFSBlocksID, s.IPFSBlocks,
					"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
				),
				qb.VarCol(s.DraftsTitle),
				qb.VarCol(s.DraftsSubtitle),
				qb.VarCol(s.DraftsCreateTime),
				qb.VarCol(s.DraftsUpdateTime),
			),
		),
		qb.MakeQuery(s.Schema, "DraftsUpdate", sgen.QueryKindExec,
			"UPDATE", s.Drafts, '\n',
			"SET", qb.ListColShort(
				s.DraftsTitle,
				s.DraftsSubtitle,
				s.DraftsUpdateTime,
			), "=", qb.List(
				qb.VarCol(s.DraftsTitle),
				qb.VarCol(s.DraftsSubtitle),
				qb.VarCol(s.DraftsUpdateTime),
			), '\n',
			"WHERE", s.DraftsID, "=", qb.LookupSubQuery(s.IPFSBlocksID, s.IPFSBlocks,
				"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
			),
		),
		qb.MakeQuery(s.Schema, "DraftsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.IPFSBlocksMultihash),
				qb.ResultCol(s.IPFSBlocksCodec),
				qb.ResultCol(s.DraftsTitle),
				qb.ResultCol(s.DraftsSubtitle),
				qb.ResultCol(s.DraftsCreateTime),
				qb.ResultCol(s.DraftsUpdateTime),
			), '\n',
			"FROM", s.Drafts, '\n',
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.DraftsID, '\n',
		),
		qb.MakeQuery(s.Schema, "DraftsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Drafts, '\n',
			"WHERE", s.DraftsID, "=", qb.LookupSubQuery(s.IPFSBlocksID, s.IPFSBlocks,
				"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
			),
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
		qb.MakeQuery(s.Schema, "PermanodesListPublications", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.PermanodesID),
				qb.ResultCol(s.PermanodeOwnersAccountID),
				qb.ResultCol(s.AccountsMultihash),
				qb.ResultColAlias(s.IPFSBlocksCodec, "permanode_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "permanode_multihash"),
				qb.ResultCol(s.PermanodesCreateTime),
			), '\n',
			"FROM", s.Permanodes, '\n',
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.PermanodesID, '\n',
			"JOIN", s.PermanodeOwners, "ON", s.PermanodeOwnersPermanodeID, "=", s.PermanodesID, '\n',
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.PermanodeOwnersAccountID, '\n',
			"WHERE", s.PermanodesID, "IN", qb.SubQuery(
				"SELECT DISTINCT", s.NamedVersionsObjectID,
				"FROM", s.NamedVersions,
			),
		),
		qb.MakeQuery(s.Schema, "PermanodesListByType", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.PermanodesID),
				qb.ResultCol(s.PermanodeOwnersAccountID),
				qb.ResultCol(s.AccountsMultihash),
				qb.ResultColAlias(s.IPFSBlocksCodec, "permanode_codec"),
				qb.ResultColAlias(s.IPFSBlocksMultihash, "permanode_multihash"),
				qb.ResultCol(s.PermanodesCreateTime),
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
		qb.MakeQuery(s.Schema, "ChangeAuthorsInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.ChangeAuthors, qb.ListColShort(
				s.ChangeAuthorsAccountID,
				s.ChangeAuthorsChangeID,
			), '\n',
			"VALUES", qb.List(
				qb.VarCol(s.ChangeAuthorsAccountID),
				qb.VarCol(s.ChangeAuthorsChangeID),
			),
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
