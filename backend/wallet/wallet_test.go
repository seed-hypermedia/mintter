package wallet

import (
	"context"
	"encoding/hex"
	"seed/backend/config"
	"seed/backend/core"
	"seed/backend/core/coretest"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	"seed/backend/daemon/storage"
	"seed/backend/hyper"
	"seed/backend/lndhub"
	"seed/backend/lndhub/lndhubsql"
	"seed/backend/logging"
	"seed/backend/mttnet"
	"seed/backend/pkg/future"
	"seed/backend/wallet/walletsql"
	"testing"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestModifyWallets(t *testing.T) {
	//t.Skip("Uncomment skip to run integration tests with BlueWallet")

	alice := makeTestService(t, "alice")

	ctx := context.Background()
	var err error
	var defaultWallet walletsql.Wallet
	uri, err := alice.ExportWallet(ctx, "")
	require.NoError(t, err)
	seedWallet, err := alice.InsertWallet(ctx, uri, "default")
	require.NoError(t, err)
	require.Eventually(t, func() bool { defaultWallet, err = alice.GetDefaultWallet(ctx); return err == nil }, 7*time.Second, 2*time.Second)
	require.Equal(t, seedWallet, defaultWallet)
	require.Eventually(t, func() bool {
		conn, release, err := alice.pool.Conn(ctx)
		require.NoError(t, err)
		defer release()
		_, err = lndhubsql.GetToken(conn, defaultWallet.ID)
		return err == nil
	}, 3*time.Second, 1*time.Second)
	require.EqualValues(t, lndhubsql.LndhubGoWalletType, defaultWallet.Type)
	err = alice.DeleteWallet(ctx, defaultWallet.ID)
	require.Error(t, err)
	const newName = "new wallet name"
	_, err = alice.UpdateWalletName(ctx, defaultWallet.ID, newName)
	require.NoError(t, err)

	wallets, err := alice.ListWallets(ctx, true)
	require.NoError(t, err)
	require.EqualValues(t, 1, len(wallets))
	require.EqualValues(t, newName, wallets[0].Name)
}

func TestRequestLndHubInvoice(t *testing.T) {
	//t.Skip("Uncomment skip to run integration tests with BlueWallet")
	var err error
	alice := makeTestService(t, "alice")
	bob := makeTestService(t, "bob")
	ctx := context.Background()
	aliceURI, err := alice.ExportWallet(ctx, "")
	require.NoError(t, err)
	_, err = alice.InsertWallet(ctx, aliceURI, "default")
	require.NoError(t, err)
	bobURI, err := bob.ExportWallet(ctx, "")
	require.NoError(t, err)
	_, err = bob.InsertWallet(ctx, bobURI, "default")
	require.NoError(t, err)
	require.Eventually(t, func() bool { _, ok := bob.net.Get(); return ok }, 5*time.Second, 1*time.Second)
	cid := bob.net.MustGet().ID().Account().Principal()
	var amt uint64 = 23
	var wrongAmt uint64 = 24
	var memo = "test invoice"

	var payreq string
	var defaultWallet walletsql.Wallet
	require.Eventually(t, func() bool { defaultWallet, err = bob.GetDefaultWallet(ctx); return err == nil }, 7*time.Second, 3*time.Second)
	require.Eventually(t, func() bool {
		conn, release, err := bob.pool.Conn(ctx)
		require.NoError(t, err)
		defer release()
		_, err = lndhubsql.GetToken(conn, defaultWallet.ID)
		return err == nil
	}, 3*time.Second, 1*time.Second)
	require.Eventually(t, func() bool {
		payreq, err = alice.RequestRemoteInvoice(ctx, cid.String(), int64(amt), &memo)
		return err == nil
	}, 8*time.Second, 2*time.Second)
	invoice, err := lndhub.DecodeInvoice(payreq)
	require.NoError(t, err)
	require.EqualValues(t, amt, invoice.MilliSat.ToSatoshis())
	require.EqualValues(t, memo, *invoice.Description)
	_, err = alice.PayInvoice(ctx, payreq, nil, &wrongAmt)
	require.ErrorIs(t, err, lndhubsql.ErrQtyMissmatch)
	_, err = alice.PayInvoice(ctx, payreq, nil, &amt)
	require.ErrorIs(t, err, lndhubsql.ErrNotEnoughBalance)
}

func TestRequestP2PInvoice(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests")

	alice := makeTestService(t, "alice")
	bob := makeTestService(t, "bob")
	ctx := context.Background()

	require.Eventually(t, func() bool { _, ok := alice.net.Get(); return ok }, 5*time.Second, 1*time.Second)
	require.NoError(t, alice.net.MustGet().Connect(ctx, bob.net.MustGet().AddrInfo()))

	require.Eventually(t, func() bool { _, ok := bob.net.Get(); return ok }, 3*time.Second, 1*time.Second)
	cid := bob.net.MustGet().ID().Account().Principal()
	var amt uint64 = 23
	var wrongAmt uint64 = 24
	var memo = "test invoice"
	var err error
	var payreq string
	require.Eventually(t, func() bool {
		payreq, err = alice.RequestRemoteInvoice(ctx, cid.String(), int64(amt), &memo)
		return err == nil
	}, 8*time.Second, 2*time.Second)
	invoice, err := lndhub.DecodeInvoice(payreq)
	require.NoError(t, err)
	require.EqualValues(t, amt, invoice.MilliSat.ToSatoshis())
	require.EqualValues(t, memo, *invoice.Description)
	_, err = alice.PayInvoice(ctx, payreq, nil, &wrongAmt)
	require.ErrorIs(t, err, lndhubsql.ErrQtyMissmatch)
	_, err = alice.PayInvoice(ctx, payreq, nil, &amt)
	require.ErrorIs(t, err, lndhubsql.ErrNotEnoughBalance)
}

func makeTestService(t *testing.T, name string) *Service {
	u := coretest.NewTester(name)

	db := storage.MakeTestDB(t)

	node, closenode := makeTestPeer(t, u, db)
	t.Cleanup(closenode)

	fut := future.New[*mttnet.Node]()
	require.NoError(t, fut.Resolve(node))

	identity := future.New[core.Identity]()

	require.NoError(t, identity.Resolve(u.Identity))

	conn, release, err := db.Conn(context.Background())
	require.NoError(t, err)
	defer release()

	signature, err := u.Account.Sign([]byte(lndhub.SigningMessage))
	require.NoError(t, err)

	require.NoError(t, lndhubsql.SetLoginSignature(conn, hex.EncodeToString(signature)))

	ctx, cancel := context.WithCancel(context.Background())

	t.Cleanup(cancel)

	srv := New(ctx, logging.New("seed/wallet", "debug"), db, fut.ReadOnly, identity.ReadOnly, false)

	return srv
}

func makeTestPeer(t *testing.T, u coretest.Tester, db *sqlitex.Pool) (*mttnet.Node, context.CancelFunc) {
	blobs := hyper.NewStorage(db, logging.New("seed/hyper", "debug"))
	_, err := daemon.Register(context.Background(), blobs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)

	n, err := mttnet.New(config.P2P{
		NoRelay:        true,
		BootstrapPeers: nil,
		NoMetrics:      true,
	}, db, blobs, u.Identity, zap.NewNop(), "debug")
	require.NoError(t, err)

	errc := make(chan error, 1)
	ctx, cancel := context.WithCancel(context.Background())
	f := future.New[*mttnet.Node]()
	require.NoError(t, f.Resolve(n))
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
