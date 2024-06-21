package accounts

import (
	context "context"
	"seed/backend/core"
	"seed/backend/core/coretest"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	"seed/backend/daemon/storage"
	accounts "seed/backend/genproto/accounts/v1alpha"
	"seed/backend/hyper"
	"seed/backend/logging"
	"seed/backend/testutil"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestGetAccount_Own(t *testing.T) {
	alice := newTestServer(t, "alice")
	ctx := context.Background()

	want := &accounts.Account{
		Id:      "z6MkvFrq593SZ3QNsAgXdsHC2CJGrrwUdwxY2EdRGaT4UbYj",
		Profile: &accounts.Profile{},
		Devices: map[string]*accounts.Device{
			"12D3KooWFMTJanyH3XttUC2AmS9fZnbeYsxbAjSEvyCeHVbHBX3C": {
				DeviceId: "12D3KooWFMTJanyH3XttUC2AmS9fZnbeYsxbAjSEvyCeHVbHBX3C",
			},
		},
		IsTrusted: true,
	}
	acc, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, acc, "accounts don't match")

	acc, err = alice.GetAccount(ctx, &accounts.GetAccountRequest{Id: "z6MkvFrq593SZ3QNsAgXdsHC2CJGrrwUdwxY2EdRGaT4UbYj"})
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, acc, "accounts don't match")
}

func TestGetAccount_Failures(t *testing.T) {
	alice := newTestServer(t, "alice")
	bob := coretest.NewTester("bob")
	ctx := context.Background()

	acc, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{
		Id: bob.Account.Principal().String(),
	})
	require.Error(t, err, "alice must not have bob's account")
	require.Nil(t, acc)
}

func TestAPIUpdateProfile(t *testing.T) {
	alice := newTestServer(t, "alice")
	ctx := context.Background()

	want := &accounts.Account{
		Id: "z6MkvFrq593SZ3QNsAgXdsHC2CJGrrwUdwxY2EdRGaT4UbYj",
		Profile: &accounts.Profile{
			Alias: "fake-alias",
			Bio:   "Hacker",
		},
		Devices: map[string]*accounts.Device{
			"12D3KooWFMTJanyH3XttUC2AmS9fZnbeYsxbAjSEvyCeHVbHBX3C": {
				DeviceId: "12D3KooWFMTJanyH3XttUC2AmS9fZnbeYsxbAjSEvyCeHVbHBX3C",
			},
		},
		IsTrusted: true,
	}

	updated, err := alice.UpdateProfile(ctx, want.Profile)
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, updated, "account must be equal")
	stored, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, stored, "get account must return updated account")

	// Removing bio inserting fake avatar.
	{
		want := &accounts.Account{
			Id: "z6MkvFrq593SZ3QNsAgXdsHC2CJGrrwUdwxY2EdRGaT4UbYj",
			Profile: &accounts.Profile{
				Alias:  "fake-alias",
				Avatar: "bafybeibjbq3tmmy7wuihhhwvbladjsd3gx3kfjepxzkq6wylik6wc3whzy",
			},
			Devices: map[string]*accounts.Device{
				"12D3KooWFMTJanyH3XttUC2AmS9fZnbeYsxbAjSEvyCeHVbHBX3C": {
					DeviceId: "12D3KooWFMTJanyH3XttUC2AmS9fZnbeYsxbAjSEvyCeHVbHBX3C",
				},
			},
			IsTrusted: true,
		}

		updated, err := alice.UpdateProfile(ctx, want.Profile)
		require.NoError(t, err)
		testutil.ProtoEqual(t, want, updated, "account must be equal")

		stored, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{})
		require.NoError(t, err)
		testutil.ProtoEqual(t, want, stored, "get account must return updated account")
	}
}

func TestTrustOwnAccount(t *testing.T) {
	alice := newTestServer(t, "alice")
	bob := coretest.NewTester("bob")
	ctx := context.Background()
	acc, err := alice.SetAccountTrust(ctx, &accounts.SetAccountTrustRequest{
		Id:        bob.Account.Principal().String(),
		IsTrusted: true,
	})
	require.Error(t, err, "Alice must not have Bob's account")
	require.Nil(t, acc)
	acc, err = alice.GetAccount(ctx, &accounts.GetAccountRequest{}) //No id=own account
	require.NoError(t, err)
	require.True(t, acc.IsTrusted)
}

// TODO: update profile idempotent no change

func newTestServer(t *testing.T, name string) *Server {
	u := coretest.NewTester(name)

	pool := storage.MakeTestDB(t)
	ctx := context.Background()
	blobs := hyper.NewStorage(pool, logging.New("seed/hyper", "debug"))

	_, err := daemon.Register(ctx, blobs, u.Account, u.Device.PublicKey, time.Now().UTC().Add(-1*time.Hour))
	require.NoError(t, err)

	ks := core.NewMemoryKeyStore()
	require.NoError(t, ks.StoreKey(ctx, "main", u.Account))

	return NewServer(ks, blobs)
}
