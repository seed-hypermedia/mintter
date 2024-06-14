package example

import (
	"seed/backend/pkg/sqlitegen/example/schema"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestQueries(t *testing.T) {
	conn, closer, err := schema.MakeConn()
	require.NoError(t, err)

	defer func() { require.NoError(t, closer()) }()

	{
		err = insertWallet(conn, "wallet-1", "name-1")
		require.NoError(t, err)

		got, err := getWallet(conn, "wallet-1")
		require.NoError(t, err)

		require.Equal(t, "wallet-1", got.WalletsID)
		require.Equal(t, "name-1", got.WalletsName)

		err = insertWallet(conn, "wallet-2", "name-2")
		require.NoError(t, err)

		err = insertWallet(conn, "wallet-3", "name-3")
		require.NoError(t, err)
	}
	{
		wantList := []listWalletsResult{
			{WalletsID: "wallet-1", WalletsName: "name-1"},
			{WalletsID: "wallet-2", WalletsName: "name-2"},
			{WalletsID: "wallet-3", WalletsName: "name-3"},
		}

		list, err := listWallets(conn, "", 3)
		require.NoError(t, err)
		require.Equal(t, wantList, list)

		list, err = listWallets(conn, "wallet-1", 3)
		require.NoError(t, err)
		require.Equal(t, wantList[1:], list)

		list, err = listWallets(conn, "wallet-2", 3)
		require.NoError(t, err)
		require.Equal(t, wantList[2:], list)
	}
	{
		err = insertUser(conn, 1, "alice", []byte{1, 1, 1})
		require.NoError(t, err)

		alice, err := getUser(conn, 1)
		require.NoError(t, err)

		wantAlice := getUserResult{
			UsersID:     1,
			UsersName:   "alice",
			UsersAvatar: []byte{1, 1, 1},
		}

		require.Equal(t, wantAlice, alice)
	}
}
