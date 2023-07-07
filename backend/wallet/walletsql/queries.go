package walletsql

import (
	"io/ioutil"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/pkg/sqlitegen"
	"mintter/backend/pkg/sqlitegen/qb"
)

var _ = generateQueries

const (
	// DefaultWalletKey is the column name of the meta table where the default wallet id is stored.
	DefaultWalletKey = "default_wallet"
)

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("walletsql",
		qb.MakeQuery(sqliteschema.Schema, "insertWallet", sqlitegen.QueryKindExec,
			qb.Insert(sqliteschema.WalletsID, sqliteschema.WalletsAddress, sqliteschema.WalletsType,
				sqliteschema.WalletsLogin, sqliteschema.WalletsPassword, sqliteschema.WalletsToken,
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
				qb.ResultCol(sqliteschema.WalletsBalance),
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
			"INSERT OR REPLACE INTO", sqliteschema.GlobalMeta, qb.ListColShort(
				sqliteschema.GlobalMetaKey,
				sqliteschema.GlobalMetaValue,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(sqliteschema.GlobalMetaKey),
				qb.VarCol(sqliteschema.GlobalMetaValue),
			),
		),

		qb.MakeQuery(sqliteschema.Schema, "removeDefaultWallet", sqlitegen.QueryKindExec,
			"DELETE FROM", sqliteschema.GlobalMeta,
			"WHERE", sqliteschema.GlobalMetaKey, "=", qb.Var("key", sqlitegen.TypeText), "",
		),

		qb.MakeQuery(sqliteschema.Schema, "updateWalletName", sqlitegen.QueryKindExec,
			"UPDATE", sqliteschema.Wallets, "SET", qb.ListColShort(
				sqliteschema.WalletsName,
			), qb.Line,
			"=(", qb.VarCol(sqliteschema.WalletsName),
			") WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
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
	)
	if err != nil {
		return err
	}

	if err := ioutil.WriteFile("queries.gen.go", code, 0600); err != nil {
		return err
	}

	return nil
}
