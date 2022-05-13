package wallet

const (
	testCredentials   = "lndhub://c02fa7989240c12194fc:7d06cfd829af4790116f@https://lndhub.io"
	memo              = "include this test memo"
	timeoutSeconds    = 25
	invoiceAmountSats = 1000
)

// func TestReqInvoice(t *testing.T) {
// 	t.Skip("Uncomment skip to run integration tests with BlueWallet")

// 	alice := makeTestService(t, "alice")
// 	bob := makeTestService(t, "bob")

// 	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
// 	defer cancel()
// 	connectPeers(ctx, t, alice, bob, true)

// 	_, err := alice.InsertWallet(ctx, lndhub.LndhubWalletType, testCredentials, "preferred alice wallet")
// 	require.NoError(t, err)

// 	_, err = bob.InsertWallet(ctx, lndhub.LndhubWalletType, testCredentials, "preferred bob wallet")
// 	require.NoError(t, err)

// 	require.NoError(t, alice.SyncAccounts(ctx))

// 	payReq, err := alice.RemoteInvoiceRequest(ctx, AccID(bob.repo.MustAccount().CID()), InvoiceRequest{
// 		AmountSats: invoiceAmountSats,
// 		Memo:       memo,
// 	})
// 	require.NoError(t, err)

// 	invoice, err := lndhub.DecodeInvoice(payReq)
// 	require.NoError(t, err)

// 	require.NotNil(t, invoice.Description, "returned memo shouldn't be empty")
// 	require.Equal(t, memo, *invoice.Description)
// 	require.Equal(t, invoiceAmountSats, int(invoice.MilliSat.ToSatoshis()))

// 	// TODO: pay invoice
// }

// func TestModifyWallets(t *testing.T) {
// 	t.Skip("Uncomment skip to run integration tests with BlueWallet")

// 	alice := makeTestService(t, "alice")

// 	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
// 	defer cancel()

// 	firstWallet, err := alice.InsertWallet(ctx, lndhub.LndhubWalletType, testCredentials, "preferred alice wallet")
// 	require.NoError(t, err)
// 	defaultWallet, err := alice.GetDefaultWallet(ctx)
// 	require.NoError(t, err)
// 	require.Equal(t, firstWallet, defaultWallet)
// 	err = alice.DeleteWallet(ctx, defaultWallet.ID)
// 	require.NoError(t, err)
// 	_, err = alice.GetDefaultWallet(ctx)
// 	require.NoError(t, err)
// }

// func makeTestService(t *testing.T, name string) *Service {
// 	u := coretest.NewTester(name)

// 	db := makeTestSQLite(t)

// 	node, closenode := makeTestPeer(t, u, db)
// 	t.Cleanup(closenode)

// 	fut := future.New[*mttnet.Node]()
// 	require.NoError(t, fut.Resolve(node))

// 	return New(db, fut.ReadOnly)
// }

// func makeTestPeer(t *testing.T, u coretest.Tester, db *sqlitex.Pool) (*mttnet.Node, context.CancelFunc) {
// 	hvcs := vcs.New(db)

// 	reg, err := vcstypes.Register(context.Background(), u.Account, u.Device, hvcs)
// 	require.NoError(t, err)

// 	n, err := mttnet.New(config.P2P{
// 		Addr:        "/ip4/0.0.0.0/tcp/0",
// 		NoRelay:     true,
// 		NoBootstrap: true,
// 		NoMetrics:   true,
// 	}, hvcs, reg, u.Identity, zap.NewNop())
// 	require.NoError(t, err)

// 	errc := make(chan error, 1)
// 	ctx, cancel := context.WithCancel(context.Background())
// 	go func() {
// 		errc <- n.Start(ctx)
// 	}()

// 	t.Cleanup(func() {
// 		require.NoError(t, <-errc)
// 	})

// 	select {
// 	case <-n.Ready():
// 	case err := <-errc:
// 		require.NoError(t, err)
// 	}

// 	return n, cancel
// }

// func makeTestSQLite(t *testing.T) *sqlitex.Pool {
// 	path := testutil.MakeRepoPath(t)

// 	pool, err := sqliteschema.Open(filepath.Join(path, "db.sqlite"), 0, 16)
// 	require.NoError(t, err)
// 	t.Cleanup(func() {
// 		require.NoError(t, pool.Close())
// 	})

// 	conn := pool.Get(context.Background())
// 	defer pool.Put(conn)

// 	require.NoError(t, sqliteschema.Migrate(conn))

// 	return pool
// }
