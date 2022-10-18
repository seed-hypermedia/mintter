package vcsdb

import (
	"context"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/vcs"
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

	perma, err := NewPermanode(vcs.NewPermanode("test", alice.AccountID, time.Time{}))
	require.NoError(t, err)

	require.NoError(t, conn.BeginTx(true))

	obj := conn.NewObject(perma)
	me := conn.EnsureIdentity(alice.Identity)

	now := time.Time{}
	c1 := conn.NewChange(obj, me, nil, now)

	newDatom := MakeDatomFactory(c1, 1, 0)
	conn.AddDatom(obj, newDatom(RootNode, "email", "foo@example.com"))
	conn.AddDatom(obj, newDatom(RootNode, "alias", "fulanito"))
	conn.AddDatom(obj, newDatom(RootNode, "bio", "Just an example"))

	conn.SaveVersion(obj, "main", me, LocalVersion{c1})

	require.NoError(t, conn.Commit())
	require.NoError(t, conn.BeginTx(true))

	c2 := conn.NewChange(obj, me, LocalVersion{c1}, now.Add(time.Hour))

	newDatom = MakeDatomFactory(c2, 1, 0)
	conn.AddDatom(obj, newDatom(RootNode, "email", "changed@example.com"))

	conn.SaveVersion(obj, "main", me, LocalVersion{c2})

	require.NoError(t, conn.Commit())

	cs := conn.ResolveChangeSet(obj, LocalVersion{c2})
	require.Equal(t, "[3,2]", string(cs))
	require.Equal(t, "changed@example.com", conn.QueryLastValue(obj, cs, RootNode, "email").Value)
}
