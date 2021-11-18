package wallet

import (
	"io/ioutil"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
)

var _ = generateQueries

const (
	DefaultWalletKey = "default_wallet"
)

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("wallet",
		qb.MakeQuery(sqliteschema.Schema, "insertWallet", sqlitegen.QueryKindExec,
			qb.Insert(sqliteschema.WalletsID, sqliteschema.WalletsAddress, sqliteschema.WalletsType, sqliteschema.WalletsAuth,
				sqliteschema.WalletsName, sqliteschema.WalletsBalance),
		),

		qb.MakeQuery(sqliteschema.Schema, "getWallet", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WalletsID),
				qb.ResultCol(sqliteschema.WalletsAddress),
				qb.ResultCol(sqliteschema.WalletsName),
				qb.ResultCol(sqliteschema.WalletsBalance),
				qb.ResultCol(sqliteschema.WalletsType),
			), qb.Line,
			"FROM", sqliteschema.Wallets,
			"WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),

		qb.MakeQuery(sqliteschema.Schema, "listWallets", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WalletsID),
				qb.ResultCol(sqliteschema.WalletsAddress),
				qb.ResultCol(sqliteschema.WalletsName),
				qb.ResultCol(sqliteschema.WalletsType),
			),
			"FROM", sqliteschema.Wallets,
			"WHERE", sqliteschema.WalletsID, ">", qb.Var("cursor", sqlitegen.TypeText),
			"LIMIT", qb.Var("limit", sqlitegen.TypeInt),
		),

		qb.MakeQuery(sqliteschema.Schema, "getDefaultWallet", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WalletsID),
				qb.ResultCol(sqliteschema.WalletsAddress),
				qb.ResultCol(sqliteschema.WalletsName),
				qb.ResultCol(sqliteschema.WalletsBalance),
				qb.ResultCol(sqliteschema.WalletsType),
			), qb.Line,
			"FROM", sqliteschema.Wallets, qb.Line,
			"WHERE", sqliteschema.WalletsID, "IN (SELECT", qb.Results(
				qb.ResultCol(sqliteschema.GlobalMetaValue),
			), qb.Line,
			"FROM", sqliteschema.GlobalMeta, qb.Line,
			"WHERE", sqliteschema.GlobalMetaKey, "=", qb.Var("key", sqlitegen.TypeText), ")",
		),

		qb.MakeQuery(sqliteschema.Schema, "setDefaultWallet", sqlitegen.QueryKindExec,
			qb.InsertOrReplace(sqliteschema.GlobalMetaKey, sqliteschema.GlobalMetaValue),
		),

		qb.MakeQuery(sqliteschema.Schema, "removeDefaultWallet", sqlitegen.QueryKindExec,
			"DELETE FROM", sqliteschema.GlobalMeta,
			"WHERE", sqliteschema.GlobalMetaKey, "=", qb.Var("key", sqlitegen.TypeText), "",
		),

		qb.MakeQuery(sqliteschema.Schema, "updateWalletName", sqlitegen.QueryKindExec,
			"UPDATE", sqliteschema.Wallets, qb.Line,
			"SET", sqliteschema.WalletsName, "=", qb.VarCol(sqliteschema.WalletsName), qb.Line,
			"WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),

		qb.MakeQuery(sqliteschema.Schema, "removeWallet", sqlitegen.QueryKindExec,
			"DELETE FROM", sqliteschema.Wallets,
			"WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),

		qb.MakeQuery(sqliteschema.Schema, "getWalletCount", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultExpr(qb.SQLFunc("COUNT", sqliteschema.WalletsID.String()), "count", sqlitegen.TypeInt),
			),
			"FROM", sqliteschema.Wallets,
		),
		qb.MakeQuery(sqliteschema.Schema, "getWalletAuth", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WalletsAuth),
			),
			"FROM", sqliteschema.Wallets,
			"WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),
	)
	if err != nil {
		return err
	}

	if err := ioutil.WriteFile("queries.gen.go", code, 0666); err != nil {
		return err
	}

	return nil
}
