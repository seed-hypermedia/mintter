package providing

import (
	"context"
	"path/filepath"
	"strconv"
	"sync"
	"testing"
	"time"

	"mintter/backend/testutil"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
)

func TestReprovide_Dedupe(t *testing.T) {
	dir := testutil.MakeRepoPath(t)
	r := &fakeRouting{}
	prov, err := New(filepath.Join(dir, "provided.db"), r, makeStrategy(t, 100))
	require.NoError(t, err)
	prov.db.NoSync = true
	prov.ReprovideTickInterval = 50 * time.Millisecond
	defer func() {
		require.NoError(t, prov.Close())
	}()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errc := make(chan error, 1)

	go func() {
		errc <- prov.StartReproviding(ctx)
	}()

	time.Sleep(1 * time.Second)
	cancel()
	err = <-errc
	require.Equal(t, context.Canceled, err)

	require.Equal(t, 100, len(r.data))
	for _, v := range r.data {
		require.Equal(t, 1, v, "record must be provided only once")
	}
}

func TestReprovide_Expired(t *testing.T) {
	dir := testutil.MakeRepoPath(t)
	r := &fakeRouting{}
	prov, err := New(filepath.Join(dir, "provided.db"), r, makeStrategy(t, 100))
	require.NoError(t, err)
	prov.db.NoSync = true
	prov.ReprovideTickInterval = 50 * time.Millisecond
	prov.ProvideTTL = 100 * time.Millisecond
	defer func() {
		require.NoError(t, prov.Close())
	}()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errc := make(chan error, 1)

	go func() {
		errc <- prov.StartReproviding(ctx)
	}()

	time.Sleep(1 * time.Second)
	cancel()
	err = <-errc
	require.Equal(t, context.Canceled, err)

	require.Equal(t, 100, len(r.data))
	for _, v := range r.data {
		require.Greater(t, v, 1, "record must be provided more than once")
	}
}

func TestProvide(t *testing.T) {
	dir := testutil.MakeRepoPath(t)
	r := &fakeRouting{}
	prov, err := New(filepath.Join(dir, "provided.db"), r, nil)
	require.NoError(t, err)
	prov.db.NoSync = true

	err = prov.Provide(context.Background(), makeCID(t, "cid-1"))
	require.NoError(t, err)
	err = prov.Provide(context.Background(), makeCID(t, "cid-2"))
	require.NoError(t, err)
	err = prov.Provide(context.Background(), makeCID(t, "cid-3"))
	require.NoError(t, err)
	err = prov.Provide(context.Background(), makeCID(t, "cid-3"))
	require.NoError(t, err)
	err = prov.Provide(context.Background(), makeCID(t, "cid-3"))
	require.NoError(t, err)

	require.Equal(t, 3, len(r.data))

	for _, count := range r.data {
		require.Equal(t, 1, count)
	}
}

type fakeRouting struct {
	mu   sync.Mutex
	data map[cid.Cid]int
}

func (r *fakeRouting) Provide(ctx context.Context, c cid.Cid, _ bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.data == nil {
		r.data = make(map[cid.Cid]int)
	}
	r.data[c]++
	return nil
}

func makeStrategy(t *testing.T, n int) Strategy {
	return func(ctx context.Context) (<-chan cid.Cid, error) {
		c := make(chan cid.Cid, n)

		go func() {
			for i := 0; i < n; i++ {
				c <- testutil.MakeCID(t, strconv.Itoa(i))
			}
			close(c)
		}()

		return c, nil
	}
}

func makeSource(t *testing.T, in []string) <-chan cid.Cid {
	c := make(chan cid.Cid)
	go func() {
		for _, d := range in {
			c <- makeCID(t, d)
		}
		close(c)
	}()
	return c
}

func makeCID(t *testing.T, data string) cid.Cid {
	ma, err := multihash.Sum([]byte(data), multihash.IDENTITY, -1)
	require.NoError(t, err)
	return cid.NewCidV1(cid.Raw, ma)
}
