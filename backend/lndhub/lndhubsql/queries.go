package lndhubsql

import (
	"io/ioutil"
	"mintter/backend/daemon/storage"
	"mintter/backend/pkg/sqlitegen"
	"mintter/backend/pkg/sqlitegen/qb"
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
			"INSERT OR REPLACE INTO", storage.GlobalMeta, qb.ListColShort(
				storage.GlobalMetaKey,
				storage.GlobalMetaValue,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(storage.GlobalMetaKey),
				qb.VarCol(storage.GlobalMetaValue),
			),
		),
		qb.MakeQuery(storage.Schema, "getLoginSignature", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(storage.GlobalMetaValue),
			),
			"FROM", storage.GlobalMeta,
			"WHERE", storage.GlobalMetaKey, "=", qb.VarCol(storage.GlobalMetaKey),
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
