package networking

import (
	"context"
	"seed/backend/config"
	"seed/backend/core"
	"seed/backend/core/coretest"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	"seed/backend/daemon/storage"
	networking "seed/backend/genproto/networking/v1alpha"
	"seed/backend/hyper"
	"seed/backend/logging"
	"seed/backend/mttnet"
	"seed/backend/pkg/must"
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
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))
	_, err := daemon.Register(context.Background(), blobs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.NoRelay = true
	cfg.BootstrapPeers = nil
	cfg.NoMetrics = true

	ks := core.NewMemoryKeyStore()
	must.Do(ks.StoreKey(context.Background(), "main", u.Account))

	n, err := mttnet.New(cfg, u.Device, ks, db, blobs, zap.NewNop())
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

	t.Cleanup(cancel)

	return NewServer(blobs, n)
}
