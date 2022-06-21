package vcs

import (
	"context"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs"
	"mintter/backend/testutil"
	"path/filepath"
	"testing"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	multihash "github.com/multiformats/go-multihash/core"
	"github.com/stretchr/testify/require"
)

func TestSQLiteWorkingCopy(t *testing.T) {
	pool := newTestSQLite(t)
	vcs := New(pool)
	ctx := context.Background()

	bp := BasePermanode{
		Type:       "https://schema.mintter.org/TestPermanode",
		Owner:      ipfs.MustNewCID(cid.Raw, multihash.IDENTITY, []byte("alice")),
		CreateTime: time.Now().UTC().Round(time.Second),
	}

	blk, err := EncodeBlock[Permanode](bp)
	require.NoError(t, err)

	require.NoError(t, vcs.StorePermanode(ctx, blk.Block, blk.Value))

	_, err = vcs.LoadWorkingCopy(ctx, blk.Cid(), "main")
	require.Error(t, errNotFound, err)
	wc := NewWorkingCopy(blk.Cid(), "main")
	wc.SetData([]byte("hello world"))

	require.NoError(t, vcs.SaveWorkingCopy(ctx, wc))

	wc2, err := vcs.LoadWorkingCopy(ctx, blk.Cid(), "main")
	require.NoError(t, err)

	require.Equal(t, wc.Data(), wc2.Data())

	// Test second time with different data.

	wc.SetData([]byte("hello world 2"))
	require.NoError(t, vcs.SaveWorkingCopy(ctx, wc))

	wc2, err = vcs.LoadWorkingCopy(ctx, blk.Cid(), "main")
	require.NoError(t, err)

	require.Equal(t, wc.Data(), wc2.Data())
}

func newTestSQLite(t testing.TB) *sqlitex.Pool {
	path := testutil.MakeRepoPath(t)

	pool, err := sqliteschema.Open(filepath.Join(path, "db.sqlite"), 0, 16)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})

	conn := pool.Get(context.Background())
	defer pool.Put(conn)

	require.NoError(t, sqliteschema.Migrate(conn))

	return pool
}
