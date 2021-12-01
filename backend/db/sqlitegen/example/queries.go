package example

import (
	"io/ioutil"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
)

var _ = generateQueries

//go:generate gorun -tags codegen generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("example",
		qb.MakeQuery(Schema, "insertWallet", sqlitegen.QueryKindExec,
			qb.Insert(WalletsID, WalletsName),
		),

		qb.MakeQuery(Schema, "getWallet", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(WalletsID),
				qb.ResultCol(WalletsName),
			), qb.Line,
			"FROM", Wallets, qb.Line,
			"WHERE", WalletsID, "=", qb.VarCol(WalletsID),
		),

		qb.MakeQuery(Schema, "listWallets", sqlitegen.QueryKindMany,
			"SELECT", qb.Results(
				qb.ResultCol(WalletsID),
				qb.ResultCol(WalletsName),
			),
			"FROM", Wallets,
			"WHERE", WalletsID, ">", qb.Var("cursor", sqlitegen.TypeText),
			"LIMIT", qb.Var("limit", sqlitegen.TypeInt),
		),

		qb.MakeQuery(Schema, "insertUser", sqlitegen.QueryKindExec,
			qb.Insert(UsersID, UsersName, UsersAvatar),
		),

		qb.MakeQuery(Schema, "getUser", sqlitegen.QueryKindSingle,
			"SELECT", qb.Results(
				qb.ResultCol(UsersID),
				qb.ResultCol(UsersName),
				qb.ResultCol(UsersAvatar),
			), qb.Line,
			"FROM", Users, qb.Line,
			"WHERE", UsersID, "=", qb.VarCol(UsersID),
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
