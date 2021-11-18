package lndhub

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

const (
	syntaxErrorCredentials   = "lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@http://lndhub.io"
	syntaxErrorCredentials2  = "lndhub://c227a7fb5c71a22fac33d2a48ab779aa1b02e858@https://lndhub.io"
	syntaxErrorCredentials3  = "c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io"
	semanticErrorCredentials = "lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io"
	goodCredentials          = "lndhub://c02fa7989240c12194fc:7d06cfd829af4790116f@https://lndhub.io"
)

func TestLndhub(t *testing.T) {
	tests := [...]struct {
		name             string
		credentials      string
		generateInvoice  bool
		payInvoice       bool
		timeout_millisec int
		mustFail         bool
	}{
		{
			name:             "syntaxErrorCredentials",
			credentials:      syntaxErrorCredentials,
			generateInvoice:  false,
			payInvoice:       false,
			timeout_millisec: 10000,
			mustFail:         true,
		},
		{
			name:             "syntaxErrorCredentials2",
			credentials:      syntaxErrorCredentials2,
			generateInvoice:  false,
			payInvoice:       false,
			timeout_millisec: 10000,
			mustFail:         true,
		},
		{
			name:             "syntaxErrorCredentials3",
			credentials:      syntaxErrorCredentials3,
			generateInvoice:  false,
			payInvoice:       false,
			timeout_millisec: 10000,
			mustFail:         true,
		},
		{
			name:             "semanticErrorCredentials",
			credentials:      semanticErrorCredentials,
			generateInvoice:  false,
			payInvoice:       false,
			timeout_millisec: 10000,
			mustFail:         true,
		},
		{
			name:             "goodCredentials",
			credentials:      goodCredentials,
			generateInvoice:  false,
			payInvoice:       false,
			timeout_millisec: 10000,
			mustFail:         false,
		},
		{
			name:             "generateInvoice",
			credentials:      goodCredentials,
			generateInvoice:  true,
			payInvoice:       false,
			timeout_millisec: 10000,
			mustFail:         false,
		},
		{
			name:             "payInvoice",
			credentials:      goodCredentials,
			generateInvoice:  true,
			payInvoice:       true,
			timeout_millisec: 10000,
			mustFail:         true,
		},
		{
			name:             "timeout",
			credentials:      goodCredentials,
			generateInvoice:  true,
			payInvoice:       true,
			timeout_millisec: 10,
			mustFail:         true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := lndhubTest(t, tt.credentials, tt.generateInvoice, tt.payInvoice, tt.timeout_millisec)
			if tt.mustFail {
				require.Error(t, err, tt.name+". must fail")
			} else {
				require.NoError(t, err, tt.name+". must succeed")
			}

		})
	}

}

func lndhubTest(t *testing.T, url string, generateInvoice, payInvoice bool, timeout_millisec int) error {

	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout_millisec)*time.Millisecond)
	defer cancel()
	memo := "test invoice"
	amt := 100
	creds, err := ParseCredentials(url)
	lndHubClient := NewClient(&http.Client{})
	if err != nil {
		return err
	} else if creds.Token, err = lndHubClient.Auth(ctx, creds); err != nil {
		return err

	} else if balance, err := lndHubClient.GetBalance(ctx, creds); err != nil {
		return err
	} else if balance != 0 {
		return fmt.Errorf("unexpected balance of " + strconv.FormatInt(int64(balance), 10) + " expected 0")
	}

	if generateInvoice {
		if pay_req, err := lndHubClient.CreateInvoice(ctx, creds, uint64(amt), memo); err != nil {
			return err

		} else if invoice, err := DecodeInvoice(pay_req); err != nil {
			return err

		} else if api_invoice, err := DecodeInvoice(pay_req); err != nil {
			return err

		} else if *api_invoice.Description != memo {
			return fmt.Errorf("decoded invoice memo " + *api_invoice.Description + " expected:" + memo)

		} else if uint64(api_invoice.MilliSat.ToSatoshis()) != uint64(amt) {
			return fmt.Errorf("Decoded invoice amt " + api_invoice.MilliSat.ToSatoshis().String() + " expected:" + strconv.FormatInt(int64(amt), 10))

		} else if payInvoice {
			if err := lndHubClient.PayInvoice(ctx, creds, pay_req, uint64(invoice.MilliSat.ToSatoshis())); err != nil {
				return err
			} else {
				return nil
			}
		} else {
			return nil
		}
	} else {
		return nil
	}

}
