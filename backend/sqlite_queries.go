package backend

import (
	"io/ioutil"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
)

var _ = generateQueries

//go:generate gorun generateQueries
func generateQueries() error {
	code, err := sqlitegen.CodegenQueries("backend",
		qb.MakeQuery(sqliteschema.Schema, "insertDevice", sqlitegen.QueryKindExec,
			"INSERT INTO", sqliteschema.Devices, qb.List(
				sqliteschema.DevicesCID.ShortName(),
				sqliteschema.DevicesAccountID.ShortName(),
			), qb.Line,
			"VALUES", qb.List(
				qb.VarCol(sqliteschema.DevicesCID),
				qb.Sub(
					"SELECT", sqliteschema.AccountsID, "FROM", sqliteschema.Accounts,
					"WHERE", sqliteschema.AccountsCID, "=", qb.VarCol(sqliteschema.AccountsCID),
				),
			),
		),
	)
	if err != nil {
		return err
	}

	return ioutil.WriteFile("sqlite_queries.gen.go", code, 0600)
}
