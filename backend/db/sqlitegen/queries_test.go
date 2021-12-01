package sqlitegen

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCodegenQueries(t *testing.T) {
	code, err := CodegenQueries("testqueries",
		QueryTemplate{
			Name: "getWallet",
			Kind: QueryKindSingle,
			Inputs: []GoSymbol{
				{Name: "walletID", Type: TypeInt},
			},
			Outputs: []GoSymbol{
				{Name: "WalletID", Type: TypeInt},
				{Name: "WalletName", Type: TypeText},
			},
			SQL: "SELECT wallets.id, wallets.name\nFROM wallets\nWHERE wallets.id = ?",
		},
		QueryTemplate{
			Name: "listWallets",
			Kind: QueryKindMany,
			Inputs: []GoSymbol{
				{Name: "cursor", Type: TypeText},
				{Name: "limit", Type: TypeInt},
			},
			Outputs: []GoSymbol{
				{Name: "WalletID", Type: TypeInt},
				{Name: "WalletName", Type: TypeText},
			},
			SQL: "SELECT wallets.id, wallets.name\nFROM wallets\nWHERE wallets.id > ? LIMIT ?",
		},
		QueryTemplate{
			Name: "insertWallet",
			Kind: QueryKindExec,
			Inputs: []GoSymbol{
				{Name: "id", Type: TypeInt},
				{Name: "name", Type: TypeText},
			},
			SQL: "INSERT INTO wallets (id, name) VALUES (?, ?)",
		},
	)
	require.NoError(t, err)

	fmt.Println(string(code))
}
