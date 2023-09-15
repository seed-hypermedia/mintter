package networking

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	"mintter/backend/daemon/storage"
	networking "mintter/backend/genproto/networking/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestNetworkingGetPeerInfo(t *testing.T) {
	alice := coretest.NewTester("alice")
	api := makeTestServer(t, alice)
	ctx := context.Background()

	pid := alice.Device.PeerID()
	acc := alice.Account.Principal()

	pinfo, err := api.GetPeerInfo(ctx, &networking.GetPeerInfoRequest{
		DeviceId: pid.String(),
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
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	_, err := daemon.Register(context.Background(), blobs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.NoRelay = true
	cfg.BootstrapPeers = nil
	cfg.NoMetrics = true

	n, err := mttnet.New(cfg, db, blobs, u.Identity, zap.NewNop())
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
