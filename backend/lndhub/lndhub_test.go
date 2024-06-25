package lndhub

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"math/rand"
	"net/http"
	"seed/backend/core"
	"seed/backend/daemon/storage"
	"seed/backend/wallet/walletsql"
	"strings"
	"testing"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/btcsuite/btcd/btcutil"
	"github.com/stretchr/testify/require"
)

const (
	lndhubDomain    = "ln.testnet.mintter.com"
	lnaddressDomain = "ln.testnet.mintter.com"
	connectionURL   = "https://" + lndhubDomain
)

func TestCreate(t *testing.T) {
	//t.Skip("Uncomment skip to run integration tests with seed lndhub.go")

	const invoiceAmt = 12543
	const invoiceMemo = "test invoice go"
	var nickname = randStringRunes(8)

	pool, err := makeConn(t)
	require.NoError(t, err)

	conn, release, err := pool.Conn(context.Background())
	require.NoError(t, err)
	defer release()

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(640)*time.Second)
	defer cancel()
	keypair, err := core.NewKeyPairRandom()
	require.NoError(t, err)
	pubKeyBytes, err := keypair.PublicKey.MarshalBinary()
	require.NoError(t, err)

	ks := core.NewMemoryKeyStore()
	login := keypair.String()
	passwordBytes, err := keypair.Sign([]byte(SigningMessage))
	password := hex.EncodeToString(passwordBytes)
	require.NoError(t, err)
	lndHubClient := NewClient(context.Background(), &http.Client{}, pool, ks, "main", lndhubDomain, lnaddressDomain)
	lndHubClient.WalletID = credentials2Id("lndhub.go", login, password, lndhubDomain)

	makeTestWallet(t, conn, walletsql.Wallet{
		ID:      lndHubClient.WalletID,
		Address: connectionURL,
		Name:    nickname,
		Type:    "lndhub.go",
		Balance: 0,
	}, login, password, hex.EncodeToString(pubKeyBytes))

	user, err := lndHubClient.Create(ctx, connectionURL, login, password, nickname)
	require.Error(t, err)
	require.NoError(t, ks.StoreKey(ctx, "main", keypair))
	user, err = lndHubClient.Create(ctx, connectionURL, login, password, nickname)
	require.NoError(t, err)
	require.EqualValues(t, login, user.Login)
	require.EqualValues(t, password, user.Password)
	require.EqualValues(t, strings.ToLower(nickname), user.Nickname)
	require.NoError(t, err)
	_, err = lndHubClient.Auth(ctx)
	require.NoError(t, err)
	var newNickname = randStringRunes(8)
	err = lndHubClient.UpdateNickname(ctx, strings.ToUpper(newNickname))
	require.Error(t, err)
	newNickname = strings.ToLower(newNickname)
	err = lndHubClient.UpdateNickname(ctx, newNickname)
	require.NoError(t, err)
	lnaddress, err := lndHubClient.GetLnAddress(ctx)
	require.NoError(t, err)
	require.EqualValues(t, newNickname+"@"+lnaddressDomain, lnaddress)
	balance, err := lndHubClient.GetBalance(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 0, balance)
	payreq, err := lndHubClient.CreateLocalInvoice(ctx, invoiceAmt, invoiceMemo)
	require.NoError(t, err)
	decodedInvoice, err := DecodeInvoice(payreq)
	require.NoError(t, err)
	require.EqualValues(t, invoiceMemo, *decodedInvoice.Description)
	require.EqualValues(t, invoiceAmt, uint64(decodedInvoice.MilliSat.ToSatoshis()))

	const invoiceMemo2 = "zero invoice test amount"
	_, err = lndHubClient.RequestRemoteInvoice(ctx, newNickname, 0, invoiceMemo2)
	require.Error(t, err)
	const invoiceMemo3 = "non-zero invoice test amount"
	const amt = 233
	payreq, err = lndHubClient.RequestRemoteInvoice(ctx, newNickname, amt, invoiceMemo3)
	require.NoError(t, err)
	decodedInvoice, err = DecodeInvoice(payreq)
	require.NoError(t, err)
	require.EqualValues(t, invoiceMemo3, *decodedInvoice.Description)
	require.EqualValues(t, amt, decodedInvoice.MilliSat.ToSatoshis().ToUnit(btcutil.AmountSatoshi)) // when amt is zero, the result is nil
	invoices, err := lndHubClient.ListReceivedInvoices(ctx)
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(invoices), 1)
	//TODO: test for invoice metadata
}

func randStringRunes(n int) string {
	var letterRunes = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
	rand.Seed(time.Now().UnixNano())
	b := make([]rune, n)
	for i := range b {
		b[i] = letterRunes[rand.Intn(len(letterRunes))]
	}
	return string(b)
}

func makeTestWallet(t *testing.T, conn *sqlite.Conn, wallet walletsql.Wallet, login, pass, token string) {
	binaryToken := []byte(token)   // TODO: encrypt the token before storing
	binaryLogin := []byte(login)   // TODO: encrypt the login before storing
	binaryPassword := []byte(pass) // TODO: encrypt the password before storing

	require.NoError(t, walletsql.InsertWallet(conn, wallet, binaryLogin, binaryPassword, binaryToken))
}

func makeConn(t *testing.T) (*sqlitex.Pool, error) {
	return storage.MakeTestDB(t), nil
}

func credentials2Id(wType, login, password, domain string) string {
	url := wType + "://" + login + ":" + password + "@https://" + domain
	h := sha256.Sum256([]byte(url))
	return hex.EncodeToString(h[:])
}
