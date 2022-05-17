package daemon

import (
	context "context"
	"mintter/backend/core/coretest"
	"mintter/backend/daemon/daemontest"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/db/sqliteschema"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	"mintter/backend/testutil"
	"mintter/backend/vcs"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

func TestGenSeed(t *testing.T) {
	srv := newTestServer(t, "alice")
	ctx := context.Background()

	resp, err := srv.GenSeed(ctx, &daemon.GenSeedRequest{})
	require.NoError(t, err)
	require.Equal(t, aezeed.NumMnemonicWords, len(resp.Mnemonic))
}

func TestRegister(t *testing.T) {
	testMnemonic := []string{"abandon", "impact", "blossom", "roast", "early", "turkey", "oblige", "cry", "citizen", "toilet", "prefer", "sudden", "glad", "luxury", "vehicle", "broom", "view", "front", "office", "rain", "machine", "angle", "humor", "acid"}
	srv := newTestServer(t, "alice")
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
	require.Equal(t, codes.AlreadyExists, stat.Code())

	// back.GetAccountState(ctx, back.repo.MustAccount().id)

	// acc, err := srv.backend.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{})
	// require.NoError(t, err, "must get account after registration")
	// require.NotNil(t, acc)
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

	seed, err := srv.GenSeed(ctx, &daemon.GenSeedRequest{})
	require.NoError(t, err)

	reg, err := srv.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: seed.Mnemonic,
	})
	require.NoError(t, err)
	_ = reg

	info, err := srv.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.NoError(t, err)
	require.Equal(t, srv.repo.Device().CID().String(), info.PeerId)

	acc, err := srv.repo.Account()
	require.NoError(t, err)
	require.Equal(t, acc.CID().String(), info.AccountId)
	testutil.ProtoEqual(t, timestamppb.New(srv.startTime), info.StartTime, "start time doesn't match")
}

func newTestServer(t *testing.T, name string) *Server {
	u := coretest.NewTester(name)

	repo := daemontest.MakeTestRepo(t, u)

	db := newTestSQLite(t, repo)
	v := vcs.New(db)

	return NewServer(repo, v, nil)
}

func newTestSQLite(t *testing.T, r *ondisk.OnDisk) *sqlitex.Pool {
	pool, err := sqliteschema.Open(r.SQLitePath(), 0, 16)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})

	conn := pool.Get(context.Background())
	defer pool.Put(conn)

	require.NoError(t, sqliteschema.Migrate(conn))

	return pool
}
