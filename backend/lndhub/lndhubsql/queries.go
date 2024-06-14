package lndhubsql

import (
	"io/ioutil"
	"seed/backend/daemon/storage"
	"seed/backend/pkg/sqlitegen"
	"seed/backend/pkg/sqlitegen/qb"
)

const (
	// LoginSignatureKey is the column name of the meta table where the login signatureis stored.
	LoginSignatureKey = "lndhub_login_signature"
)

var _ = generateQueries

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("lndhubsql",
		qb.MakeQuery(storage.Schema, "getApiURL", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(storage.WalletsAddress),
			),
			"FROM", storage.Wallets,
			"WHERE", storage.WalletsID, "=", qb.VarCol(storage.WalletsID),
		),
		qb.MakeQuery(storage.Schema, "getLogin", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(storage.WalletsLogin),
			),
			"FROM", storage.Wallets,
			"WHERE", storage.WalletsID, "=", qb.VarCol(storage.WalletsID),
		),
		qb.MakeQuery(storage.Schema, "getPassword", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(storage.WalletsPassword),
			),
			"FROM", storage.Wallets,
			"WHERE", storage.WalletsID, "=", qb.VarCol(storage.WalletsID),
		),
		qb.MakeQuery(storage.Schema, "getToken", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(storage.WalletsToken),
			),
			"FROM", storage.Wallets,
			"WHERE", storage.WalletsID, "=", qb.VarCol(storage.WalletsID),
		),
		qb.MakeQuery(storage.Schema, "setToken", sqlitegen.QueryKindExec,
			"UPDATE", storage.Wallets, "SET", qb.ListColShort(
				storage.WalletsToken,
			), qb.Line,
			"=(", qb.VarCol(storage.WalletsToken),
			") WHERE", storage.WalletsID, "=", qb.VarCol(storage.WalletsID),
		),
		qb.MakeQuery(storage.Schema, "setLoginSignature", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", storage.KV, qb.ListColShort(
				storage.KVKey,
				storage.KVValue,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(storage.KVKey),
				qb.VarCol(storage.KVValue),
			),
		),
		qb.MakeQuery(storage.Schema, "getLoginSignature", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(storage.KVValue),
			),
			"FROM", storage.KV,
			"WHERE", storage.KVKey, "=", qb.VarCol(storage.KVKey),
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
