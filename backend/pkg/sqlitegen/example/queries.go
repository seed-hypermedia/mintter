package example

import (
	"io/ioutil"
	"seed/backend/pkg/sqlitegen"
	"seed/backend/pkg/sqlitegen/example/schema"
	"seed/backend/pkg/sqlitegen/qb"
)

var _ = generateQueries

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("example",
		qb.MakeQuery(schema.Schema, "insertWallet", sqlitegen.QueryKindExec,
			qb.Insert(schema.WalletsID, schema.WalletsName),
		),

		qb.MakeQuery(schema.Schema, "getWallet", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(schema.WalletsID),
				qb.ResultCol(schema.WalletsName),
			), qb.Line,
			"FROM", schema.Wallets, qb.Line,
			"WHERE", schema.WalletsID, "=", qb.VarCol(schema.WalletsID),
		),

		qb.MakeQuery(schema.Schema, "listWallets", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(schema.WalletsID),
				qb.ResultCol(schema.WalletsName),
			),
			"FROM", schema.Wallets,
			"WHERE", schema.WalletsID, ">", qb.Var("cursor", sqlitegen.TypeText),
			"LIMIT", qb.Var("limit", sqlitegen.TypeInt),
		),

		qb.MakeQuery(schema.Schema, "insertUser", sqlitegen.QueryKindExec,
			qb.Insert(schema.UsersID, schema.UsersName, schema.UsersAvatar),
		),

		qb.MakeQuery(schema.Schema, "getUser", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(schema.UsersID),
				qb.ResultCol(schema.UsersName),
				qb.ResultCol(schema.UsersAvatar),
			), qb.Line,
			"FROM", schema.Users, qb.Line,
			"WHERE", schema.UsersID, "=", qb.VarCol(schema.UsersID),
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
