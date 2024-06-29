package daemon

import (
	context "context"
	"seed/backend/core"
	"seed/backend/core/coretest"
	"seed/backend/daemon/daemontest"
	"seed/backend/daemon/storage"
	daemon "seed/backend/genproto/daemon/v1alpha"
	"seed/backend/hyper"
	"seed/backend/logging"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestGenMnemonic(t *testing.T) {
	srv := newTestServer(t, "alice")
	ctx := context.Background()

	resp, err := srv.GenMnemonic(ctx, &daemon.GenMnemonicRequest{WordCount: 18})
	require.NoError(t, err)
	require.Equal(t, 18, len(resp.Mnemonic))
}

func TestRegister(t *testing.T) {
	testMnemonic := []string{"satisfy", "quit", "charge", "arrest", "prevent", "credit", "wreck", "amount", "swim", "snow", "system", "cluster", "skull", "slight", "dismiss"}
	testPassphrase := "testpass"
	srv := newTestServer(t, "alice")
	ctx := context.Background()

	resp, err := srv.RegisterKey(ctx, &daemon.RegisterKeyRequest{
		Mnemonic:   testMnemonic,
		Passphrase: testPassphrase,
	})
	require.NoError(t, err)
	require.Equal(t, "z6MkujA2tVCu6hcYvnuehpVZuhijVXNAqHgk3rpYtsgxebeb", resp.PublicKey)

	_, err = srv.RegisterKey(ctx, &daemon.RegisterKeyRequest{
		Mnemonic: testMnemonic,
	})
	require.Error(t, err, "calling Register more than once must fail")

	stat, ok := status.FromError(err)
	require.True(t, ok)
	require.Equal(t, codes.AlreadyExists, stat.Code())
}

func TestGetInfo_NonReady(t *testing.T) {
	srv := newTestServer(t, "alice")
	ctx := context.Background()

	info, err := srv.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.Error(t, err)
	require.Nil(t, info)

	st, ok := status.FromError(err)
	require.True(t, ok)
	require.Equal(t, codes.FailedPrecondition, st.Code())
}

func TestGetInfo_Ready(t *testing.T) {
	srv := newTestServer(t, "alice")
	ctx := context.Background()

	seed, err := srv.GenMnemonic(ctx, &daemon.GenMnemonicRequest{
		WordCount: 15,
	})
	require.NoError(t, err)

	reg, err := srv.RegisterKey(ctx, &daemon.RegisterKeyRequest{
		Mnemonic: seed.Mnemonic,
	})
	require.NoError(t, err)
	_ = reg

	info, err := srv.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.NoError(t, err)
	require.Equal(t, srv.store.Device().PeerID().String(), info.PeerId)

	// acc := srv.repo.Identity().MustGet().Account()

	panic("TODO list keys and check account key is there")

	// require.Equal(t, acc.Principal().String(), info.AccountId)
	// testutil.ProtoEqual(t, timestamppb.New(srv.startTime), info.StartTime, "start time doesn't match")
}

func newTestServer(t *testing.T, name string) *Server {
	u := coretest.NewTester(name)
	repo := daemontest.MakeTestRepo(t, u)
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))

	return NewServer(repo, blobs, nil, nil)
}

type mockedWallet struct {
}

func (w *mockedWallet) ConfigureSeedLNDHub(context.Context, core.KeyPair) error {
	return nil
}
