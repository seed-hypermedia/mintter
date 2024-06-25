package lndhub

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"seed/backend/core"
	lndhub "seed/backend/lndhub/lndhubsql"
	"strconv"
	"strings"
	"time"
	"unicode"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/lightningnetwork/lnd/zpay32"
	"github.com/mitchellh/mapstructure"
)

const (
	createRoute         = "/v2/create" // v2 is the one created by our fork
	balanceRoute        = "/balance"
	authRoute           = "/auth"
	createInvoiceRoute  = "/addinvoice"
	requestInvoiceRoute = "/v2/invoice"
	payInvoiceRoute     = "/payinvoice"
	//decodeInvoiceRoute       = "/decodeinvoice" // Not used, using internal LND decoder instead.
	getPaidInvoicesRoute     = "/v2/invoices/outgoing"
	getReceivedInvoicesRoute = "/v2/invoices/incoming"

	// SigningMessage is the fixed message to sign. The server must have the same message.
	SigningMessage = "sign in into mintter lndhub"
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

// Client stores all the necessary structs to perform wallet operations.
type Client struct {
	http            *http.Client
	db              *sqlitex.Pool
	WalletID        string
	keyStorage      core.KeyStore
	keyName         string
	lndhubDomain    string
	lnaddressDomain string
}

type createRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
}
type createResponse struct {
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

// Invoice is a subset of bolt-11 invoice.
type Invoice struct {
	PaymentHash     string `mapstructure:"payment_hash"`
	PaymentRequest  string `mapstructure:"payment_request"`
	Description     string `mapstructure:"description"`
	DescriptionHash string `mapstructure:"description_hash,omitempty"`
	PaymentPreimage string `mapstructure:"payment_preimage,omitempty"`
	Destination     string `mapstructure:"destination"`
	Amount          int64  `mapstructure:"amount"`
	Fee             int64  `mapstructure:"fee"`
	Status          string `mapstructure:"status"`
	Type            string `mapstructure:"type"`
	ErrorMessage    string `mapstructure:"error_message,omitempty"`
	SettledAt       string `mapstructure:"settled_at"`
	ExpiresAt       string `mapstructure:"expires_at"`
	IsPaid          bool   `mapstructure:"is_paid"`
	Keysend         bool   `mapstructure:"keysend"`
}

// NewClient returns an instance of an lndhub client. The id is the credentials URI
// hash that acts as an index in the wallet table.
func NewClient(ctx context.Context, h *http.Client, db *sqlitex.Pool, keyStorage core.KeyStore, keyName, lndhubDomain, lnaddressDomain string) *Client {
	return &Client{
		http:            h,
		db:              db,
		keyStorage:      keyStorage,
		keyName:         keyName,
		lndhubDomain:    lndhubDomain,
		lnaddressDomain: lnaddressDomain,
	}
}

// GetLndhubDomain gets the lndhub domain set at creation.
func (c *Client) GetLndhubDomain() string {
	return c.lndhubDomain
}

// GetLndaddressDomain gets the lndaddress domain set at creation.
func (c *Client) GetLndaddressDomain() string {
	return c.lnaddressDomain
}

// Create creates an account or changes the nickname on already created one. If the login is a CID, then the password must
// be the signature of the message 'sign in into mintter lndhub' and the token the pubkey whose private counterpart
// was used to sign the password. If login is not a CID, then there is no need for the token and password can be
// anything. Nickname can be anything in both cases as long as it's unique across all seed lndhub users (it will
// fail otherwise).
func (c *Client) Create(ctx context.Context, connectionURL, login, pass, nickname string) (createResponse, error) {
	var resp createResponse
	kp, err := c.keyStorage.GetKey(ctx, c.keyName)
	if err != nil {
		return resp, fmt.Errorf("could not get signing key, is account initialized?: %w", err)
	}
	pubKey, err := kp.ID().ExtractPublicKey()
	if err != nil {
		return resp, fmt.Errorf("Invalid pubkey: %w", err)
	}
	pubKeyBytes, err := pubKey.Raw()
	if err != nil {
		return resp, fmt.Errorf("Invalid pubkey: %w", err)
	}

	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return resp, err
	}
	defer release()
	err = c.do(ctx, conn, httpRequest{
		URL:    connectionURL + createRoute,
		Method: http.MethodPost,
		Payload: createRequest{
			Login:    login, // CID
			Password: pass,  // signed message
			Nickname: strings.ToLower(nickname),
		},
		Token: hex.EncodeToString(pubKeyBytes),
	}, 2, &resp)
	if err != nil {
		return resp, err
	}

	return resp, nil
}

// UpdateNickname takes the nickname field of the Credentials and updates it on the lndhub.go database
// The update can fail if the nickname contain special characters or is already taken by another user.
// Since it is a user operation, if the login is a CID, then user must provide a token representing
// the pubkey whose private counterpart created the signature provided in password (like in create).
func (c *Client) UpdateNickname(ctx context.Context, nickname string) error {
	for _, c := range nickname {
		if unicode.IsUpper(c) && unicode.IsLetter(c) {
			return fmt.Errorf("Nickname cannot contain uppercase letters %s", nickname)
		}
	}
	kp, err := c.keyStorage.GetKey(ctx, c.keyName)
	if err != nil {
		return fmt.Errorf("could not get signing key, is account initialized?: %w", err)
	}
	var resp createResponse

	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	login, err := lndhub.GetLogin(conn, c.WalletID)
	if err != nil {
		return err
	}
	pass, err := lndhub.GetPassword(conn, c.WalletID)
	if err != nil {
		return err
	}
	connectionURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return err
	}
	pubKey, err := kp.ID().ExtractPublicKey()
	if err != nil {
		return fmt.Errorf("Invalid pubkey: %w", err)
	}
	pubKeyBytes, err := pubKey.Raw()
	if err != nil {
		return fmt.Errorf("Invalid pubkey: %w", err)
	}

	err = c.do(ctx, conn, httpRequest{
		URL:    connectionURL + createRoute,
		Method: http.MethodPost,
		Payload: createRequest{
			Login:    login, // CID
			Password: pass,  // signed message
			Nickname: nickname,
		},
		Token: hex.EncodeToString(pubKeyBytes), // this token is the pubkey bytes whose private counterpart was used to sign the password
	}, 2, &resp)
	if err != nil {
		return err
	}

	if resp.Nickname != nickname {
		return fmt.Errorf("New nickname was not set properly. Expected %s but got %s", nickname, resp.Nickname)
	}
	return nil
}

// GetLnAddress gets the account-wide ln address in the form of <nickname>@<domain> .
// Since it is a user operation, if the login is a CID, then user must provide a token representing
// the pubkey whose private counterpart created the signature provided in password (like in create).
func (c *Client) GetLnAddress(ctx context.Context) (string, error) {
	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return "", err
	}
	defer release()

	login, err := lndhub.GetLogin(conn, c.WalletID)
	if err != nil {
		return "", err
	}
	pass, err := lndhub.GetPassword(conn, c.WalletID)
	if err != nil {
		return "", err
	}
	connectionURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return "", err
	}

	user, err := c.Create(ctx, connectionURL, login, pass, "") // create with valid credentials and blank nickname fills the nickname
	if err != nil {
		return "", err
	}
	return user.Nickname + "@" + c.lnaddressDomain, nil
}

// Auth tries to get authorized on the lndhub service pointed by apiBaseURL.
// There must be a credentials stored in the database.
func (c *Client) Auth(ctx context.Context) (string, error) {
	var resp authResponse

	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return "", err
	}
	defer release()

	login, err := lndhub.GetLogin(conn, c.WalletID)
	if err != nil {
		return resp.AccessToken, err
	}
	pass, err := lndhub.GetPassword(conn, c.WalletID)
	if err != nil {
		return resp.AccessToken, err
	}
	apiBaseURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return "", err
	}
	err = c.do(ctx, conn, httpRequest{
		URL:    apiBaseURL + authRoute,
		Method: http.MethodPost,
		Payload: authRequest{
			Login:    login,
			Password: pass,
		},
	}, 2, &resp)
	if err != nil {
		return resp.AccessToken, err
	}
	return resp.AccessToken, lndhub.SetToken(conn, c.WalletID, resp.AccessToken)
}

// GetBalance gets the confirmed balance in satoshis of the account.
func (c *Client) GetBalance(ctx context.Context) (uint64, error) {
	type btcBalance struct {
		Sats uint64 `mapstructure:"AvailableBalance"`
	}
	type balanceResponse struct {
		Btc btcBalance `mapstructure:"BTC"`
	}

	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return 0, err
	}
	defer release()

	var resp balanceResponse
	token, err := lndhub.GetToken(conn, c.WalletID)
	if err != nil {
		return resp.Btc.Sats, err
	}
	apiBaseURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return resp.Btc.Sats, err
	}

	err = c.do(ctx, conn, httpRequest{
		URL:    apiBaseURL + balanceRoute,
		Method: http.MethodGet,
		Token:  token,
	}, 2, &resp)
	return resp.Btc.Sats, err
}

// ListPaidInvoices returns a list of outgoing invoices.
func (c *Client) ListPaidInvoices(ctx context.Context) ([]Invoice, error) {
	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	type ListInvoicesResponse struct {
		Invoices []Invoice `mapstructure:"invoices"`
	}

	var resp ListInvoicesResponse
	token, err := lndhub.GetToken(conn, c.WalletID)
	if err != nil {
		return resp.Invoices, err
	}
	apiBaseURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return resp.Invoices, err
	}

	err = c.do(ctx, conn, httpRequest{
		URL:    apiBaseURL + getPaidInvoicesRoute,
		Method: http.MethodGet,
		Token:  token,
	}, 2, &resp)
	return resp.Invoices, err
}

// ListReceivedInvoices returns a list of incoming invoices.
func (c *Client) ListReceivedInvoices(ctx context.Context) ([]Invoice, error) {
	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	type ListInvoicesResponse struct {
		Invoices []Invoice `mapstructure:"invoices"`
	}

	var resp ListInvoicesResponse
	token, err := lndhub.GetToken(conn, c.WalletID)
	if err != nil {
		return resp.Invoices, err
	}
	apiBaseURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return resp.Invoices, err
	}

	err = c.do(ctx, conn, httpRequest{
		URL:    apiBaseURL + getReceivedInvoicesRoute,
		Method: http.MethodGet,
		Token:  token,
	}, 2, &resp)
	return resp.Invoices, err
}

// CreateLocalInvoice creates an invoice of amount sats (in satoshis)
// for the internal node . We accept a short memo or description of purpose
// of payment, to attach along with the invoice. The generated invoice will
// have an expiration time of 24 hours and a random preimage.
func (c *Client) CreateLocalInvoice(ctx context.Context, sats int64, memo string) (string, error) {
	type createLocalInvoiceRequest struct {
		Amt  int64  `json:"amt"`
		Memo string `json:"memo"`
		// TODO: Accept payment metadata
	}

	type createLocalInvoiceResponse struct {
		PayReq string `mapstructure:"payment_request"`
	}

	var resp createLocalInvoiceResponse

	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return "", err
	}
	defer release()

	token, err := lndhub.GetToken(conn, c.WalletID)
	if err != nil {
		return resp.PayReq, err
	}
	apiBaseURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return resp.PayReq, err
	}

	err = c.do(ctx, conn, httpRequest{
		URL:    apiBaseURL + createInvoiceRoute,
		Method: http.MethodPost,
		Token:  token,
		Payload: createLocalInvoiceRequest{
			Amt:  sats,
			Memo: memo,
		},
	}, 2, &resp)

	return resp.PayReq, err
}

// RequestRemoteInvoice request a remote peer via lndhub an invoice of amount
// sats (in satoshis). The remote user can be either a lnaddres user or a
// seed account ID. We accept a short memo or description of purpose of
// payment, to attach along with the invoice. The generated invoice will have
// an expirationtime of 24 hours and a random preimage.
func (c *Client) RequestRemoteInvoice(ctx context.Context, remoteUser string, amountSats int64, memo string) (string, error) {
	type requestRemoteInvoiceResponse struct {
		PayReq string `mapstructure:"pr"`
	}

	var resp requestRemoteInvoiceResponse

	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return "", err
	}
	defer release()

	apiBaseURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return resp.PayReq, err
	}

	err = c.do(ctx, conn, httpRequest{
		URL:    apiBaseURL + requestInvoiceRoute + "?user=" + remoteUser + "&amount=" + strconv.FormatInt(amountSats*1000, 10) + "&memo=" + strings.ReplaceAll(memo, " ", "+"),
		Method: http.MethodGet,
	}, 2, &resp)

	return resp.PayReq, err
}

// DecodeInvoice decodes a BOLT-11 invoice in text format. It uses the lnd functions to do it.
func DecodeInvoice(payReq string) (*zpay32.Invoice, error) {
	var err error
	var decodedInvoice *zpay32.Invoice
	decodedInvoice, err = zpay32.Decode(payReq, &chaincfg.MainNetParams)
	if err != nil {
		decodedInvoice, err = zpay32.Decode(payReq, &chaincfg.TestNet3Params)
	}

	return decodedInvoice, err
}

// PayInvoice tries to pay the invoice provided. With the amount provided in satoshis. The
// enconded amount in the invoice should match the provided amount as a double check in case
// the amount on the invoice is different than 0.
func (c *Client) PayInvoice(ctx context.Context, payReq string, sats uint64) error {
	if invoice, err := DecodeInvoice(payReq); err != nil {
		return nil
	} else if uint64(invoice.MilliSat.ToSatoshis()) != 0 && uint64(invoice.MilliSat.ToSatoshis()) != sats {
		return fmt.Errorf("Invoice amt is %s sats and provided amount is %d sats: %w", invoice.MilliSat.ToSatoshis().String(), int64(sats), lndhub.ErrQtyMissmatch)
	}

	type payInvoiceRequest struct {
		Invoice string `json:"invoice"`
		Amount  uint64 `json:"amount"`
	}

	conn, release, err := c.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	token, err := lndhub.GetToken(conn, c.WalletID)
	if err != nil {
		return err
	}
	apiBaseURL, err := lndhub.GetAPIURL(conn, c.WalletID)
	if err != nil {
		return err
	}

	err = c.do(ctx, conn, httpRequest{
		URL:    apiBaseURL + payInvoiceRoute,
		Method: http.MethodPost,
		Token:  token,
		Payload: payInvoiceRequest{
			Invoice: payReq,
			Amount:  sats,
		},
	}, 2, nil)
	return err
}

func (c *Client) do(ctx context.Context, conn *sqlite.Conn, request httpRequest, maxAttempts uint, respValue interface{}) error {
	var bodyRaw io.Reader
	var genericResponse map[string]interface{}
	var errorRes lndhubErrorTemplate
	var authErrCount uint
	if request.Payload != nil && request.Method != http.MethodGet {
		buf := &bytes.Buffer{}

		if err := json.NewEncoder(buf).Encode(request.Payload); err != nil {
			return err
		}
		bodyRaw = buf
	}
	var errContinue = errors.New("continue")
	for i := 0; i < int(maxAttempts); i++ {
		err := func() error { // Needed for releasing memory (defer close) on every loop and not waiting for the for to break
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

			defer resp.Body.Close() // this will close at the end of every loop.

			// Try to decode the request body into the struct. If there is an error,
			// respond to the client with the error message and a 400 status code.
			err = json.NewDecoder(resp.Body).Decode(&genericResponse)

			if resp.StatusCode > 299 || resp.StatusCode < 200 {
				authErrCount++
				if authErrCount >= maxAttempts {
					errMsg, ok := genericResponse["message"]
					if ok {
						return fmt.Errorf("failed to make request status=%s error=%s", resp.Status, errMsg)
					}
					return fmt.Errorf("failed to make a request url=%s method=%s status=%s", request.URL, request.Method, resp.Status)
				}
				if resp.StatusCode == http.StatusUnauthorized {
					errMsg, ok := genericResponse["message"]
					var authResp authResponse
					// Check if token expired and we need to issue one
					if ok && strings.Contains(errMsg.(string), "bad auth") {
						login, err := lndhub.GetLogin(conn, c.WalletID)
						if err != nil {
							return err
						}
						pass, err := lndhub.GetPassword(conn, c.WalletID)
						if err != nil {
							return err
						}
						apiBaseURL, err := lndhub.GetAPIURL(conn, c.WalletID)
						if err != nil {
							return err
						}

						err = c.do(ctx, conn, httpRequest{
							URL:    apiBaseURL + authRoute,
							Method: http.MethodPost,
							Payload: authRequest{
								Login:    login,
								Password: pass,
							},
						}, 1, &authResp)
						if err != nil {
							return err
						}
						if err = lndhub.SetToken(conn, c.WalletID, authResp.AccessToken); err != nil {
							return err
						}
					}
				} else if resp.StatusCode == http.StatusTooManyRequests {
					waitingTime := int(rand.Float32() + 1.0)
					time.Sleep(time.Duration(waitingTime) * time.Second)
				} else {
					errMsg, ok := genericResponse["message"]
					if ok {
						return fmt.Errorf("failed to make request status=%s error=%s", resp.Status, errMsg)
					}
					return fmt.Errorf("failed to make a request url=%s method=%s status=%s", request.URL, request.Method, resp.Status)
				}
				return errContinue
			}
			return err
		}()
		if errors.Is(err, errContinue) {
			continue
		}
		if err != nil {
			return fmt.Errorf("Couldn't decode received payload: " + err.Error())
		}
		if err := mapstructure.Decode(genericResponse, &errorRes); err == nil && errorRes.Error {
			return fmt.Errorf("failed to make a request url=%s method=%s error_code=%d error_message=%s",
				request.URL, request.Method, errorRes.Code, errorRes.Message)
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
