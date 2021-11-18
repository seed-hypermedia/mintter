package backend

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/timestamppb"

	accounts "mintter/backend/api/accounts/v1alpha"
	"mintter/backend/testutil"
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
				RegisterTime: &timestamppb.Timestamp{
					Seconds: -62135596799,
				},
			},
		},
	}

	acc, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, acc, "accounts don't match")
}

func TestAPIGetAccount_Other(t *testing.T) {
	ctx := context.Background()
	aliceb := makeTestBackend(t, "alice", true)
	bobb := makeTestBackend(t, "bob", true)

	alice := newAccountsAPI(aliceb)

	connectPeers(ctx, t, aliceb, bobb, true)

	acc, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{
		Id: bobb.repo.acc.id.String(),
	})
	require.NoError(t, err)

	require.Equal(t, bobb.repo.acc.id.String(), acc.Id, "account ids must match")
	require.Len(t, acc.Devices, 1, "alice must receive the one device from bob")
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
