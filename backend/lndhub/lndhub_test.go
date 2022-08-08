package lndhub

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io/ioutil"
	"math/rand"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/wallet/walletsql"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

const (
	syntaxErrorCredentials   = "lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@http://lndhub.io"
	syntaxErrorCredentials2  = "lndhub://c227a7fb5c71a22fac33d2a48ab779aa1b02e858@https://lndhub.io"
	syntaxErrorCredentials3  = "c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io"
	semanticErrorCredentials = "lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io"
	goodCredentials          = "lndhub://c02fa7989240c12194fc:7d06cfd829af4790116f@https://lndhub.io"
	connectionURL            = "https://" + MintterDomain
	pubkey                   = "eacf5a07bef50d1c0cea8bee269a5236efb99b0c9033418fac30a5c722fe1960"
)

func TestCreate(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests with mintter lndhub.go")

	const login = "bahezrj4iaqacicabciqovt22a67pkdi4btvix3rgtjjdn35ztmgjam2br6wdbjohel7bsya"
	const password = "ed5ef5dd87d98b64123125beb594b26a5434be6fc7a088a006d42b5f11323b84ff5417e3fca1643589eb6e617801809b422e31e2d818dae21e10b3f613539d0c"
	const invoiceAmt = 12543
	const invoiceMemo = "test invoice go"
	var nickname = randStringRunes(6)

	pool, err := makeConn(t)
	require.NoError(t, err)
	conn := pool.Get(context.Background())
	defer pool.Put(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(60)*time.Second)
	defer cancel()
	lndHubClient := NewClient(&http.Client{}, pool, pubkey)
	lndHubClient.WalletID = credentials2Id("lndhub.go", login, password, MintterDomain)

	makeTestWallet(t, conn, walletsql.Wallet{
		ID:      lndHubClient.WalletID,
		Address: connectionURL,
		Name:    nickname,
		Type:    "lndhub.go",
		Balance: 0,
	}, login, password, pubkey)

	user, err := lndHubClient.Create(ctx, connectionURL, login, password, nickname)
	require.NoError(t, err)
	require.EqualValues(t, login, user.Login)
	require.EqualValues(t, password, user.Password)
	require.EqualValues(t, nickname, user.Nickname)
	require.NoError(t, err)
	_, err = lndHubClient.Auth(ctx)
	require.NoError(t, err)
	var newNickname = randStringRunes(6)
	err = lndHubClient.UpdateNickname(ctx, newNickname)
	require.NoError(t, err)
	lnaddress, err := lndHubClient.GetLnAddress(ctx)
	require.NoError(t, err)
	require.EqualValues(t, newNickname+"@"+MintterDomain, lnaddress)
	balance, err := lndHubClient.GetBalance(ctx)
	require.NoError(t, err)
	require.EqualValues(t, 0, balance)
	payreq, err := lndHubClient.CreateInvoice(ctx, invoiceAmt, invoiceMemo)
	require.NoError(t, err)
	decodedInvoice, err := DecodeInvoice(payreq)
	require.NoError(t, err)
	require.EqualValues(t, invoiceMemo, *decodedInvoice.Description)
	require.EqualValues(t, invoiceAmt, uint64(decodedInvoice.MilliSat.ToSatoshis()))
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
	dir, err := ioutil.TempDir("", "sqlitegen-")
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			os.RemoveAll(dir)
		}
	}()

	pool, err := sqliteschema.Open(filepath.Join(dir, "db.sqlite"), 0, 16)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})

	conn := pool.Get(context.Background())
	defer pool.Put(conn)
	require.NoError(t, sqliteschema.Migrate(conn))

	return pool, nil

}

func credentials2Id(wType, login, password, domain string) string {
	url := wType + "://" + login + ":" + password + "@https://" + domain
	h := sha256.Sum256([]byte(url))
	return hex.EncodeToString(h[:])
}
