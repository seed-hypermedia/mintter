package lndhub

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/lightningnetwork/lnd/zpay32"
	"github.com/mitchellh/mapstructure"
)

const (
	balanceRoute       = "/balance"
	authRoute          = "/auth"
	createInvoiceRoute = "/addinvoice"
	payInvoiceRoute    = "/payinvoice"
	decodeInvoiceRoute = "/decodeinvoice" // Not used, using internal LND decoder instead
	getInvoiceRoute    = "/getuserinvoice"
	LndhubWalletType   = "lndhub"
)

var (
	validCredentials = regexp.MustCompile(`\/\/([0-9a-f]+):([0-9a-f]+)@(https:\/\/[A-Za-z0-9_\-\.]+$)`)
)

type httpRequest struct {
	URL     string      //The url endpoint where the rest api is located
	Method  string      // POST and GET supported
	Token   string      // Authorization token to be inserted in the header
	Payload interface{} // In POST method, the body of the request as a struct
}
type lndhubErrorTemplate struct {
	Error   bool   `mapstructure:"error"`
	Code    int    `mapstructure:"code"`
	Message string `mapstructure:"message"`
}

type Client struct {
	http *http.Client
}

type Credentials struct {
	ConnectionURL string `json:"connectionURL"`
	Login         string `json:"login"`
	Password      string `json:"password"`
	Token         string `json:"token"`
	ID            string `json:"id"`
}

func NewClient(h *http.Client) *Client {
	return &Client{
		http: h,
	}
}

// The constructor takes a credential string of the form desc://user:password@url
// lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io
func ParseCredentials(url string) (Credentials, error) {
	credentials := Credentials{}

	res := validCredentials.FindStringSubmatch(url)
	if res == nil || len(res) != 4 {
		if res != nil {
			return credentials, fmt.Errorf("credentials contained more than necessary fields. it shoud be " +
				"lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io")
		}
		return credentials, fmt.Errorf("couldn't parse credentials, probalby wrong format. it shoud be " +
			"lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io")

	}
	credentials.ConnectionURL = res[3]
	credentials.Login = res[1]
	credentials.Password = res[2]
	hash := sha256.Sum256([]byte(url))
	credentials.ID = hex.EncodeToString(hash[:])
	return credentials, nil

}

// Try to get authorized with the provided user and password. Returns
// access_token , error (if any)
func (c *Client) Auth(ctx context.Context, creds Credentials) (string, error) {
	type authResponse struct {
		AccessToken string `mapstructure:"access_token"`
	}

	type authRequest struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}

	var resp authResponse

	err := c.do(ctx, httpRequest{
		URL:    creds.ConnectionURL + authRoute,
		Method: http.MethodPost,
		Payload: authRequest{
			Login:    creds.Login,
			Password: creds.Password,
		},
	}, &resp)

	return resp.AccessToken, err
}

// Get the confirmed balance in satoshis of the account
func (c *Client) GetBalance(ctx context.Context, creds Credentials) (uint64, error) {
	type btcBalance struct {
		Sats uint64 `mapstructure:"AvailableBalance"`
	}
	type balanceResponse struct {
		Btc btcBalance `mapstructure:"BTC"`
	}

	var resp balanceResponse

	err := c.do(ctx, httpRequest{
		URL:    creds.ConnectionURL + balanceRoute,
		Method: http.MethodGet,
		Token:  creds.Token,
	}, &resp)
	return resp.Btc.Sats, err

}

// This function creates an invoice of amount sats (in satoshis). zero amount invoices
// are not supported, so make sure amount > 0.We also accept a short memo or description of
// purpose of payment, to attach along with the invoice. The generated invoice
// will have an expiration time of 24 hours and a random preimage
func (c *Client) CreateInvoice(ctx context.Context, creds Credentials, amount int64, memo string) (string, error) {
	type createInvoiceRequest struct {
		Amt  int64  `json:"amt"`
		Memo string `json:"memo"`
	}

	type createInvoiceResponse struct {
		PayReq string `mapstructure:"payment_request"`
	}

	var resp createInvoiceResponse

	err := c.do(ctx, httpRequest{
		URL:    creds.ConnectionURL + createInvoiceRoute,
		Method: http.MethodPost,
		Token:  creds.Token,
		Payload: createInvoiceRequest{
			Amt:  amount,
			Memo: memo,
		},
	}, &resp)

	return resp.PayReq, err
}

// This function decodes a BOLT-11 invoice in text format. It uses the lnd functions to do it.
func DecodeInvoice(payReq string) (*zpay32.Invoice, error) {
	decodedInvoice, err := zpay32.Decode(payReq, &chaincfg.MainNetParams)
	if err != nil {
		return nil, err
	}
	return decodedInvoice, nil

}

// PayInvoice tries to pay the invoice provided. With the amount provided in satoshis. The
// enconded amount in the invoice should match the provided amount as a double check in case
// the amount on the invoice is different than 0.
func (c *Client) PayInvoice(ctx context.Context, creds Credentials, payReq string, sats uint64) error {
	if invoice, err := DecodeInvoice(payReq); err != nil {
		return nil
	} else if uint64(invoice.MilliSat.ToSatoshis()) != 0 && uint64(invoice.MilliSat.ToSatoshis()) != sats {
		return fmt.Errorf("amount mismatch. Invoice amt is " + invoice.MilliSat.ToSatoshis().String() +
			"sats and provided amount is " + strconv.FormatInt(int64(sats), 10))
	}

	type payInvoiceRequest struct {
		Invoice string `json:"invoice"`
		Amount  uint64 `json:"amount"`
	}

	err := c.do(ctx, httpRequest{
		URL:    creds.ConnectionURL + payInvoiceRoute,
		Method: http.MethodPost,
		Token:  creds.Token,
		Payload: payInvoiceRequest{
			Invoice: payReq,
			Amount:  sats,
		},
	}, nil)

	return err

}

func (c *Client) do(ctx context.Context, request httpRequest, respValue interface{}) error {
	var bodyRaw io.Reader
	var genericResponse map[string]interface{}
	var errorRes lndhubErrorTemplate
	if request.Payload != nil && request.Method != http.MethodGet {
		buf := &bytes.Buffer{}

		if err := json.NewEncoder(buf).Encode(request.Payload); err != nil {
			return err
		}
		bodyRaw = buf
	}

	req, err := http.NewRequestWithContext(ctx, request.Method, request.URL, bodyRaw)
	if err != nil {
		return err
	}

	// add authorization header to the request
	if request.Token != "" {
		req.Header.Add("Authorization", "Bearer "+request.Token)
	}
	req.Header.Add("Content-Type", `application/json`)

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode > 299 || resp.StatusCode < 200 {
		return fmt.Errorf("failed to make a request url=%s method=%s status=%s", request.URL, request.Method, resp.Status)
	}

	// Try to decode the request body into the struct. If there is an error,
	// respond to the client with the error message and a 400 status code.

	if err := json.NewDecoder(resp.Body).Decode(&genericResponse); err != nil {
		return err
	}

	if err := mapstructure.Decode(genericResponse, &errorRes); err == nil && errorRes.Error {
		return fmt.Errorf("failed to make a request url=%s method=%s status=%s error_code=%d error_message=%s",
			request.URL, request.Method, resp.Status, errorRes.Code, errorRes.Message)
	}

	if respValue != nil {
		if err := mapstructure.Decode(genericResponse, respValue); err != nil {
			return err
		}

	}

	return nil

}
