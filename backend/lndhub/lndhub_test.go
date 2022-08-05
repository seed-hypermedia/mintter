package lndhub

import (
	"context"
	"fmt"
	"io/ioutil"
	"math/rand"
	"mintter/backend/db/sqliteschema"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/stretchr/testify/require"
)

const (
	syntaxErrorCredentials   = "lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@http://lndhub.io"
	syntaxErrorCredentials2  = "lndhub://c227a7fb5c71a22fac33d2a48ab779aa1b02e858@https://lndhub.io"
	syntaxErrorCredentials3  = "c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io"
	semanticErrorCredentials = "lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io"
	goodCredentials          = "lndhub://c02fa7989240c12194fc:7d06cfd829af4790116f@https://lndhub.io"
	connectionURL            = "https://ln.testnet.mintter.com"
)

func TestCreate(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests with mintter lndhub.go")

	const token = "eacf5a07bef50d1c0cea8bee269a5236efb99b0c9033418fac30a5c722fe1960"
	const login = "bahezrj4iaqacicabciqovt22a67pkdi4btvix3rgtjjdn35ztmgjam2br6wdbjohel7bsya"
	const password = "ed5ef5dd87d98b64123125beb594b26a5434be6fc7a088a006d42b5f11323b84ff5417e3fca1643589eb6e617801809b422e31e2d818dae21e10b3f613539d0c"
	var nickname = randStringRunes(6)

	pool, err := makeConn(t)
	require.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(60)*time.Second)
	defer cancel()
	lndHubClient := NewClient(&http.Client{}, pool)
	user, err := lndHubClient.Create(ctx, connectionURL, login, password, token, nickname)
	require.NoError(t, err)
	require.EqualValues(t, login, user.Login)
	require.EqualValues(t, password, user.Password)
	require.EqualValues(t, nickname, user.Nickname)
	var newNickname = randStringRunes(6)
	user, err = lndHubClient.Create(ctx, connectionURL, login, password, token, newNickname)
	require.NoError(t, err)

}

/*
func TestGetbalance(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests with mintter lndhub.go")

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(10)*time.Second)
	defer cancel()
	lndHubClient := NewClient(&http.Client{})
	token, err := lndHubClient.Auth(ctx, connectionURL)
	require.NoError(t, err)
	balance, err := lndHubClient.GetBalance(ctx, connectionURL)
	require.NoError(t, err)
	require.EqualValues(t, 0, balance)

}*/
func TestLndhub(t *testing.T) {
	t.Skip("Uncomment skip to run integration tests with BlueWallet")

	tests := [...]struct {
		name            string
		credentials     string
		generateInvoice bool
		payInvoice      bool
		timeoutMillisec int
		mustFail        bool
	}{
		{
			name:            "syntaxErrorCredentials",
			credentials:     syntaxErrorCredentials,
			generateInvoice: false,
			payInvoice:      false,
			timeoutMillisec: 10000,
			mustFail:        true,
		},
		{
			name:            "syntaxErrorCredentials2",
			credentials:     syntaxErrorCredentials2,
			generateInvoice: false,
			payInvoice:      false,
			timeoutMillisec: 10000,
			mustFail:        true,
		},
		{
			name:            "syntaxErrorCredentials3",
			credentials:     syntaxErrorCredentials3,
			generateInvoice: false,
			payInvoice:      false,
			timeoutMillisec: 10000,
			mustFail:        true,
		},
		{
			name:            "semanticErrorCredentials",
			credentials:     semanticErrorCredentials,
			generateInvoice: false,
			payInvoice:      false,
			timeoutMillisec: 10000,
			mustFail:        true,
		},
		{
			name:            "goodCredentials",
			credentials:     goodCredentials,
			generateInvoice: false,
			payInvoice:      false,
			timeoutMillisec: 10000,
			mustFail:        false,
		},
		{
			name:            "generateInvoice",
			credentials:     goodCredentials,
			generateInvoice: true,
			payInvoice:      false,
			timeoutMillisec: 10000,
			mustFail:        false,
		},
		{
			name:            "payInvoice",
			credentials:     goodCredentials,
			generateInvoice: true,
			payInvoice:      true,
			timeoutMillisec: 10000,
			mustFail:        true,
		},
		{
			name:            "timeout",
			credentials:     goodCredentials,
			generateInvoice: true,
			payInvoice:      false,
			timeoutMillisec: 10,
			mustFail:        true,
		},
	}
	pool, err := makeConn(t)
	require.NoError(t, err)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := lndhubTest(t, pool, tt.credentials, tt.generateInvoice, tt.payInvoice, tt.timeoutMillisec)
			if tt.mustFail {
				require.Error(t, err, tt.name+". must fail")
			} else {
				require.NoError(t, err, tt.name+". must succeed")
			}

		})
	}

}

func lndhubTest(t *testing.T, pool *sqlitex.Pool, connectionURL string, generateInvoice, payInvoice bool, timeoutMillisec int) error {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutMillisec)*time.Millisecond)
	defer cancel()
	memo := "test invoice"
	amt := 100

	lndHubClient := NewClient(&http.Client{}, pool)
	if _, err := lndHubClient.Auth(ctx, connectionURL); err != nil {
		return err

	} else if balance, err := lndHubClient.GetBalance(ctx, connectionURL); err != nil {
		return err
	} else if balance != 0 {
		return fmt.Errorf("unexpected balance of " + strconv.FormatInt(int64(balance), 10) + " expected 0")
	}

	if generateInvoice {
		if payReq, err := lndHubClient.CreateInvoice(ctx, connectionURL, int64(amt), memo); err != nil {
			return err

		} else if invoice, err := DecodeInvoice(payReq); err != nil {
			return err

		} else if apiInvoice, err := DecodeInvoice(payReq); err != nil {
			return err

		} else if *apiInvoice.Description != memo {
			return fmt.Errorf("decoded invoice memo " + *apiInvoice.Description + " expected:" + memo)

		} else if uint64(apiInvoice.MilliSat.ToSatoshis()) != uint64(amt) {
			return fmt.Errorf("Decoded invoice amt " + apiInvoice.MilliSat.ToSatoshis().String() + " expected:" + strconv.FormatInt(int64(amt), 10))

		} else if payInvoice {
			if err := lndHubClient.PayInvoice(ctx, connectionURL, payReq, uint64(invoice.MilliSat.ToSatoshis())); err != nil {
				return err
			}
			return nil

		}
	}
	return nil

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
