package walletsql

import (
	"errors"
	"fmt"
	"seed/backend/lndhub/lndhubsql"
	"strings"

	"crawshaw.io/sqlite"
)

const (
	idcharLength = 64

	// NotEnoughBalance can be used to check the typical API error of not having enough balance.
	NotEnoughBalance = "not enough balance"
)

var (
	// ErrDuplicateIndex is thrown when db identifies a duplicate entry on a unique key.
	ErrDuplicateIndex = errors.New("duplicate entry")
)

// Wallet is the representation of a lightning wallet.
type Wallet struct {
	ID      string `mapstructure:"id"`
	Address string `marstructure:"address"`
	Name    string `mapstructure:"name"`
	Type    string `mapstructure:"type"`
	Balance int64  `mapstructure:"balance"`
}

// GetWallet retrieves information about the specific wallet identified with id string
// id is the string representation of the credential hash of the lndhub wallet or the
// string representation of the public key in an lnd wallet. In case there isn't any
// wallet identified with id an error will be returned.
func GetWallet(conn *sqlite.Conn, walletID string) (Wallet, error) {
	if len(walletID) != idcharLength {
		return Wallet{}, fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(walletID))
	}

	wallet, err := getWallet(conn, walletID)
	if err != nil {
		return Wallet{}, err
	}
	if wallet.WalletsID == "" {
		return Wallet{}, fmt.Errorf("No wallet found with id %s", walletID)
	}
	ret := Wallet{
		ID:      wallet.WalletsID,
		Address: wallet.WalletsAddress,
		Name:    wallet.WalletsName,
		Type:    wallet.WalletsType,
		Balance: int64(wallet.WalletsBalance),
	}

	return ret, err
}

// ListWallets returns the ids, types and names of all wallets.
// If there are no wallets, an empty slice will be returned
// If there are wallets to show, ListWallets will return up
// to limit wallets. In case limit <=0, ListWallets will return
// all wallets available.
func ListWallets(conn *sqlite.Conn, limit int) ([]Wallet, error) {
	var resultArray []Wallet

	res, err := listWallets(conn, "", int64(limit))
	if err != nil {
		return resultArray, err
	}

	for _, s := range res {
		resultArray = append(resultArray,
			Wallet{
				ID:      s.WalletsID,
				Address: s.WalletsAddress,
				Name:    s.WalletsName,
				Type:    s.WalletsType,
				Balance: int64(s.WalletsBalance),
			})
	}

	return resultArray, err
}

// InsertWallet creates a new wallet record in the database given a
// valid Wallet with all fields properly set. If this is the first
// wallet, then it becomes default automatically. If token is not known at creation time
// it can be null. Login and password, however have to be valid credentials.
func InsertWallet(conn *sqlite.Conn, wallet Wallet, login, password, token []byte) error {
	if len(wallet.ID) != idcharLength {
		return fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(wallet.ID))
	}

	if err := insertWallet(conn, wallet.ID, wallet.Address, strings.ToLower(wallet.Type),
		login, password, token, wallet.Name, int64(wallet.Balance)); err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return fmt.Errorf("couldn't insert wallet: %w", ErrDuplicateIndex)
		}
		return fmt.Errorf("couldn't insert wallet: %w", err)
	}

	//If the previously inserted was the first one, then it should be the default as well
	nwallets, err := getWalletCount(conn)
	if err != nil {
		return fmt.Errorf("couldn't get wallet count: %w", err)
	}

	if nwallets.Count == 1 {
		if err = setDefaultWallet(conn, DefaultWalletKey, wallet.ID); err != nil {
			return fmt.Errorf("couldn't set newly created wallet to default: %w", err)
		}
	}

	return nil
}

// GetDefaultWallet gets the user's default wallet. If the user didn't manually
// update the default wallet, then the first wallet ever created is the default
// wallet. It will remain default until manually changed.
func GetDefaultWallet(conn *sqlite.Conn) (Wallet, error) {
	ret, err := getDefaultWallet(conn, DefaultWalletKey)
	if err != nil {
		return Wallet{}, err
	}
	if ret.WalletsID == "" {
		return Wallet{}, fmt.Errorf("No default wallet found")
	}
	return Wallet{
		ID:      ret.WalletsID,
		Address: ret.WalletsAddress,
		Name:    ret.WalletsName,
		Type:    ret.WalletsType,
		Balance: int64(ret.WalletsBalance),
	}, nil
}

// UpdateDefaultWallet sets the default wallet to the one that matches newIdx
// previous default wallet is replaced by the new one so only one can be
// the default at any given time. The default wallet is the first wallet ever
// created until manually changed.
func UpdateDefaultWallet(conn *sqlite.Conn, newID string) (Wallet, error) {
	var err error

	if len(newID) != idcharLength {
		return Wallet{}, fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(newID))
	}

	defaultWallet, err := GetWallet(conn, newID)
	if err != nil {
		return Wallet{}, fmt.Errorf("cannot make %s default: %w", newID, err)
	}

	if err := setDefaultWallet(conn, DefaultWalletKey, newID); err != nil {
		return Wallet{}, fmt.Errorf("cannot set %s as default wallet: %w", newID, err)
	}

	return defaultWallet, nil
}

// UpdateWalletName updates an existing wallet's name with the one provided.
// If the wallet represented by the id id does not exist, this function
// returns error. nil otherwise, along with the updated wallet.
func UpdateWalletName(conn *sqlite.Conn, walletID string, newName string) (Wallet, error) {
	if len(walletID) != idcharLength {
		return Wallet{}, fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(walletID))
	}

	if err := updateWalletName(conn, newName, walletID); err != nil {
		return Wallet{}, err
	}

	return GetWallet(conn, walletID)
}

// RemoveWallet deletes the wallet with index id. If that wallet was the default
// wallet, a random wallet will be chosen as new default. Although it is advised
// that the user manually changes the default wallet after removing the previous
// default.
func RemoveWallet(conn *sqlite.Conn, id string) error {
	if len(id) != idcharLength {
		return fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(id))
	}
	wallet2delete, err := getWallet(conn, id)
	if err != nil {
		return fmt.Errorf("couldn't find wallet for deletion, probably already deleted")
	}

	defaultWallet, err := GetDefaultWallet(conn)
	if err != nil {
		return fmt.Errorf("couldn't get default wallet while deleting walletID %s", id)
	}

	if wallet2delete.WalletsType == lndhubsql.LndhubGoWalletType && defaultWallet.ID == wallet2delete.WalletsID {
		return fmt.Errorf("The internal wallet %s must not be removed", wallet2delete.WalletsName)
	}

	if err := removeWallet(conn, id); err != nil {
		return fmt.Errorf("couldn't remove wallet. Unknown reason")
	}

	//If the previously inserted was the default, then we should set a new default
	if defaultWallet.ID == id {
		nwallets, err := getWalletCount(conn)

		if err != nil {
			return fmt.Errorf("couldn't get wallet count")
		}

		if nwallets.Count != 0 {
			newDefaultWallet, err := ListWallets(conn, 1)
			if err != nil {
				return fmt.Errorf("couldn't list wallets")
			}
			if err = setDefaultWallet(conn, DefaultWalletKey, newDefaultWallet[0].ID); err != nil {
				return fmt.Errorf("couldn't pick a wallet to be the new default after deleting the old one")
			}
		} else if err = removeDefaultWallet(conn, DefaultWalletKey); err != nil {
			return fmt.Errorf("couldn't remove default wallet after deleting the last one")
		}
	}

	return nil
}
