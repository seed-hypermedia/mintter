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
	apiUrl             = "https://lndhub.io"
	balanceRoute       = "/balance"
	authRoute          = "/auth"
	createInvoiceRoute = "/addinvoice"
	payInvoiceRoute    = "/payinvoice"
	decodeInvoiceRoute = "/decodeinvoice"
	getInvoiceRoute    = "/getuserinvoice"
)

var (
	validCredentials = regexp.MustCompile(`\/\/([0-9a-f]+):([0-9a-f]+)@(https:\/\/[A-Za-z0-9_\-\.]+$)`)
)

type httpRequest struct {
	Url     string      //The url endpoint where the rest api is located
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

	if res := validCredentials.FindStringSubmatch(url); res == nil || len(res) != 4 {
		if res != nil {
			return credentials, fmt.Errorf("credentials contained more than necessary fields. it shoud be " +
				"lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io")

		} else {
			return credentials, fmt.Errorf("couldn't parse credentials, probalby wrong format. it shoud be " +
				"lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io")

		}
	} else {
		credentials.ConnectionURL = res[3]
		credentials.Login = res[1]
		credentials.Password = res[2]
		hash := sha256.Sum256([]byte(url))
		credentials.ID = hex.EncodeToString(hash[:])
		return credentials, nil
	}

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
		Url:    creds.ConnectionURL + authRoute,
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
		Url:    creds.ConnectionURL + balanceRoute,
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
		Pay_req string `mapstructure:"payment_request"`
	}

	var resp createInvoiceResponse

	err := c.do(ctx, httpRequest{
		Url:    creds.ConnectionURL + createInvoiceRoute,
		Method: http.MethodPost,
		Token:  creds.Token,
		Payload: createInvoiceRequest{
			Amt:  amount,
			Memo: memo,
		},
	}, &resp)

	return resp.Pay_req, err
}

// This function decodes a BOLT-11 invoice in text format. It uses the lnd functions to do it.
func DecodeInvoice(pay_req string) (*zpay32.Invoice, error) {

	if decodedInvoice, err := zpay32.Decode(pay_req, &chaincfg.MainNetParams); err != nil {
		return nil, err
	} else {
		return decodedInvoice, nil
	}

}

// This function tries to pay the invoice provided. With the amount provided in satoshis. The
// enconded amount in the invoice should match the provided amount as a double check
func (c *Client) PayInvoice(ctx context.Context, creds Credentials, pay_req string, sats uint64) error {

	if invoice, err := DecodeInvoice(pay_req); err != nil {
		return nil
	} else if uint64(invoice.MilliSat.ToSatoshis()) != sats {
		return fmt.Errorf("amount mismatch. Invoice amt is " + invoice.MilliSat.ToSatoshis().String() +
			"sats and provided amount is " + strconv.FormatInt(int64(sats), 10))
	}

	type payInvoiceRequest struct {
		Invoice string `json:"invoice"`
		Amount  uint64 `json:"amount"`
	}

	err := c.do(ctx, httpRequest{
		Url:    creds.ConnectionURL + payInvoiceRoute,
		Method: http.MethodPost,
		Token:  creds.Token,
		Payload: payInvoiceRequest{
			Invoice: pay_req,
			Amount:  sats,
		},
	}, nil)

	return err

}

func (c *Client) do(ctx context.Context, request httpRequest, respValue interface{}) error {
	var bodyRaw io.Reader
	var genericResponse map[string]interface{}
	var error_resp lndhubErrorTemplate
	if request.Payload != nil && request.Method != http.MethodGet {
		buf := &bytes.Buffer{}

		if err := json.NewEncoder(buf).Encode(request.Payload); err != nil {
			return err
		}
		bodyRaw = buf
	}

	req, err := http.NewRequestWithContext(ctx, request.Method, request.Url, bodyRaw)
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
		return fmt.Errorf("failed to make a request url=%s method=%s status=%s", request.Url, request.Method, resp.Status)
	}

	// Try to decode the request body into the struct. If there is an error,
	// respond to the client with the error message and a 400 status code.

	if err := json.NewDecoder(resp.Body).Decode(&genericResponse); err != nil {
		return err
	}

	if err := mapstructure.Decode(genericResponse, &error_resp); err == nil && error_resp.Error {
		return fmt.Errorf("failed to make a request url=%s method=%s status=%s error_code=%d error_message=%s",
			request.Url, request.Method, resp.Status, error_resp.Code, error_resp.Message)
	}

	if respValue != nil {
		if err := mapstructure.Decode(genericResponse, respValue); err != nil {
			return err
		}

	}

	return nil

}
