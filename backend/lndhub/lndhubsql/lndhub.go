package lndhubsql

import (
	"crawshaw.io/sqlite"
)

// GetLogin returns the login used to connect to the wallet.
func GetLogin(conn *sqlite.Conn, id string) (string, error) {
	res, err := getLogin(conn, id)
	// TODO: decrypt login before returning
	return string(res.WalletsLogin[:]), err
}

// GetPassword returns the password used to connect to the wallet.
func GetPassword(conn *sqlite.Conn, id string) (string, error) {
	return "", nil
	//res, err := getLndhubPassword(conn, id)
	// TODO: decrypt pass before returning
	//return string(res.WalletsPassword[:]), err
}

// GetToken returns the token used to connect to the wallet. The response is
// a slice of bytes representing the token used to connect to the rest api.
func GetToken(conn *sqlite.Conn, id string) (string, error) {
	return "", nil
	//conn := c.db.Get(context.Background())
	//defer c.db.Put(conn)
	//res, err := getLndhubToken(conn, id)
	// TODO: decrypt token before returning
	//return string(res.WalletsToken[:]), err
}

// GetLogin returns the login used to connect to the wallet.
func SetLogin(conn *sqlite.Conn, id, login string) error {
	return nil
	//conn := c.db.Get(context.Background())
	//defer c.db.Put(conn)
	//err := setLndhubLogin(conn, []bytes(login), c.ID)
	// TODO: decrypt login before returning
	//return err
}

// GetPassword returns the password used to connect to the wallet.
func SetPassword(conn *sqlite.Conn, id, password string) error {
	return nil
	//conn := c.db.Get(context.Background())
	//defer c.db.Put(conn)
	//err := setLndhubPassword(conn, []bytes(password), c.ID)
	// TODO: decrypt pass before returning
	//return err
}

// GetToken returns the token used to connect to the wallet. The response is
// a slice of bytes representing the token used to connect to the rest api.
func SetToken(conn *sqlite.Conn, id, token string) error {
	return nil
	//conn := c.db.Get(context.Background())
	//defer c.db.Put(conn)
	//err := setLndhubToken(conn, []bytes(token), c.ID)
	// TODO: decrypt token before returning
	//return err
}
