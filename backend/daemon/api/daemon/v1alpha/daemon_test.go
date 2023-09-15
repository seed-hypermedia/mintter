package daemon

import (
	context "context"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	"mintter/backend/daemon/daemontest"
	"mintter/backend/daemon/storage"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"mintter/backend/testutil"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

func TestGenMnemonic(t *testing.T) {
	srv := newTestServer(t, "alice")
	ctx := context.Background()

	resp, err := srv.GenMnemonic(ctx, &daemon.GenMnemonicRequest{MnemonicsLength: 18})
	require.NoError(t, err)
	require.Equal(t, 18, len(resp.Mnemonic))
}

func TestRegister(t *testing.T) {
	testMnemonic := []string{"satisfy", "quit", "charge", "arrest", "prevent", "credit", "wreck", "amount", "swim", "snow", "system", "cluster", "skull", "slight", "dismiss"}
	testPassphrase := "testpass"
	srv := newTestServer(t, "alice")
	ctx := context.Background()

	resp, err := srv.Register(ctx, &daemon.RegisterRequest{
		Mnemonic:   testMnemonic,
		Passphrase: testPassphrase,
	})
	require.NoError(t, err)
	require.Equal(t, "z6MkrGJF5qWkmaD1XsXpxwnX7uhjfR5bAWURvrSPsF12eCAH", resp.AccountId)

	_, err = srv.Register(ctx, &daemon.RegisterRequest{
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
		MnemonicsLength: 15,
	})
	require.NoError(t, err)

	reg, err := srv.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: seed.Mnemonic,
	})
	require.NoError(t, err)
	_ = reg

	info, err := srv.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.NoError(t, err)
	require.Equal(t, srv.repo.Device().PeerID().String(), info.DeviceId)

	acc := srv.repo.Identity().MustGet().Account()
	require.Equal(t, acc.Principal().String(), info.AccountId)
	testutil.ProtoEqual(t, timestamppb.New(srv.startTime), info.StartTime, "start time doesn't match")
}

func newTestServer(t *testing.T, name string) *Server {
	u := coretest.NewTester(name)
	repo := daemontest.MakeTestRepo(t, u)
	db := storage.MakeTestDB(t)
	wallet := new(mockedWallet)
	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))

	return NewServer(repo, blobs, wallet, nil)
}

type mockedWallet struct {
}

func (w *mockedWallet) ConfigureMintterLNDHub(context.Context, core.KeyPair) error {
	return nil
}
