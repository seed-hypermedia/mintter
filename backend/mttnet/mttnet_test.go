package mttnet

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	accounts "mintter/backend/daemon/api/accounts/v1alpha"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	"mintter/backend/daemon/storage"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/must"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

var _ p2p.P2PServer = (*Server)(nil)

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

func makeTestPeer(t *testing.T, name string, siteCfg ...config.Site) (*Node, context.CancelFunc) {
	u := coretest.NewTester(name)

	db := storage.MakeTestDB(t)

	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	_, err := daemon.Register(context.Background(), blobs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)

	// TODO(burdiyan): because key delegations are not changes to the account entity, it needs a profile update
	// so that we can share our own account with other peers. This should be fixed, but in practice shouldn't
	// cause major issues.
	require.NoError(t, accounts.UpdateProfile(context.Background(), u.Identity, blobs, &accounts.Profile{
		Alias: name,
		Bio:   "Test Mintter user",
	}))

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.NoRelay = true
	cfg.BootstrapPeers = nil
	cfg.NoMetrics = true

	n, err := New(cfg, db, blobs, u.Identity, must.Do2(zap.NewDevelopment()).Named(name))
	require.NoError(t, err)

	errc := make(chan error, 1)
	ctx, cancel := context.WithCancel(context.Background())
	f := future.New[*Node]()
	NewServer(ctx, config.Default().Site, f.ReadOnly, nil, nil)
	require.NoError(t, f.Resolve(n))

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
