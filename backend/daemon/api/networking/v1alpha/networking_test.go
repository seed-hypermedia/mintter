package networking

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	networking "mintter/backend/genproto/networking/v1alpha"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/testutil"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	"path/filepath"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestNetworkingGetPeerInfo(t *testing.T) {
	alice := coretest.NewTester("alice")
	api := makeTestServer(t, alice)
	ctx := context.Background()

	did := alice.Device.CID()
	acc := alice.AccountID

	pinfo, err := api.GetPeerInfo(ctx, &networking.GetPeerInfoRequest{
		PeerId: did.String(),
	})
	require.NoError(t, err)
	require.NotNil(t, pinfo)
	require.Equal(t, acc.String(), pinfo.AccountId, "account ids must match")
}

func makeTestServer(t *testing.T, u coretest.Tester) *Server {
	node, stopnode := makeTestPeer(t, u)
	t.Cleanup(stopnode)

	fut := future.New[*mttnet.Node]()
	require.NoError(t, fut.Resolve(node))

	return NewServer(fut.ReadOnly)
}

func makeTestPeer(t *testing.T, u coretest.Tester) (*mttnet.Node, context.CancelFunc) {
	db := makeTestSQLite(t)

	hvcs := vcs.New(db)

	reg, err := vcstypes.Register(context.Background(), u.Account, u.Device, hvcs)
	require.NoError(t, err)

	n, err := mttnet.New(config.P2P{
		Port:        0,
		NoRelay:     true,
		NoBootstrap: true,
		NoMetrics:   true,
	}, hvcs, reg, u.Identity, zap.NewNop())
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
