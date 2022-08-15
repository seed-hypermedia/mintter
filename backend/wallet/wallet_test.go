package wallet

import (
	"context"
	"encoding/hex"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/lndhub"
	"mintter/backend/lndhub/lndhubsql"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/testutil"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	"path/filepath"
	"testing"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

const (
	testCredentials   = "lndhub://c02fa7989240c12194fc:7d06cfd829af4790116f@https://lndhub.io"
	memo              = "include this test memo"
	timeoutSeconds    = 125
	invoiceAmountSats = 1000
)

/*
func TestReqInvoice(t *testing.T) {
	//t.Skip("Uncomment skip to run integration tests with BlueWallet")

	alice := makeTestService(t, "alice")
	bob := makeTestService(t, "bob")

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()
	connectPeers(ctx, t, alice, bob, true)

	_, err := alice.InsertWallet(ctx, lndhub.LndhubWalletType, testCredentials, "preferred alice wallet")
	require.NoError(t, err)

	_, err = bob.InsertWallet(ctx, lndhub.LndhubWalletType, testCredentials, "preferred bob wallet")
	require.NoError(t, err)

	require.NoError(t, alice.SyncAccounts(ctx))

	payReq, err := alice.RemoteInvoiceRequest(ctx, AccID(bob.repo.MustAccount().CID()), InvoiceRequest{
		AmountSats: invoiceAmountSats,
		Memo:       memo,
	})
	require.NoError(t, err)

	invoice, err := lndhub.DecodeInvoice(payReq)
	require.NoError(t, err)

	require.NotNil(t, invoice.Description, "returned memo shouldn't be empty")
	require.Equal(t, memo, *invoice.Description)
	require.Equal(t, invoiceAmountSats, int(invoice.MilliSat.ToSatoshis()))

	// TODO: pay invoice
} */

func TestModifyWallets(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests with BlueWallet")

	alice := makeTestService(t, "alice")

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()
	time.Sleep(10 * time.Second) // wait until internal wallet is registered
	defaultWallet, err := alice.GetDefaultWallet(ctx)
	require.NoError(t, err)
	require.EqualValues(t, lndhubsql.LndhubGoWalletType, defaultWallet.Type)
	err = alice.DeleteWallet(ctx, defaultWallet.ID)
	require.Error(t, err)
	const newName = "new wallet name"
	_, err = alice.UpdateWalletName(ctx, defaultWallet.ID, newName)
	require.NoError(t, err)
	wallets, err := alice.ListWallets(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 1, len(wallets))
	require.EqualValues(t, newName, wallets[0].Name)
}

func TestRequestP2PInvoice(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests with BlueWallet")

	alice := makeTestService(t, "alice")
	bob := makeTestService(t, "bob")
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()
	time.Sleep(10 * time.Second) // wait until internal wallet is registered
	require.NoError(t, alice.net.MustGet().Connect(ctx, bob.net.MustGet().AddrInfo()))

	cid := bob.net.MustGet().ID().AccountID()
	const amt = 23
	var memo = "test invoice"
	payreq, err := alice.RequestRemoteInvoice(ctx, cid.String(), amt, &memo)
	require.NoError(t, err)
	invoice, err := lndhub.DecodeInvoice(payreq)
	require.NoError(t, err)
	require.EqualValues(t, amt, invoice.MilliSat.ToSatoshis())
	require.EqualValues(t, memo, *invoice.Description)
}

func makeTestService(t *testing.T, name string) *Service {
	u := coretest.NewTester(name)

	db := makeTestSQLite(t)

	node, closenode := makeTestPeer(t, u, db)
	t.Cleanup(closenode)

	fut := future.New[*mttnet.Node]()
	require.NoError(t, fut.Resolve(node))

	identity := future.New[core.Identity]()

	require.NoError(t, identity.Resolve(u.Identity))

	conn := db.Get(context.Background())
	defer db.Put(conn)

	signature, err := u.Account.Sign([]byte(lndhub.SigninMessage))
	require.NoError(t, err)

	require.NoError(t, lndhubsql.SetLoginSignature(conn, hex.EncodeToString(signature)))

	srv := New(context.Background(), db, fut.ReadOnly, identity.ReadOnly)

	return srv
}

func makeTestPeer(t *testing.T, u coretest.Tester, db *sqlitex.Pool) (*mttnet.Node, context.CancelFunc) {
	hvcs := vcs.New(db)

	reg, err := vcstypes.Register(context.Background(), u.Account, u.Device, hvcs)
	require.NoError(t, err)

	n, err := mttnet.New(config.P2P{
		NoRelay:     true,
		NoBootstrap: true,
		NoMetrics:   true,
	}, hvcs, reg, u.Identity, zap.NewNop())
	require.NoError(t, err)

	errc := make(chan error, 1)
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		errc <- n.Start(ctx)
	}()

	t.Cleanup(func() {
		require.NoError(t, <-errc)
	})

	select {
	case <-n.Ready():
	case err := <-errc:
		require.NoError(t, err)
	}

	return n, cancel
}

func makeTestSQLite(t *testing.T) *sqlitex.Pool {
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
