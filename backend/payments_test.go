package backend

import (
	"context"
	"mintter/backend/lndhub"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

const (
	testCredentials   = "lndhub://c02fa7989240c12194fc:7d06cfd829af4790116f@https://lndhub.io"
	memo              = "include this test memo"
	timeoutSeconds    = 25
	invoiceAmountSats = 1000
)

func TestReqInvoice(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests with BlueWallet")

	alice := makeTestBackend(t, "alice", true)
	bob := makeTestBackend(t, "bob", true)

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
}

func TestModifyWallets(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests with BlueWallet")

	alice := makeTestBackend(t, "alice", true)

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()

	firstWallet, err := alice.InsertWallet(ctx, lndhub.LndhubWalletType, testCredentials, "preferred alice wallet")
	require.NoError(t, err)
	defaultWallet, err := alice.GetDefaultWallet(ctx)
	require.NoError(t, err)
	require.Equal(t, firstWallet, defaultWallet)
	err = alice.DeleteWallet(ctx, defaultWallet.ID)
	require.NoError(t, err)
	_, err = alice.GetDefaultWallet(ctx)
	require.NoError(t, err)
}
