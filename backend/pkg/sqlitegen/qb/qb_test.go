package qb_test

import (
	"seed/backend/pkg/sqlitegen"
	. "seed/backend/pkg/sqlitegen/qb"
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

	tests := []struct {
		T    sqlitegen.QueryTemplate
		Want sqlitegen.QueryTemplate
	}{
		{
			T: MakeQuery(schema, "getWallet", sqlitegen.QueryKindSingle,
				"SELECT", Results(
					ResultCol(WalletsColID),
					ResultCol(WalletsColName),
					ResultExpr(SQLFunc("COUNT", WalletsColID.String()), "count", sqlitegen.TypeInt),
				), Line,
				"FROM", WalletsTableName, Line,
				"WHERE", WalletsColID, "=", VarCol(WalletsColID), "AND", WalletsColName, "=", Var("walletsName", sqlitegen.TypeText),
			),
			Want: sqlitegen.QueryTemplate{
				Name: "getWallet",
				Inputs: []sqlitegen.GoSymbol{
					{Name: "walletsID", Type: sqlitegen.TypeText},
					{Name: "walletsName", Type: sqlitegen.TypeText},
				},
				Outputs: []sqlitegen.GoSymbol{
					{Name: "WalletsID", Type: sqlitegen.TypeText},
					{Name: "WalletsName", Type: sqlitegen.TypeText},
					{Name: "Count", Type: sqlitegen.TypeInt},
				},
				SQL: `SELECT wallets.id, wallets.name, COUNT(wallets.id) AS count
FROM wallets
WHERE wallets.id = :walletsID AND wallets.name = :walletsName`,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.Want.Name, func(t *testing.T) {
			require.Equal(t, tt.Want, tt.T)
		})
	}
}

func TestSQLFunc(t *testing.T) {
	require.Equal(t, "MAX(1, 2, 3)", SQLFunc("MAX", "1", "2", "3"))
}
