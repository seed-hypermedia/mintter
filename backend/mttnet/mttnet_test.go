package mttnet

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/pkg/must"
	"mintter/backend/testutil"
	"mintter/backend/vcs/mttacc"
	"mintter/backend/vcs/vcsdb"
	"path/filepath"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

var _ p2p.P2PServer = (*rpcHandler)(nil)

func TestAddrs(t *testing.T) {
	addrs := []string{
		"/ip4/192.168.0.104/tcp/55000/p2p/12D3KooWJfvidBgFaHGJn6v1pTzQz2xXtDvdh6iMcKU8CfLeW9iJ",
		"/ip4/127.0.0.1/tcp/55000/p2p/12D3KooWJfvidBgFaHGJn6v1pTzQz2xXtDvdh6iMcKU8CfLeW9iJ",
		"/ip4/23.20.24.146/tcp/4002/p2p/12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq/p2p-circuit/p2p/12D3KooWJfvidBgFaHGJn6v1pTzQz2xXtDvdh6iMcKU8CfLeW9iJ",
		"/ip4/23.20.24.146/udp/4002/quic/p2p/12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq/p2p-circuit/p2p/12D3KooWJfvidBgFaHGJn6v1pTzQz2xXtDvdh6iMcKU8CfLeW9iJ",
	}

	info, err := AddrInfoFromStrings(addrs...)
	require.NoError(t, err)

	want := "{12D3KooWJfvidBgFaHGJn6v1pTzQz2xXtDvdh6iMcKU8CfLeW9iJ: [/ip4/192.168.0.104/tcp/55000 /ip4/127.0.0.1/tcp/55000 /ip4/23.20.24.146/tcp/4002/p2p/12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq/p2p-circuit /ip4/23.20.24.146/udp/4002/quic/p2p/12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq/p2p-circuit]}"
	require.Equal(t, want, info.String())

	require.Equal(t, addrs, AddrInfoToStrings(info))
}

func makeTestPeer(t *testing.T, name string) (*Node, context.CancelFunc) {
	u := coretest.NewTester(name)

	db := makeTestSQLite(t)

	hvcs := vcsdb.New(db)

	conn, release, err := hvcs.Conn(context.Background())
	require.NoError(t, err)
	reg, err := mttacc.Register(context.Background(), u.Account, u.Device, conn)
	release()
	require.NoError(t, err)

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.NoRelay = true
	cfg.NoBootstrap = true
	cfg.NoMetrics = true

	n, err := New(cfg, hvcs, reg, u.Identity, must.Do2(zap.NewDevelopment()).Named(name))
	require.NoError(t, err)

	errc := make(chan error, 1)
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		errc <- n.Start(ctx)
	}()

	t.Cleanup(func() {
		require.NoError(t, <-errc)
	})

	select {
	case <-n.Ready():
	case err := <-errc:
		require.NoError(t, err)
	}

	return n, cancel
}

func makeTestSQLite(t *testing.T) *sqlitex.Pool {
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
