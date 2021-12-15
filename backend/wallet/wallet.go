package wallet

import (
	"fmt"
	"strings"

	"crawshaw.io/sqlite"
)

const (
	idcharLength = 64

	// AlreadyExistsError can be used to check if inserting wallet failed because of al existing wallet.
	AlreadyExistsError = "UNIQUE constraint failed"
)

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
func GetWallet(conn *sqlite.Conn, id string) (Wallet, error) {
	if len(id) != idcharLength {
		return Wallet{}, fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(id))
	}

	wallet, err := getWallet(conn, id)
	if err != nil {
		return Wallet{}, err
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

	res, err := listWallets(conn, "", -1)
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
// valid Wallet with all fields proferly set. If this is the first
// wallet, then it becomes default automatically.
func InsertWallet(conn *sqlite.Conn, wallet Wallet, auth []byte) error {
	if len(wallet.ID) != idcharLength {
		return fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(wallet.ID))
	}

	if err := insertWallet(conn, wallet.ID, wallet.Address, strings.ToLower(wallet.Type),
		auth, wallet.Name, int(wallet.Balance)); err != nil {
		return fmt.Errorf("couldn't insert wallet. %s", err.Error())
	}

	//If the previously inserted was the first one, then it should be the default as well
	nwallets, err := getWalletCount(conn)
	if err != nil {
		return fmt.Errorf("couldn't get wallet count. %s", err.Error())
	}

	if nwallets.Count == 1 {
		if err = setDefaultWallet(conn, DefaultWalletKey, wallet.ID); err != nil {
			return fmt.Errorf("couldn't set newly created wallet to default. %s", err.Error())
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

	return Wallet{
		ID:      ret.WalletsID,
		Address: ret.WalletsAddress,
		Name:    ret.WalletsName,
		Type:    ret.WalletsType,
		Balance: int64(ret.WalletsBalance),
	}, nil
}

// GetAuth returns the credentials used to connect to the wallet. In case lndhub, the response is
// a slice of bytes representing the bearer token used to connect to the rest api. In case of LND
// wallet, the slice of bytes is the bynary representation of the macaroon used to connect to the node
func GetAuth(conn *sqlite.Conn, id string) ([]byte, error) {
	if len(id) != idcharLength {
		return []byte{}, fmt.Errorf("wallet id must be a %d-characters string. Got %d characters", idcharLength, len(id))
	}

	res, err := getWalletAuth(conn, id)
	// TODO: decrypt token before returning
	return res.WalletsAuth, err
}

// UpdateDefaultWallet sets the default wallet to the one that matches newIdx
// previous default wallet is replaced by the new one so only one can be
// the default at any given time. The default wallet is the first wallet ever
// created until manually changed
func UpdateDefaultWallet(conn *sqlite.Conn, newID string) (Wallet, error) {
	var err error

	if len(newID) != idcharLength {
		return Wallet{}, fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(newID))
	}

	defaultWallet, err := GetWallet(conn, newID)
	if err != nil {
		return Wallet{}, fmt.Errorf("cannot make %s default. %s", newID, err.Error())
	}

	if err := setDefaultWallet(conn, DefaultWalletKey, newID); err != nil {
		return Wallet{}, fmt.Errorf("cannot set %s as default wallet. %s", newID, err.Error())
	}

	return defaultWallet, nil
}

// UpdateWalletName updates an existing wallet's name with the one provided.
// If the wallet represented by the id id does not exist, this function
// returns error. nil otherwise, along with the updated wallet
func UpdateWalletName(conn *sqlite.Conn, id string, newName string) (Wallet, error) {
	if len(id) != idcharLength {
		return Wallet{}, fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(id))
	}

	if err := updateWalletName(conn, newName, id); err != nil {
		return Wallet{}, err
	}

	return GetWallet(conn, id)
}

// RemoveWallet deletes the wallet with index id. If that wallet was the default
// wallet, a random wallet will be chosen as new default. Although it is advised
// that the user manually changes the default wallet after removing the previous
// default
func RemoveWallet(conn *sqlite.Conn, id string) error {
	if len(id) != idcharLength {
		return fmt.Errorf("wallet id must be a %d character string. Got %d", idcharLength, len(id))
	}

	defaultWallet, err := GetDefaultWallet(conn)
	if err != nil {
		return fmt.Errorf("couldn't get wallet default wallet. %s", err.Error())
	}
	if err := removeWallet(conn, id); err != nil {
		return fmt.Errorf("couldn't remove wallet. %s", err.Error())
	}

	//If the previously inserted was the default, then we should set a new default
	if defaultWallet.ID == id {
		nwallets, err := getWalletCount(conn)

		if err != nil {
			return fmt.Errorf("couldn't get wallet count. %s", err.Error())
		}

		if nwallets.Count != 0 {
			newDefaultWallet, err := ListWallets(conn, 1)
			if err != nil {
				return fmt.Errorf("couldn't list wallets. %s", err.Error())
			}
			if err = setDefaultWallet(conn, DefaultWalletKey, newDefaultWallet[0].ID); err != nil {
				return fmt.Errorf("couldn't pick a wallet to be the new default after deleting the old one. %s", err.Error())
			}

		} else if err = removeDefaultWallet(conn, DefaultWalletKey); err != nil {
			return fmt.Errorf("couldn't remove default wallet after deleting the last one. %s", err.Error())
		}

	}

	return nil
}
