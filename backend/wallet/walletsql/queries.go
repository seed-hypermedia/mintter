package walletsql

import (
	"io/ioutil"
	"seed/backend/daemon/storage"
	"seed/backend/pkg/sqlitegen"
	"seed/backend/pkg/sqlitegen/qb"
)

var _ = generateQueries

const (
	// DefaultWalletKey is the column name of the meta table where the default wallet id is stored.
	DefaultWalletKey = "default_wallet"
)

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("walletsql",
		qb.MakeQuery(storage.Schema, "insertWallet", sqlitegen.QueryKindExec,
			qb.Insert(storage.WalletsID, storage.WalletsAddress, storage.WalletsType,
				storage.WalletsLogin, storage.WalletsPassword, storage.WalletsToken,
				storage.WalletsName, storage.WalletsBalance),
		),

		qb.MakeQuery(storage.Schema, "getWallet", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(storage.WalletsID),
				qb.ResultCol(storage.WalletsAddress),
				qb.ResultCol(storage.WalletsName),
				qb.ResultCol(storage.WalletsBalance),
				qb.ResultCol(storage.WalletsType),
			), qb.Line,
			"FROM", storage.Wallets,
			"WHERE", storage.WalletsID, "=", qb.VarCol(storage.WalletsID),
		),

		qb.MakeQuery(storage.Schema, "listWallets", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(storage.WalletsID),
				qb.ResultCol(storage.WalletsAddress),
				qb.ResultCol(storage.WalletsName),
				qb.ResultCol(storage.WalletsType),
				qb.ResultCol(storage.WalletsBalance),
			),
			"FROM", storage.Wallets,
			"WHERE", storage.WalletsID, ">", qb.Var("cursor", sqlitegen.TypeText),
			"LIMIT", qb.Var("limit", sqlitegen.TypeInt),
		),

		qb.MakeQuery(storage.Schema, "getDefaultWallet", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(storage.WalletsID),
				qb.ResultCol(storage.WalletsAddress),
				qb.ResultCol(storage.WalletsName),
				qb.ResultCol(storage.WalletsBalance),
				qb.ResultCol(storage.WalletsType),
			), qb.Line,
			"FROM", storage.Wallets, qb.Line,
			"WHERE", storage.WalletsID, "IN (SELECT", qb.Results(
				qb.ResultCol(storage.KVValue),
			), qb.Line,
			"FROM", storage.KV, qb.Line,
			"WHERE", storage.KVKey, "=", qb.Var("key", sqlitegen.TypeText), ")",
		),

		qb.MakeQuery(storage.Schema, "setDefaultWallet", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", storage.KV, qb.ListColShort(
				storage.KVKey,
				storage.KVValue,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(storage.KVKey),
				qb.VarCol(storage.KVValue),
			),
		),

		qb.MakeQuery(storage.Schema, "removeDefaultWallet", sqlitegen.QueryKindExec,
			"DELETE FROM", storage.KV,
			"WHERE", storage.KVKey, "=", qb.Var("key", sqlitegen.TypeText), "",
		),

		qb.MakeQuery(storage.Schema, "updateWalletName", sqlitegen.QueryKindExec,
			"UPDATE", storage.Wallets, "SET", qb.ListColShort(
				storage.WalletsName,
			), qb.Line,
			"=(", qb.VarCol(storage.WalletsName),
			") WHERE", storage.WalletsID, "=", qb.VarCol(storage.WalletsID),
		),

		qb.MakeQuery(storage.Schema, "removeWallet", sqlitegen.QueryKindExec,
			"DELETE FROM", storage.Wallets,
			"WHERE", storage.WalletsID, "=", qb.VarCol(storage.WalletsID),
		),

		qb.MakeQuery(storage.Schema, "getWalletCount", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultExpr(qb.SQLFunc("COUNT", storage.WalletsID.String()), "count", sqlitegen.TypeInt),
			),
			"FROM", storage.Wallets,
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
