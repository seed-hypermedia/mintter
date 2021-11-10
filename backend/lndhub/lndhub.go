package lndhub

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sync"
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

type InvoiceReq struct {
	Amt  int    `json:"amt"`
	Memo string `json:"memo"`
}

type Invoice struct {
	payment_request string                 // bech32 encoded bitcoin payment request according to the BOLT-11 specification.
	add_index       uint64                 //The "add" index of this invoice. Each newly created invoice will increment this index making it monotonically increasing. Callers to the SubscribeInvoices call can use this to instantly get notified of all added invoices with an add_index greater than this one.
	r_hash          map[string]interface{} // The payment hash of the invoice.
	pay_req         string                 //Same as payment_request. Still here for client backwards compatibility.
}

type ErrorObj struct {
	error   bool // The millisatoshis to be paid. Zero to let the receiver decide
	code    int  // Descriptive text og the invoice
	message string
}

type Lndhub struct {
	sync.Mutex
	user          string // user to access lndhub when export account
	password      string // password of the previous user to access lndhub
	apiurl        string // base lndhum api endpoint https://lndhub.io
	refresh_token string // token used to refresh connection
	access_token  string // token used to authenticate any
}

func (l *Lndhub) GetAccessToken() string {
	l.Lock()
	defer l.Unlock()
	return l.access_token
}

func (l *Lndhub) GetRefreshToken() string {
	l.Lock()
	defer l.Unlock()
	return l.refresh_token
}

// The constructor takes a credential string of the form desc://user:password@url
// lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io
func NewLndhub(credentials string) (*Lndhub, error) {
	if res := validCredentials.FindStringSubmatch(credentials); res == nil || len(res) != 4 {
		if res != nil {
			return nil, fmt.Errorf("credentials contained more than necessary fields. it shoud be " +
				"lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io")
		} else {
			return nil, fmt.Errorf("couldn't parse credentials, probalby wrong format. it shoud be " +
				"lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io")
		}
	} else {
		if refresh_token, access_token, err := auth(res[1], res[2], res[3]); err != nil {
			return nil, err
		} else {
			return &Lndhub{
				user:          res[1],
				password:      res[2],
				apiurl:        res[3],
				refresh_token: refresh_token,
				access_token:  access_token,
			}, nil
		}

	}

}

// Get the confirmed balance in millisatoshis of the account
func (l *Lndhub) GetBalance() (uint64, error) {
	var ret map[string]interface{}

	// Create a new request using http
	if req, err := http.NewRequest("GET", l.apiurl+balanceRoute, nil); err != nil {
		return 0, err
	} else {
		// add authorization header to the req
		req.Header.Add("Authorization", "Bearer "+l.access_token)

		// Send req using http Client
		client := &http.Client{}
		if resp, err := client.Do(req); err != nil {
			return 0, err
		} else {
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				return 0, fmt.Errorf("Response status " + http.StatusText(resp.StatusCode) +
					" expected " + http.StatusText(http.StatusOK))
			} else if err := json.NewDecoder(resp.Body).Decode(&ret); err != nil {
				return 0, err
			} else if err_field, ok := ret["error"]; ok && err_field.(bool) {
				var code, message string
				if code_field, ok := ret["code"]; ok {
					code = fmt.Sprintf("%1.0f", code_field.(float64))
				}
				if message_field, ok := ret["message"]; ok {
					message = message_field.(string)
				}
				return 0, fmt.Errorf("could't authernticate, error code " + code +
					" message " + message)

			} else if btc, ok := ret["BTC"]; !ok {
				return 0, fmt.Errorf("no Bitcoin deposits found, please fund your account with btcs")
			} else if balance, ok := btc.(map[string]interface{}); !ok {
				return 0, fmt.Errorf("response in wrong format")
			} else if funds, ok := balance["AvailableBalance"]; !ok {
				return 0, fmt.Errorf("couldn't get AvailableBalance")
			} else {
				return uint64(funds.(float64)), nil
			}
		}

	}

}

// Try to get authorized with the provided user and password. Returns
// refresh_token, access_token , error (if any)
func auth(user, password, apiurl string) (string, string, error) {
	payload := map[string]string{"login": user, "password": password}
	var ret map[string]interface{}
	var refresh_token, access_token string

	if json_data, err := json.Marshal(payload); err != nil {
		return refresh_token, access_token, err
	} else if resp, err := http.Post(apiurl+authRoute, "application/json",
		bytes.NewBuffer(json_data)); err != nil {
		return refresh_token, access_token, err
	} else if resp.StatusCode != http.StatusOK {
		return refresh_token, access_token, fmt.Errorf("Response status " + http.StatusText(resp.StatusCode) +
			"expected " + http.StatusText(http.StatusOK))
	} else if err := json.NewDecoder(resp.Body).Decode(&ret); err != nil {
		return refresh_token, access_token, err
	} else if err_field, ok := ret["error"]; ok && err_field.(bool) {
		var code, message string
		if code_field, ok := ret["code"]; ok {
			code = fmt.Sprintf("%1.0f", code_field.(float64))
		}
		if message_field, ok := ret["message"]; ok {
			message = message_field.(string)
		}
		return refresh_token, access_token, fmt.Errorf("could't authenticate, error code " + code +
			" message " + message)
	} else if refresh_token, ok := ret["refresh_token"]; !ok {
		return refresh_token.(string), access_token, fmt.Errorf("refresh_token not present in response")
	} else if access_token, ok := ret["access_token"]; !ok {
		return refresh_token.(string), access_token.(string), fmt.Errorf("access_token not present in response")
	} else {
		return refresh_token.(string), access_token.(string), nil
	}
}

// This function creates an invoice of amount sats (in satoshis). zero amount invoices
// are not supported, so make sure amount > 0.We also accept a short memo or description of
// purpose of payment, to attach along with the invoice. Used for record keeping purposes
// for the invoice's creator, and will also be set in the description field of the encoded
// payment request if the description_hash field is not being used. The generated invoice
// will have an expiration time of 24 hours and a random preimage
func (l *Lndhub) CreateInvoice(amount int, memo string) (string, error) {
	payload := &InvoiceReq{
		Amt:  amount,
		Memo: memo,
	}
	var ret map[string]interface{}
	var invoice string

	if json_data, err := json.Marshal(payload); err != nil {
		return invoice, err
	} else if req, err := http.NewRequest("POST", l.apiurl+createInvoiceRoute, bytes.NewBuffer(json_data)); err != nil {
		return invoice, err
	} else {
		// add authorization header to the req
		req.Header.Add("Authorization", "Bearer "+l.access_token)
		req.Header.Add("Content-Type", `application/json`)
		// Send req using http Client
		client := &http.Client{}
		if resp, err := client.Do(req); err != nil {
			return invoice, err
		} else {
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				return invoice, fmt.Errorf("Response status " + http.StatusText(resp.StatusCode) +
					"expected " + http.StatusText(http.StatusOK))
			} else if err := json.NewDecoder(resp.Body).Decode(&ret); err != nil {
				return invoice, err
			} else if err_field, ok := ret["error"]; ok && err_field.(bool) {
				var code, message string
				if code_field, ok := ret["code"]; ok {
					code = fmt.Sprintf("%1.0f", code_field.(float64))
				}
				if message_field, ok := ret["message"]; ok {
					message = message_field.(string)
				}
				return invoice, fmt.Errorf("could't authenticate, error code " + code +
					" message " + message)

			} else if pay_req, ok := ret["payment_request"]; !ok {
				return invoice, fmt.Errorf("access_token not present in response")
			} else {
				return pay_req.(string), nil
			}
		}
	}
}
