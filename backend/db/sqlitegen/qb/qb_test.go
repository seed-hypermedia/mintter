package qb_test

import (
	"mintter/backend/db/sqlitegen"
	. "mintter/backend/db/sqlitegen/qb"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMakeQuery(t *testing.T) {
	const (
		WalletsTableName = "wallets"

		WalletsColID   sqlitegen.Column = "wallets.id"
		WalletsColName sqlitegen.Column = "wallets.name"
	)

	schema := sqlitegen.Schema{
		Columns: map[sqlitegen.Column]sqlitegen.ColumnInfo{
			WalletsColID:   {Table: "wallets", SQLType: "TEXT"},
			WalletsColName: {Table: "wallets", SQLType: "TEXT"},
		},
	}

	q := MakeQuery("getWallet", schema,
		"SELECT", Results(
			ResultCol(WalletsColID),
			ResultCol(WalletsColName),
			ResultExpr(SQLFunc("COUNT", WalletsColID.String()), "count", sqlitegen.TypeInt),
		), '\n',
		"FROM", WalletsTableName, '\n',
		"WHERE", WalletsColID, "=", VarCol(WalletsColID), '\n',
		"AND", WalletsColName, "=", Var("walletName", sqlitegen.TypeString), '\n',
	)

	wantSQL := `SELECT wallets.id, wallets.name, COUNT(wallets.id) AS count
FROM wallets
WHERE wallets.id = ?
AND wallets.name = ?
`
	require.Equal(t, wantSQL, q.SQL())

	wantInputs := []sqlitegen.GoSymbol{
		{Name: "walletsID", Type: sqlitegen.TypeString},
		{Name: "walletName", Type: sqlitegen.TypeString},
	}
	require.Equal(t, wantInputs, q.Inputs)

	wantOutputs := []sqlitegen.GoSymbol{
		{Name: "WalletsID", Type: sqlitegen.TypeString},
		{Name: "WalletsName", Type: sqlitegen.TypeString},
		{Name: "Count", Type: sqlitegen.TypeInt},
	}
	require.Equal(t, wantOutputs, q.Outputs)
}

func TestSQLFunc(t *testing.T) {
	require.Equal(t, "MAX(1, 2, 3)", SQLFunc("MAX", "1", "2", "3"))
}
