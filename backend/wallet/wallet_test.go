package wallet

import (
	"context"
	"encoding/hex"
	"seed/backend/config"
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

	kp, err := bob.keyStore.GetKey(ctx, "main")
	require.NoError(t, err)
	bobAccount := kp.Principal()
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
		payreq, err = alice.RequestRemoteInvoice(ctx, bobAccount.String(), int64(amt), &memo)
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

	bobAccount, err := bob.net.AccountForDevice(ctx, bob.net.AddrInfo().ID)
	require.NoError(t, err)
	require.NoError(t, alice.net.Connect(ctx, bob.net.AddrInfo()))

	var amt uint64 = 23
	var wrongAmt uint64 = 24
	var memo = "test invoice"
	var payreq string
	require.Eventually(t, func() bool {
		payreq, err = alice.RequestRemoteInvoice(ctx, bobAccount.String(), int64(amt), &memo)
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

	repo := storage.MakeTestRepo(t)
	db := repo.DB()
	node, closenode := makeTestPeer(t, u, repo)
	t.Cleanup(closenode)

	conn, release, err := db.Conn(context.Background())
	require.NoError(t, err)
	defer release()

	signature, err := u.Account.Sign([]byte(lndhub.SigningMessage))
	require.NoError(t, err)

	require.NoError(t, lndhubsql.SetLoginSignature(conn, hex.EncodeToString(signature)))

	ctx, cancel := context.WithCancel(context.Background())

	t.Cleanup(cancel)
	require.NoError(t, repo.KeyStore().StoreKey(ctx, "main", u.Account))
	srv := New(ctx, logging.New("seed/wallet", "debug"), repo.DB(), repo.KeyStore(), "main", node, false)

	return srv
}

func makeTestPeer(t *testing.T, u coretest.Tester, store *storage.Store) (*mttnet.Node, context.CancelFunc) {
	blobs := hyper.NewStorage(store.DB(), logging.New("seed/hyper", "debug"))
	_, err := daemon.Register(context.Background(), blobs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)
	n, err := mttnet.New(config.P2P{
		NoRelay:        true,
		BootstrapPeers: nil,
		NoMetrics:      true,
	}, store.Device(), store.KeyStore(), store.DB(), blobs, zap.NewNop())
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
