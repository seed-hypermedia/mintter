package lndhub

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/lightningnetwork/lnd/zpay32"
	"github.com/mitchellh/mapstructure"
)

const (
	createRoute        = "/v2/create" // v2 is the one created by our fork
	balanceRoute       = "/balance"
	authRoute          = "/auth"
	createInvoiceRoute = "/addinvoice"
	payInvoiceRoute    = "/payinvoice"
	decodeInvoiceRoute = "/decodeinvoice" // Not used, using internal LND decoder instead
	getInvoiceRoute    = "/getuserinvoice"
	LndhubWalletType   = "lndhub"
	LndhubGoWalletType = "lndhub.go"
	mintterDomain      = "testnet.mintter.com"
	networkType        = lnTestnet

	// Types.
	lnTestnet = iota
	lnMainnet
)

type httpRequest struct {
	URL     string      // The url endpoint where the rest api is located
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

type CreateResponse struct {
	Login    string `mapstructure:"login"`
	Password string `mapstructure:"password"`
	Nickname string `mapstructure:"nickname"`
}

type authResponse struct {
	AccessToken string `mapstructure:"access_token"`
}

type authRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

func NewClient(h *http.Client) *Client {
	return &Client{
		http: h,
	}
}

// Creates an account or changes the nickname on already created one. If the login is a CID, then the password must
// be the signature of the message 'sign in into mintter lndhub' and the token the pubkey whose private counterpart
// was used to sign the password. If login is not a CID, then there is no need for the token and password can be
// anything. Nickname can be anything in both cases as long as it's unique across all mintter lndhub users (it will
// fail otherwise).
func (c *Client) Create(ctx context.Context, connectionURL, login, pass, token, nickname string) (CreateResponse, error) {

	type createRequest struct {
		Login    string `json:"login"`
		Password string `json:"password"`
		Nickname string `json:"nickname"`
	}
	var resp CreateResponse

	err := c.do(ctx, httpRequest{
		URL:    connectionURL + createRoute,
		Method: http.MethodPost,
		Payload: createRequest{
			Login:    login, // CID
			Password: pass,  // signed message
			Nickname: nickname,
		},
		Token: token, // this token should be in reality the pubkey whose private counterpart was used to sign the password
	}, 2, &resp)
	if err != nil {
		return resp, err
	}

	if err := setLndhubLogin(resp.Login); err != nil {
		return resp, err
	}

	if err := setLndhubPassword(resp.Password); err != nil {
		return resp, err
	}

	if err := setLndhubNickname(resp.Nickname); err != nil {
		return resp, err
	}

	return resp, err
}

// UpdateNickname takes the nickname field of the Credentials and updates it on the lndhub.go database
// The update can fail if the nickname contain special characters or is already taken by another user.
// Since it is a user operation, if the login is a CID, then user must provide a token representing
// the pubkey whose private counterpart created the signature provided in password (like in create).
func (c *Client) UpdateNickname(ctx context.Context, connectionURL, login, pass, token, nickname string) (CreateResponse, error) {
	return c.Create(ctx, connectionURL, login, pass, token, nickname)
}

// GetLnAddress gets the account-wide ln address in the form of <nickname>@<domain> .
// Since it is a user operation, if the login is a CID, then user must provide a token representing
// the pubkey whose private counterpart created the signature provided in password (like in create).
func (c *Client) GetLnAddress(ctx context.Context, connectionURL, login, pass, token string) (string, error) {
	user, err := c.Create(ctx, connectionURL, login, pass, token, "") // create with valid credentials and blank nickname fills the nickname
	if err != nil {
		return "", err
	}
	return user.Nickname + "@" + mintterDomain, nil
}

// Try to get authorized on the lndhub service pointed by apiBaseUrl.
// There must be a credentials stored in the database
func (c *Client) Auth(ctx context.Context, apiBaseUrl string) (string, error) {

	var resp authResponse
	login, err := getLndhubLogin()
	if err != nil {
		return resp.AccessToken, err
	}
	pass, err := getLndhubPassword()
	if err != nil {
		return resp.AccessToken, err
	}
	err = c.do(ctx, httpRequest{
		URL:    apiBaseUrl + authRoute,
		Method: http.MethodPost,
		Payload: authRequest{
			Login:    login,
			Password: pass,
		},
	}, 2, &resp)
	if err != nil {
		return resp.AccessToken, err
	}
	return resp.AccessToken, setlndhubToken(resp.AccessToken)
}

// Get the confirmed balance in satoshis of the account
func (c *Client) GetBalance(ctx context.Context, apiBaseUrl string) (uint64, error) {
	type btcBalance struct {
		Sats uint64 `mapstructure:"AvailableBalance"`
	}
	type balanceResponse struct {
		Btc btcBalance `mapstructure:"BTC"`
	}

	var resp balanceResponse
	token, err := getlndhubToken("")
	if err != nil {
		return resp.Btc.Sats, err
	}
	err = c.do(ctx, httpRequest{
		URL:    apiBaseUrl + balanceRoute,
		Method: http.MethodGet,
		Token:  token,
	}, 2, &resp)
	return resp.Btc.Sats, err

}

// This function creates an invoice of amount sats (in satoshis). zero amount invoices
// are not supported, so make sure amount > 0.We also accept a short memo or description of
// purpose of payment, to attach along with the invoice. The generated invoice
// will have an expiration time of 24 hours and a random preimage
func (c *Client) CreateInvoice(ctx context.Context, apiBaseUrl string, amount int64, memo string) (string, error) {
	type createInvoiceRequest struct {
		Amt  int64  `json:"amt"`
		Memo string `json:"memo"`
	}

	type createInvoiceResponse struct {
		PayReq string `mapstructure:"payment_request"`
	}

	var resp createInvoiceResponse
	token, err := getlndhubToken("")
	if err != nil {
		return resp.PayReq, err
	}
	err = c.do(ctx, httpRequest{
		URL:    apiBaseUrl + createInvoiceRoute,
		Method: http.MethodPost,
		Token:  token,
		Payload: createInvoiceRequest{
			Amt:  amount,
			Memo: memo,
		},
	}, 2, &resp)

	return resp.PayReq, err
}

// DecodeInvoice decodes a BOLT-11 invoice in text format. It uses the lnd functions to do it.
func DecodeInvoice(payReq string) (*zpay32.Invoice, error) {
	var err error
	var decodedInvoice *zpay32.Invoice
	if networkType == lnMainnet {
		decodedInvoice, err = zpay32.Decode(payReq, &chaincfg.MainNetParams)
	} else if networkType == lnTestnet {
		decodedInvoice, err = zpay32.Decode(payReq, &chaincfg.TestNet3Params)
	} else {
		return nil, fmt.Errorf("Could not decode invoice. Only testnet and meinnet are allowed")
	}

	if err != nil {
		return nil, err
	}
	return decodedInvoice, nil

}

// PayInvoice tries to pay the invoice provided. With the amount provided in satoshis. The
// enconded amount in the invoice should match the provided amount as a double check in case
// the amount on the invoice is different than 0.
func (c *Client) PayInvoice(ctx context.Context, apiBaseUrl string, payReq string, sats uint64) error {
	if invoice, err := DecodeInvoice(payReq); err != nil {
		return nil
	} else if uint64(invoice.MilliSat.ToSatoshis()) != 0 && uint64(invoice.MilliSat.ToSatoshis()) != sats {
		return fmt.Errorf("amount mismatch. Invoice amt is " + invoice.MilliSat.ToSatoshis().String() +
			" and provided amount is " + strconv.FormatInt(int64(sats), 10) + " sats")
	}

	type payInvoiceRequest struct {
		Invoice string `json:"invoice"`
		Amount  uint64 `json:"amount"`
	}
	token, err := getlndhubToken("")
	if err != nil {
		return err
	}
	err = c.do(ctx, httpRequest{
		URL:    apiBaseUrl + payInvoiceRoute,
		Method: http.MethodPost,
		Token:  token,
		Payload: payInvoiceRequest{
			Invoice: payReq,
			Amount:  sats,
		},
	}, 2, nil)

	return err

}

func (c *Client) do(ctx context.Context, request httpRequest, maxAttempts uint, respValue interface{}) error {
	var bodyRaw io.Reader
	var genericResponse map[string]interface{}
	var errorRes lndhubErrorTemplate
	var authErrCount uint = 0
	if request.Payload != nil && request.Method != http.MethodGet {
		buf := &bytes.Buffer{}

		if err := json.NewEncoder(buf).Encode(request.Payload); err != nil {
			return err
		}
		bodyRaw = buf
	}
	for i := 0; i < int(maxAttempts); i++ {

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

		// Try to decode the request body into the struct. If there is an error,
		// respond to the client with the error message and a 400 status code.

		if err := json.NewDecoder(resp.Body).Decode(&genericResponse); err != nil {
			return err
		}

		if resp.StatusCode > 299 || resp.StatusCode < 200 {
			authErrCount++
			if authErrCount >= maxAttempts {
				return fmt.Errorf("failed to make a request url=%s method=%s status=%s", request.URL, request.Method, resp.Status)
			}
			if resp.StatusCode == http.StatusUnauthorized {
				errMsg, ok := genericResponse["message"]
				var authResp authResponse
				// Check if token expired and we need to issue one
				if ok && strings.Contains(errMsg.(string), "bad auth") {
					login, err := getLndhubLogin()
					if err != nil {
						return err
					}
					pass, err := getLndhubPassword()
					if err != nil {
						return err
					}
					err = c.do(ctx, httpRequest{
						URL:    request.URL,
						Method: http.MethodPost,
						Payload: authRequest{
							Login:    login,
							Password: pass,
						},
					}, 1, &authResp)
					if err != nil {
						return err
					}
					if err = setlndhubToken(authResp.AccessToken); err != nil {
						return err
					}

				}
			}
			continue
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

	return fmt.Errorf("failed to make a request url=%s method=%s, maxAttempts=%d", request.URL, request.Method, maxAttempts)
}

func getLndhubLogin() (string, error) {
	return "example", nil
}

func getLndhubPassword() (string, error) {
	return "example", nil
}

func setLndhubLogin(login string) error {
	return nil
}

func setLndhubPassword(pass string) error {
	return nil
}

func setlndhubToken(token string) error {
	return nil

}

func getlndhubToken(id string) (string, error) {
	if id == "" {
		id = "selfID from db"
	}
	//Do the string(byteArray[:]) conversion
	return "example", nil
}
