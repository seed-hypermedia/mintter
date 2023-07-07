package lndhubsql

import (
	"io/ioutil"
	"mintter/backend/db/sqliteschema"
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
		qb.MakeQuery(sqliteschema.Schema, "getApiURL", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WalletsAddress),
			),
			"FROM", sqliteschema.Wallets,
			"WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),
		qb.MakeQuery(sqliteschema.Schema, "getLogin", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WalletsLogin),
			),
			"FROM", sqliteschema.Wallets,
			"WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),
		qb.MakeQuery(sqliteschema.Schema, "getPassword", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WalletsPassword),
			),
			"FROM", sqliteschema.Wallets,
			"WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),
		qb.MakeQuery(sqliteschema.Schema, "getToken", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.WalletsToken),
			),
			"FROM", sqliteschema.Wallets,
			"WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),
		qb.MakeQuery(sqliteschema.Schema, "setToken", sqlitegen.QueryKindExec,
			"UPDATE", sqliteschema.Wallets, "SET", qb.ListColShort(
				sqliteschema.WalletsToken,
			), qb.Line,
			"=(", qb.VarCol(sqliteschema.WalletsToken),
			") WHERE", sqliteschema.WalletsID, "=", qb.VarCol(sqliteschema.WalletsID),
		),
		qb.MakeQuery(sqliteschema.Schema, "setLoginSignature", sqlitegen.QueryKindExec,
			"INSERT OR REPLACE INTO", sqliteschema.GlobalMeta, qb.ListColShort(
				sqliteschema.GlobalMetaKey,
				sqliteschema.GlobalMetaValue,
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(sqliteschema.GlobalMetaKey),
				qb.VarCol(sqliteschema.GlobalMetaValue),
			),
		),
		qb.MakeQuery(sqliteschema.Schema, "getLoginSignature", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(sqliteschema.GlobalMetaValue),
			),
			"FROM", sqliteschema.GlobalMeta,
			"WHERE", sqliteschema.GlobalMetaKey, "=", qb.VarCol(sqliteschema.GlobalMetaKey),
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
