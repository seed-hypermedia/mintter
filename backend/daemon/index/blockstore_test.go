package index

import (
	"context"
	"fmt"
	"seed/backend/daemon/storage"
	"seed/backend/ipfs"
	"seed/backend/pkg/must"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
	"golang.org/x/exp/slices"
)

func TestGet(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	data := []byte("some data")
	c := makeCID(t, data)

	blk, err := blocks.NewBlockWithCid(data, c)
	require.NoError(t, err)

	require.NoError(t, bs.Put(context.Background(), blk))

	got, err := bs.Get(context.Background(), c)
	require.NoError(t, err)

	require.Equal(t, blk.RawData(), got.RawData())
	require.True(t, got.Cid().Equals(blk.Cid()))

	ok, err := bs.Has(context.Background(), c)
	require.NoError(t, err)
	require.True(t, ok)

	size, err := bs.GetSize(context.Background(), c)
	require.NoError(t, err)
	require.Equal(t, len(data), size)
}

func TestGet_Missing(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	c := makeCID(t, []byte("missing-data"))
	got, err := bs.Get(context.Background(), c)
	require.Nil(t, got)
	require.True(t, format.IsNotFound(err))

	ok, err := bs.Has(context.Background(), c)
	require.False(t, ok)
	require.NoError(t, err)

	size, err := bs.GetSize(context.Background(), c)
	require.True(t, format.IsNotFound(err))
	require.Equal(t, 0, size)

	{
		conn, release, err := bs.db.Conn(context.Background())
		require.NoError(t, err)
		_, err = dbBlobsInsert(conn, 0, c.Hash(), int64(c.Prefix().Codec), nil, -1)
		require.NoError(t, err)
		release()

		got, err := bs.Get(context.Background(), c)
		require.Nil(t, got)
		require.True(t, format.IsNotFound(err))

		ok, err := bs.Has(context.Background(), c)
		require.False(t, ok)
		require.NoError(t, err)

		size, err := bs.GetSize(context.Background(), c)
		require.True(t, format.IsNotFound(err))
		require.Equal(t, 0, size)
	}
}

func TestHashOnRead(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	require.Panics(t, func() { bs.HashOnRead(true) })
}

func TestHas(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	orig := ipfs.NewBlock(cid.Raw, []byte("some data"))
	err := bs.Put(context.Background(), orig)
	require.NoError(t, err)

	ok, err := bs.Has(context.Background(), orig.Cid())
	require.NoError(t, err)
	require.True(t, ok)

	ok, err = bs.Has(context.Background(), ipfs.NewBlock(cid.Raw, []byte("another thing")).Cid())
	require.NoError(t, err)
	require.False(t, ok)
}

func TestCidv0v1(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	orig := ipfs.NewBlock(cid.Raw, []byte("some data"))

	err := bs.Put(context.Background(), orig)
	require.NoError(t, err)

	fetched, err := bs.Get(context.Background(), cid.NewCidV1(cid.DagProtobuf, orig.Cid().Hash()))
	require.NoError(t, err)
	require.Equal(t, orig.RawData(), fetched.RawData())
}

func TestAllKeysSimple(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	keys := insertBlocks(t, bs, 100)

	ctx := context.Background()
	ch, err := bs.AllKeysChan(ctx)
	require.NoError(t, err)
	actual := collect(ch)

	require.ElementsMatch(t, keys, actual)
}

func TestAllKeysRespectsContext(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	keys := insertBlocks(t, bs, 100)

	ctx, cancel := context.WithCancel(context.Background())
	ch, err := bs.AllKeysChan(ctx)
	require.NoError(t, err)

	// consume 2, then cancel context.
	v, ok := <-ch
	require.True(t, ok)
	require.True(t, slices.Contains(keys, v))

	v, ok = <-ch
	require.True(t, ok)
	require.True(t, slices.Contains(keys, v))

	cancel()

	received := 0
	for range ch {
		received++
		require.LessOrEqual(t, received, 20, "expected query to be canceled")
	}
}

func TestPutMany(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	blks := []blocks.Block{
		ipfs.NewBlock(cid.Raw, []byte("foo1")),
		ipfs.NewBlock(cid.Raw, []byte("foo2")),
		ipfs.NewBlock(cid.Raw, []byte("foo3")),
	}

	err := bs.PutMany(context.Background(), blks)
	require.NoError(t, err)

	for _, blk := range blks {
		fetched, err := bs.Get(context.Background(), blk.Cid())
		require.NoError(t, err)
		require.Equal(t, blk.RawData(), fetched.RawData())

		ok, err := bs.Has(context.Background(), blk.Cid())
		require.NoError(t, err)
		require.True(t, ok)
	}

	ch, err := bs.AllKeysChan(context.Background())
	require.NoError(t, err)

	cids := collect(ch)
	require.Len(t, cids, 3)
}

func TestPut_InlineCID(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	mh, err := multihash.Sum([]byte("this is some data"), multihash.IDENTITY, -1)
	require.NoError(t, err)
	c := cid.NewCidV1(cid.Raw, mh)

	blk, err := blocks.NewBlockWithCid(nil, c)
	require.NoError(t, err)

	require.NoError(t, bs.Put(context.Background(), blk))

	gotBlk, err := bs.Get(context.Background(), c)
	require.NoError(t, err)

	require.True(t, gotBlk.RawData() == nil)
	require.Equal(t, c, gotBlk.Cid())
}

func TestDelete(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)

	blks := []blocks.Block{
		ipfs.NewBlock(cid.Raw, []byte("foo1")),
		ipfs.NewBlock(cid.Raw, []byte("foo2")),
		ipfs.NewBlock(cid.Raw, []byte("foo3")),
	}
	err := bs.PutMany(context.Background(), blks)
	require.NoError(t, err)

	err = bs.DeleteBlock(context.Background(), blks[1].Cid())
	require.NoError(t, err)

	ch, err := bs.AllKeysChan(context.Background())
	require.NoError(t, err)

	cids := collect(ch)
	require.Len(t, cids, 2)
	require.ElementsMatch(t, cids, []cid.Cid{
		blks[0].Cid(),
		blks[2].Cid(),
	})

	has, err := bs.Has(context.Background(), blks[1].Cid())
	require.NoError(t, err)
	require.False(t, has)
}

func TestIPLDIndex(t *testing.T) {
	t.Parallel()

	bs := makeBlockstore(t)
	ctx := context.Background()

	alice := ipfs.NewBlock(cid.DagCBOR, must.Do2(cbornode.DumpObject(map[string]any{"name": "Alice"})))
	bob := ipfs.NewBlock(cid.DagCBOR, must.Do2(cbornode.DumpObject(map[string]any{"name": "Bob", "nested": map[string]any{
		"friend": alice.Cid(),
	}})))

	// Putting bob first to ensure we can index links even for data we don't yet have.
	require.NoError(t, bs.Put(ctx, bob))

	require.False(t, must.Do2(bs.Has(ctx, alice.Cid())), "must not have alice until we put it")

	require.NoError(t, bs.Put(ctx, alice))

	require.True(t, must.Do2(bs.Has(ctx, alice.Cid())), "must have alice after we put it")
	require.True(t, must.Do2(bs.Has(ctx, bob.Cid())), "must have bob")

	require.Equal(t, alice.RawData(), must.Do2(bs.Get(ctx, alice.Cid())).RawData(), "must get alice data")
	require.Equal(t, bob.RawData(), must.Do2(bs.Get(ctx, bob.Cid())).RawData(), "must get bob data")
}

func makeBlockstore(t testing.TB) *blockStore {
	t.Helper()

	pool := newTestSQLite(t)

	bs := newBlockstore(pool)

	return bs
}

func makeCID(t *testing.T, data []byte) cid.Cid {
	t.Helper()

	mh, err := multihash.Sum(data, multihash.SHA2_256, -1)
	require.NoError(t, err)

	return cid.NewCidV1(cid.Raw, mh)
}

func insertBlocks(t *testing.T, bs *blockStore, count int) []cid.Cid {
	keys := make([]cid.Cid, count)
	for i := 0; i < count; i++ {
		data := []byte(fmt.Sprintf("some data %d", i))
		c := makeCID(t, data)
		block, err := blocks.NewBlockWithCid(data, c)
		require.NoError(t, err)
		require.NoError(t, bs.Put(context.Background(), block))
		keys[i] = c
	}

	return keys
}

func collect(ch <-chan cid.Cid) []cid.Cid {
	var keys []cid.Cid
	for k := range ch {
		keys = append(keys, k)
	}
	return keys
}

func newTestSQLite(t testing.TB) *sqlitex.Pool {
	return storage.MakeTestDB(t)
}
