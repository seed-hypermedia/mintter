package accounts

import (
	context "context"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/testutil"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	"path/filepath"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

func TestGetAccount_Own(t *testing.T) {
	alice := newTestServer(t, "alice")
	ctx := context.Background()

	want := &Account{
		Id:      "bahezrj4iaqacicabciqovt22a67pkdi4btvix3rgtjjdn35ztmgjam2br6wdbjohel7bsya",
		Profile: &Profile{},
		Devices: map[string]*Device{
			"bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh": {
				PeerId: "bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh",
			},
		},
	}

	acc, err := alice.GetAccount(ctx, &GetAccountRequest{})
	require.NoError(t, err)
	require.Equal(t, alice.me.AccountID().String(), acc.Id)
	testutil.ProtoEqual(t, want, acc, "accounts don't match")
}

func TestAPIUpdateProfile(t *testing.T) {
	alice := newTestServer(t, "alice")
	ctx := context.Background()

	want := &Account{
		Id: "bahezrj4iaqacicabciqovt22a67pkdi4btvix3rgtjjdn35ztmgjam2br6wdbjohel7bsya",
		Profile: &Profile{
			Alias: "fake-alias",
			Bio:   "Hackeer",
		},
		Devices: map[string]*Device{
			"bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh": {
				PeerId: "bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh",
			},
		},
	}

	updated, err := alice.UpdateProfile(ctx, want.Profile)
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, updated, "account must be equal")

	stored, err := alice.GetAccount(ctx, &GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, stored, "get account must return updated account")
}

func newTestServer(t *testing.T, name string) *Server {
	u := coretest.NewTester(name)

	db := newTestSQLite(t)
	v := vcs.New(db)

	_, err := vcstypes.Register(context.Background(), u.Account, u.Device, v)
	require.NoError(t, err)

	return NewServer(u.Identity, v)
}

func newTestSQLite(t *testing.T) *sqlitex.Pool {
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
