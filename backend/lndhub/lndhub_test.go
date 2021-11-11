package lndhub

import (
	"fmt"
	"strconv"
	"testing"

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
		name        string
		credentials string
		mustFail    bool
	}{
		{
			name:        "syntaxErrorCredentials",
			credentials: syntaxErrorCredentials,
			mustFail:    true,
		},
		{
			name:        "syntaxErrorCredentials2",
			credentials: syntaxErrorCredentials2,
			mustFail:    true,
		},
		{
			name:        "syntaxErrorCredentials3",
			credentials: syntaxErrorCredentials3,
			mustFail:    true,
		},
		{
			name:        "semanticErrorCredentials",
			credentials: semanticErrorCredentials,
			mustFail:    true,
		},
		{
			name:        "goodCredentials",
			credentials: goodCredentials,
			mustFail:    false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := lndhubTest(t, tt.credentials)
			if tt.mustFail {
				require.Error(t, err, tt.name+". must fail")
			} else {
				require.NoError(t, err, tt.name+". must succeed")
			}

		})
	}

}

func lndhubTest(t *testing.T, credentials string) error {

	t.Helper()
	memo := "test invoice"
	amt := 100
	if lndhub, err := NewLndhub(credentials); err != nil {
		return err
	} else if _, err := lndhub.GetBalance(); err != nil {
		return err
	} else if pay_req, err := lndhub.CreateInvoice(uint64(amt), memo); err != nil {
		return err
	} else if invoice, err := lndhub.DecodeInvoice(pay_req); err != nil {
		return err
	} else if *invoice.Description != memo {
		return fmt.Errorf("Decoded invoice memo " + *invoice.Description + " expected:" + memo)
	} else if int64(invoice.MilliSat.ToSatoshis()) != int64(amt) {
		return fmt.Errorf("Decoded invoice amt " + invoice.MilliSat.ToSatoshis().String() +
			" expected:" + strconv.FormatInt(int64(amt), 10))
	} else if invoice, err := lndhub.DecodeInvoiceAPI(pay_req); err != nil {
		return err
	} else if invoice.Description != memo {
		return fmt.Errorf("Decoded invoice memo " + invoice.Description + " expected:" + memo)
	} else if n, err := strconv.ParseUint(invoice.Num_satoshis, 10, 64); err != nil || n != uint64(amt) {
		return fmt.Errorf("Decoded invoice amt " + invoice.Num_satoshis + " expected:" + strconv.FormatInt(int64(amt), 10))
	} else {
		return nil
	}

}
