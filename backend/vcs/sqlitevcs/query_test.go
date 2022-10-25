package sqlitevcs

import (
	"context"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestQuery(t *testing.T) {
	db := New(sqliteschema.MakeTestDB(t))
	ctx := context.Background()
	alice := coretest.NewTester("alice")

	conn, release, err := db.Conn(ctx)
	require.NoError(t, err)
	defer release()

	perma, err := vcs.EncodePermanode(vcs.NewPermanode("test", alice.AccountID, hlc.Time{}))
	require.NoError(t, err)

	require.NoError(t, conn.BeginTx(true))

	obj := conn.NewObject(perma)
	me := conn.EnsureIdentity(alice.Identity)

	clock := hlc.NewClockWithWall(func() time.Time { return time.Time{} })
	c1 := conn.NewChange(obj, me, nil, clock)

	batch := vcs.NewBatch(clock, 123)

	conn.AddDatoms(obj, c1,
		batch.New(vcs.RootNode, "email", "foo@example.com"),
		batch.New(vcs.RootNode, "alias", "fulanito"),
		batch.New(vcs.RootNode, "bio", "Just an example"),
	)

	conn.SaveVersion(obj, "main", me, LocalVersion{c1})

	require.NoError(t, conn.Commit())
	require.NoError(t, conn.BeginTx(true))

	c2 := conn.NewChange(obj, me, LocalVersion{c1}, clock)

	batch = vcs.NewBatch(clock, 123)

	conn.AddDatoms(obj, c2, batch.New(vcs.RootNode, "email", "changed@example.com"))

	conn.SaveVersion(obj, "main", me, LocalVersion{c2})

	require.NoError(t, conn.Commit())

	cs := conn.ResolveChangeSet(obj, LocalVersion{c2})
	require.Equal(t, "[3,2]", string(cs))
	require.Equal(t, "changed@example.com", conn.QueryLastValue(obj, cs, vcs.RootNode, "email").Value)
}
