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
			), qb.Line,
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
			), qb.Line,
			"FROM", s.WorkingCopy, qb.Line,
			"WHERE", s.WorkingCopyObjectID, "=", qb.VarCol(s.WorkingCopyObjectID), qb.Line,
			"AND", s.WorkingCopyName, "=", qb.VarCol(s.WorkingCopyName), qb.Line,
			"LIMIT 1",
		),
		qb.MakeQuery(s.Schema, "WorkingCopyDelete", sgen.QueryKindExec,
			"DELETE FROM", s.WorkingCopy, qb.Line,
			"WHERE", s.WorkingCopyObjectID, "=", qb.VarCol(s.WorkingCopyObjectID), qb.Line,
			"AND", s.WorkingCopyName, "=", qb.VarCol(s.WorkingCopyName),
		),
	)

	accounts = add(
		qb.MakeQuery(s.Schema, "AccountsLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.AccountsID),
			), qb.Line,
			"FROM", s.Accounts, qb.Line,
			"WHERE", s.AccountsMultihash, "=", qb.VarCol(s.AccountsMultihash),
		),
		qb.MakeQuery(s.Schema, "AccountsInsertPK", sgen.QueryKindSingle,
			"INSERT INTO", s.Accounts, qb.ListColShort(
				s.AccountsMultihash,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(s.AccountsMultihash),
			),
			"RETURNING", qb.Results(qb.ResultCol(s.AccountsID)),
		),
		qb.MakeQuery(s.Schema, "AccountsGetForDevice", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.AccountsID),
				qb.ResultCol(s.AccountsMultihash),
			), qb.Line,
			"FROM", s.Accounts, qb.Line,
			"JOIN", s.AccountDevices, "ON", s.AccountDevicesAccountID, "=", s.AccountsID, qb.Line,
			"WHERE", s.AccountDevicesDeviceID, "=", qb.LookupSubQuery(s.DevicesID, s.Devices,
				"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
			),
		),
		qb.MakeQuery(s.Schema, "AccountsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.AccountsMultihash),
			), qb.Line,
			"FROM", s.Accounts, qb.Line,
			"WHERE", s.AccountsMultihash, "!=", qb.Var("ownAccountMultihash", sgen.TypeBytes),
		),
	)

	devices = add(
		qb.MakeQuery(s.Schema, "DevicesLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.DevicesID),
			), qb.Line,
			"FROM", s.Devices, qb.Line,
			"WHERE", s.DevicesMultihash, "=", qb.VarCol(s.DevicesMultihash),
		),
		qb.MakeQuery(s.Schema, "DevicesInsertPK", sgen.QueryKindSingle,
			"INSERT INTO", s.Devices, qb.ListColShort(
				s.DevicesMultihash,
			), qb.Line,
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
			), qb.Line,
			"FROM", s.AccountDevices, qb.Line,
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.AccountDevicesAccountID,
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
			), qb.Line,
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
			), qb.Line,
			"FROM", s.NamedVersions, qb.Line,
			"WHERE", s.NamedVersionsObjectID, "=", qb.VarCol(s.NamedVersionsObjectID), qb.Line,
			"AND", s.NamedVersionsAccountID, "=", qb.VarCol(s.NamedVersionsAccountID), qb.Line,
			"AND", s.NamedVersionsDeviceID, "=", qb.VarCol(s.NamedVersionsDeviceID), qb.Line,
			"AND", s.NamedVersionsName, "=", qb.VarCol(s.NamedVersionsName), qb.Line,
			"LIMIT 1",
		),
	)

	ipfsBlocks = add(
		qb.MakeQuery(s.Schema, "IPFSBlocksLookupPK", sgen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(s.IPFSBlocksID),
			), qb.Line,
			"FROM", s.IPFSBlocks, qb.Line,
			"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash), qb.Line,
			"AND", s.IPFSBlocksCodec, "=", qb.VarCol(s.IPFSBlocksCodec), qb.Line,
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
			), qb.Line,
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
			"UPDATE", s.Drafts, qb.Line,
			"SET", qb.ListColShort(
				s.DraftsTitle,
				s.DraftsSubtitle,
				s.DraftsUpdateTime,
			), "=", qb.List(
				qb.VarCol(s.DraftsTitle),
				qb.VarCol(s.DraftsSubtitle),
				qb.VarCol(s.DraftsUpdateTime),
			), qb.Line,
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
			), qb.Line,
			"FROM", s.Drafts, qb.Line,
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.DraftsID, qb.Line,
		),
		qb.MakeQuery(s.Schema, "DraftsDelete", sgen.QueryKindExec,
			"DELETE FROM", s.Drafts, qb.Line,
			"WHERE", s.DraftsID, "=", qb.LookupSubQuery(s.IPFSBlocksID, s.IPFSBlocks,
				"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
			),
		),
	)

	publications = add(
		qb.MakeQuery(s.Schema, "PublicationsUpsert", sgen.QueryKindExec,
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
				qb.LookupSubQuery(s.IPFSBlocksID, s.IPFSBlocks,
					"WHERE", s.IPFSBlocksMultihash, "=", qb.VarCol(s.IPFSBlocksMultihash),
				),
				qb.VarCol(s.PublicationsTitle),
				qb.VarCol(s.PublicationsSubtitle),
				qb.VarCol(s.PublicationsCreateTime),
				qb.VarCol(s.PublicationsUpdateTime),
				qb.VarCol(s.PublicationsPublishTime),
				qb.VarCol(s.PublicationsLatestVersion),
			),
		),
		qb.MakeQuery(s.Schema, "PublicationsList", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.IPFSBlocksCodec),
				qb.ResultCol(s.IPFSBlocksMultihash),
				qb.ResultCol(s.AccountsMultihash),
				qb.ResultCol(s.PublicationsTitle),
				qb.ResultCol(s.PublicationsSubtitle),
				qb.ResultCol(s.PublicationsCreateTime),
				qb.ResultCol(s.PublicationsUpdateTime),
				qb.ResultCol(s.PublicationsPublishTime),
				qb.ResultCol(s.PublicationsLatestVersion),
			), qb.Line,
			"FROM", s.Publications, qb.Line,
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.PublicationsID, qb.Line,
			"JOIN", s.PermanodeOwners, "ON", s.PermanodeOwnersPermanodeID, "=", s.IPFSBlocksID,
			"JOIN", s.Accounts, "ON", s.AccountsID, "=", s.PermanodeOwnersAccountID,
		),
	)

	permanodes = add(
		qb.MakeQuery(s.Schema, "PermanodesInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.Permanodes, qb.ListColShort(
				s.PermanodesType,
				s.PermanodesID,
				s.PermanodesCreateTime,
			), qb.Line,
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
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(s.PermanodeOwnersAccountID),
				qb.VarCol(s.PermanodeOwnersPermanodeID),
			),
		),
	)

	index = add(
		qb.MakeQuery(s.Schema, "ObjectIndexInsertOrIgnore", sgen.QueryKindExec,
			"INSERT OR IGNORE INTO", s.ObjectIndex, qb.ListColShort(
				s.ObjectIndexObjectID,
				s.ObjectIndexAttribute,
				s.ObjectIndexChangeID,
				s.ObjectIndexValue,
			),
			"VALUES", qb.List(
				qb.VarCol(s.ObjectIndexObjectID),
				qb.VarCol(s.ObjectIndexAttribute),
				qb.VarCol(s.ObjectIndexChangeID),
				qb.VarCol(s.ObjectIndexValue),
			),
		),

		qb.MakeQuery(s.Schema, "ObjectIndexListMaxAttrs", sgen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(s.IPFSBlocksMultihash),
				qb.ResultCol(s.ObjectIndexObjectID),
				qb.ResultCol(s.ObjectIndexAttribute),
				qb.ResultCol(s.ObjectIndexValue),
				// TODO: need to use logical clock here to properly resolve possible conflicts for versioning.
				qb.ResultExpr(qb.SQLFunc("MAX", string(s.ObjectIndexChangeID)), "version", sgen.TypeInt),
			),
			"FROM", s.ObjectIndex, qb.Line,
			"JOIN", s.Permanodes, "ON", s.PermanodesID, "=", s.ObjectIndexObjectID, qb.Line,
			"JOIN", s.IPFSBlocks, "ON", s.IPFSBlocksID, "=", s.PermanodesID, qb.Line,
			"WHERE", s.PermanodesType, "=", qb.VarCol(s.PermanodesType),
			"GROUP BY", s.ObjectIndexAttribute,
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
