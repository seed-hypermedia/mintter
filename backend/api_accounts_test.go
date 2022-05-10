package backend

// func TestAPIGetAccount_Other(t *testing.T) {
// 	ctx := context.Background()
// 	aliceb := makeTestBackend(t, "alice", true)
// 	bobb := makeTestBackend(t, "bob", true)

// 	alice := newAccountsAPI(aliceb, provideVCS)

// 	connectPeers(ctx, t, aliceb, bobb, true)

// 	acc, err := alice.GetAccount(ctx, &accounts.GetAccountRequest{
// 		Id: bobb.repo.MustAccount().CID().String(),
// 	})
// 	require.NoError(t, err)

// 	require.Equal(t, bobb.repo.MustAccount().CID().String(), acc.Id, "account ids must match")
// 	require.Len(t, acc.Devices, 1, "alice must receive the one device from bob")
// }

// func TestAPIListAccounts(t *testing.T) {
// 	ctx := context.Background()
// 	alice := makeTestBackend(t, "alice", true)
// 	aapi := newAccountsAPI(alice)

// 	list, err := aapi.ListAccounts(ctx, &accounts.ListAccountsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, list.Accounts, 0)

// 	bob := makeTestBackend(t, "bob", true)
// 	bapi := newAccountsAPI(bob)

// 	connectPeers(ctx, t, alice, bob, true)

// 	list, err = bapi.ListAccounts(ctx, &accounts.ListAccountsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, list.Accounts, 1, "bob must only have one account after connecting to alice")
// 	require.Len(t, list.Accounts[0].Devices, 1, "bob must only list devices from alice on her account")
// 	require.Equal(t, alice.repo.Device().CID().String(), list.Accounts[0].Devices[alice.repo.Device().CID().String()].PeerId, "bob must have alice's device id")
// }
