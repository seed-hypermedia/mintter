package accounts

import (
	context "context"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	"mintter/backend/pkg/future"
	"mintter/backend/testutil"
	"mintter/backend/vcs/mttacc"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGetAccount_Own(t *testing.T) {
	alice := newTestServer(t, "alice")
	ctx := context.Background()

	want := &accounts.Account{
		Id:      "bahezrj4iaqacicabciqovt22a67pkdi4btvix3rgtjjdn35ztmgjam2br6wdbjohel7bsya",
		Profile: &accounts.Profile{},
		Devices: map[string]*accounts.Device{
			"bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh": {
				PeerId: "bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh",
			},
		},
	}

	acc, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	require.Equal(t, alice.me.MustGet().AccountID().String(), acc.Id)
	testutil.ProtoEqual(t, want, acc, "accounts don't match")
}

func TestAPIUpdateProfile(t *testing.T) {
	alice := newTestServer(t, "alice")
	ctx := context.Background()

	want := &accounts.Account{
		Id: "bahezrj4iaqacicabciqovt22a67pkdi4btvix3rgtjjdn35ztmgjam2br6wdbjohel7bsya",
		Profile: &accounts.Profile{
			Alias: "fake-alias",
			Bio:   "Hackeer",
		},
		Devices: map[string]*accounts.Device{
			"bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh": {
				PeerId: "bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh",
			},
		},
	}

	updated, err := alice.UpdateProfile(ctx, want.Profile)
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, updated, "account must be equal")

	stored, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, stored, "get account must return updated account")
}

func newTestServer(t *testing.T, name string) *Server {
	u := coretest.NewTester(name)

	pool := sqliteschema.MakeTestDB(t)
	db := vcsdb.New(pool)
	ctx := context.Background()

	conn, release, err := db.Conn(ctx)
	require.NoError(t, err)
	defer release()

	err = conn.WithTx(true, func() error {
		_, err := mttacc.Register(ctx, u.Account, u.Device, conn)
		return err
	})
	require.NoError(t, err)

	fut := future.New[core.Identity]()
	require.NoError(t, fut.Resolve(u.Identity))

	return NewServer(fut.ReadOnly, db)
}
