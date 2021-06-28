package backend

import (
	"context"
	"testing"

	accounts "mintter/api/go/accounts/v1alpha"
	"mintter/backend/testutil"

	"github.com/golang/protobuf/ptypes/timestamp"
	"github.com/stretchr/testify/require"
)

func TestAPIGetAccount_Own(t *testing.T) {
	ctx := context.Background()
	back := makeTestBackend(t, "alice", true)
	alice := newAccountsAPI(back)

	want := &accounts.Account{
		Id: "bahezrj4iaqacb2wplid355indqgovc7oe2nfenxpxgnqzebtigh2ymffy4rp4gla",
		Devices: map[string]*accounts.Device{
			"bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh": {
				PeerId: "bafzaajaiaejcausbh36twxwxyoqefku3m44kt5zgsdk6huhrng5izfjl3kiukmuh",
				RegisterTime: &timestamp.Timestamp{
					Seconds: -62135596799,
				},
			},
		},
	}

	acc, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, acc, "accounts don't match")
}

func TestAPIUpdateProfile(t *testing.T) {
	ctx := context.Background()
	back := makeTestBackend(t, "alice", true)
	alice := newAccountsAPI(back)

	update := &accounts.Profile{
		Alias: "fake-alias",
		Bio:   "Hacker",
	}

	acc, err := alice.UpdateProfile(ctx, update)
	require.NoError(t, err)
	testutil.ProtoEqual(t, update, acc.Profile, "account must be equal")

	storedAcc, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, acc, storedAcc, "get account must return updated account")
}

func TestAPIListAccounts(t *testing.T) {
	ctx := context.Background()
	back := makeTestBackend(t, "alice", true)
	api := newAccountsAPI(back)

	list, err := api.ListAccounts(ctx, &accounts.ListAccountsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Accounts, 0)
}
