package backend

import (
	"context"
	"testing"

	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	daemon "mintter/backend/api/daemon/v1alpha"
	"mintter/backend/testutil"
)

func TestGenSeed(t *testing.T) {
	back := makeTestBackend(t, "alice", false)
	srv := newDaemonAPI(back)
	ctx := context.Background()

	resp, err := srv.GenSeed(ctx, &daemon.GenSeedRequest{})
	require.NoError(t, err)
	require.Equal(t, aezeed.NumMnemonicWords, len(resp.Mnemonic))
}

func TestRegister(t *testing.T) {
	testMnemonic := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}
	back := makeTestBackend(t, "alice", false)
	srv := newDaemonAPI(back)
	ctx := context.Background()

	resp, err := srv.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: testMnemonic,
	})
	require.NoError(t, err)
	require.NotEqual(t, "", resp.AccountId)

	_, err = srv.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: testMnemonic,
	})
	require.Error(t, err, "calling Register more than once must fail")

	stat, ok := status.FromError(err)
	require.True(t, ok)
	require.Equal(t, codes.FailedPrecondition, stat.Code())

	// back.GetAccountState(ctx, back.repo.acc.id)

	// acc, err := srv.backend.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{})
	// require.NoError(t, err, "must get account after registration")
	// require.NotNil(t, acc)
}

func TestRegister_Concurrent(t *testing.T) {
	testMnemonic := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}
	back := makeTestBackend(t, "alice", false)
	srv := newDaemonAPI(back)
	ctx := context.Background()
	c := 5

	errs := make(chan error, c-1) // one request must succeed

	for i := 0; i < 5; i++ {
		go func() {
			_, err := srv.Register(ctx, &daemon.RegisterRequest{
				Mnemonic: testMnemonic,
			})
			if err != nil {
				errs <- err
			}
		}()
	}

	// One register request must succeed and backend must become ready eventually.
	<-back.p2p.Ready()

	for i := 0; i < c-1; i++ {
		err := <-errs
		require.Error(t, err)
	}
}

func TestGetInfo_NonReady(t *testing.T) {
	back := makeTestBackend(t, "alice", false)
	srv := newDaemonAPI(back)
	ctx := context.Background()

	info, err := srv.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.Error(t, err)
	require.Nil(t, info)

	st, ok := status.FromError(err)
	require.True(t, ok)
	require.Equal(t, codes.FailedPrecondition, st.Code())
}

func TestGetInfo_Ready(t *testing.T) {
	back := makeTestBackend(t, "alice", true)
	srv := newDaemonAPI(back)
	ctx := context.Background()

	info, err := srv.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.NoError(t, err)
	require.Equal(t, back.repo.device.id.String(), info.PeerId)
	require.Equal(t, back.repo.acc.id.String(), info.AccountId)
	testutil.ProtoEqual(t, timestamppb.New(back.startTime), info.StartTime, "start time doesn't match")
}
