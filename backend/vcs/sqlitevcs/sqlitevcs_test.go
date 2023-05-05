package sqlitevcs

import (
	"context"
	"crypto/sha1" //nolint:gosec
	"encoding/hex"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewObject_Idempotent(t *testing.T) {
	db := New(sqliteschema.MakeTestDB(t))
	ctx := context.Background()
	alice := coretest.NewTester("alice")

	perma, err := vcs.EncodePermanode(vcs.NewPermanode("test", alice.Identity.AccountID(), hlc.Time{}))
	require.NoError(t, err)

	{
		conn, release, err := db.Conn(ctx)
		require.NoError(t, err)
		lid := conn.NewObject(perma)
		require.Equal(t, LocalID(1), lid)
		release()
	}
	{
		conn, release, err := db.Conn(ctx)
		require.NoError(t, err)
		lid := conn.NewObject(perma)
		require.Equal(t, LocalID(1), lid)
		release()
	}
}

func checkSum(t *testing.T, want string, data []byte) {
	sum := sha1.Sum(data) //nolint:gosec
	require.Equal(t, want, hex.EncodeToString(sum[:]))
}
