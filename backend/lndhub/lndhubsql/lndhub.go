package lndhubsql

import (
	"errors"
	"fmt"

	"crawshaw.io/sqlite"
)

const (
	// LndhubWalletType is a bluewallet-like wallet.
	LndhubWalletType = "lndhub"
	// LndhubGoWalletType is bluewallet-like plus enhanced auth + lnurlp +lnaddress.
	LndhubGoWalletType = "lndhub.go"
)

var (
	// ErrEmptyResult is returned when underliying db does not return any value or empty (and business logic does not allow emptiness).
	ErrEmptyResult = errors.New("Empty results")
	// ErrQtyMissmatch is returned when invoice amount and intended paying quantity don't match.
	ErrQtyMissmatch = errors.New("Quantities don't match")
	// ErrNotEnoughBalance is used when the user does not have enough outgoing liquidity to perform an operation.
	ErrNotEnoughBalance = errors.New("Not enough balance")
)

// GetAPIURL returns the lndhub api endpoint used to connect to perform wallet operations.
func GetAPIURL(conn *sqlite.Conn, id string) (string, error) {
	res, err := getApiURL(conn, id)
	if err == nil && res.WalletsAddress == "" {
		return "", fmt.Errorf("Could not find any address associated with provided id [%s]: %w", id, ErrEmptyResult)
	}
	// TODO: decrypt address before returning
	return res.WalletsAddress, err
}

// GetLogin returns the login used to connect to the wallet.
func GetLogin(conn *sqlite.Conn, id string) (string, error) {
	res, err := getLogin(conn, id)
	if err == nil && len(res.WalletsLogin) == 0 {
		return "", fmt.Errorf("Could not find any login associated with provided id [%s]: %w", id, ErrEmptyResult)
	}
	// TODO: decrypt login before returning
	return string(res.WalletsLogin[:]), err
}

// GetPassword returns the password used to connect to the wallet.
func GetPassword(conn *sqlite.Conn, id string) (string, error) {
	res, err := getPassword(conn, id)
	if err == nil && len(res.WalletsPassword) == 0 {
		return "", fmt.Errorf("Could not find any password associated with provided id [%s]: %w", id, ErrEmptyResult)
	}
	// TODO: decrypt pass before returning
	return string(res.WalletsPassword[:]), err
}

// GetToken returns the token used to connect to the wallet. The response is
// a slice of bytes representing the token used to connect to the rest api.
func GetToken(conn *sqlite.Conn, id string) (string, error) {
	res, err := getToken(conn, id)
	// TODO: decrypt token before returning
	if err == nil && len(res.WalletsToken) == 0 {
		return "", fmt.Errorf("Could not find any token associated with provided id [%s]: %w", id, ErrEmptyResult)
	}
	return string(res.WalletsToken[:]), err
}

// SetToken stores the token to authenticate in non account routes
// in lndhub.go.
func SetToken(conn *sqlite.Conn, id, token string) error {
	return setToken(conn, []byte(token), id)
	// TODO: decrypt token before returning
}

// SetLoginSignature stores the sigature (hex representation) of the
// signed login message to access to account settings in lndhub.go.
func SetLoginSignature(conn *sqlite.Conn, signature string) error {
	return setLoginSignature(conn, LoginSignatureKey, signature)
}

// GetLoginSignature returns the sigature (hex representation) of the
// signed login message to access to account settings in lndhub.go.
func GetLoginSignature(conn *sqlite.Conn) (string, error) {
	res, err := getLoginSignature(conn, LoginSignatureKey)
	if err == nil && res.KVValue == "" {
		return "", fmt.Errorf("Could not find any signature associated with self node: %w", ErrEmptyResult)
	}
	return res.KVValue, err
}
