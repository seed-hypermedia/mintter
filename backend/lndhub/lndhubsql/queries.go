package lndhubsql

import (
	"io/ioutil"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
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
	)
	if err != nil {
		return err
	}

	if err := ioutil.WriteFile("queries.gen.go", code, 0600); err != nil {
		return err
	}

	return nil
}
