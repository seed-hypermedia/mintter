package sqliteschema

import (
	"encoding/hex"
	"fmt"
	"reflect"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/mitchellh/mapstructure"
)

// GetWallet retrieves information about the specific wallet identified with idx string
// idx is the string representation of the credential hash of the lndhub wallet or the
// string representation of the public key in an lnd wallet. In case there isn't any
// wallet identified with idx an empty slice will be returned and no error. The user must
// check the lenght of the returned struct. If idx is left blank by the user, all wallets
// will be returned and is up to the user to filter them out given the returned slice
func GetWallet(conn *sqlite.Conn, idx string) ([]Wallet, error) {

	var result_array []Wallet

	var query string
	if idx != "" {
		query = fmt.Sprintf("SELECT * from %s where %s=%s;", walletsTable, indexColumn, idx)
	} else {
		query = fmt.Sprintf("SELECT * from %s;", walletsTable)
	}

	err := sqlitex.ExecTransient(conn, query, func(stmt *sqlite.Stmt) error {
		// We enter here once per matching row, so we must aggreate results
		var single_result Wallet
		err := fetchData(stmt, &single_result)
		result_array = append(result_array, single_result)
		return err
	})

	return result_array, err
}

// UNDER CONSTRUCTION
func InsertWallet(conn *sqlite.Conn, idx string, wallet Wallet) error {

	query := "INSERT INTO $wallet_table ($id_column_name,$type_column_name,$auth_column_name,$default_wallet_column_name,$name_column_name," +
		"$initial_balance_column_name) VALUES ($id_value,$type_value,$auth_value,$default_wallet_value,$name_value,$initial_balance_value)"
	stmt := conn.Prep(query)
	defer stmt.Finalize()
	stmt.SetText("$id_column_name", indexColumn)
	stmt.SetText("$type_column_name", typeWalletColumn)
	stmt.SetText("$auth_column_name", authWalletColumn)
	stmt.SetText("$default_wallet_column_name", defaultWalletColumn)
	stmt.SetText("$name_column_name", nameWalletColumn)
	stmt.SetText("$initial_balance_column_name", initialBalanceWalletColumn)
	stmt.SetText("$wallet_table", walletsTable)
	stmt.SetText("$id_value", wallet.Id)
	stmt.SetText("$type_value", wallet.Type)
	stmt.SetText("$auth_value", hex.EncodeToString(wallet.Auth))
	stmt.SetText("$name_value", wallet.Name)
	stmt.SetBool("$default_wallet_value", false) //TODO: check first if it should be true (the first one)
	stmt.SetInt64("$initial_balance_value", wallet.Initial_balance)
	if _, err := stmt.Step(); err != nil {
		return err
	}

	return nil
}

// GetDefaultWallet gets the user's default wallet. If the user didn't manually
// update the default wallet, then the first wallet ever created is the default
// wallet. It will remain default until manually changed.
func GetDefaultWallet(conn *sqlite.Conn) (string, error) {

	query := fmt.Sprintf("SELECT %s from %s where %s=1 LIMIT 1;", indexColumn, walletsTable, defaultWalletColumn)

	type defaultWallet struct {
		id string
	}
	var walletId defaultWallet
	err := sqlitex.ExecTransient(conn, query, func(stmt *sqlite.Stmt) error {
		return fetchData(stmt, &walletId)
	})

	return walletId.id, err
}

// UpdateDefaultWallet sets the default wallet to the one that matches newIdx
// previous default wallet is replaced by the new one so only one can be
// the default at any given time. The default wallet is the first wallet ever
// created until manually changed
func UpdateDefaultWallet(conn *sqlite.Conn, newIdx string) error {

	prevDefaultId, err := GetDefaultWallet(conn)
	if err != nil {
		return fmt.Errorf("couldn't get the previous default")
	}

	var query string

	query = fmt.Sprintf("UPDATE %s SET %s = 1 where %s=%s;", walletsTable, defaultWalletColumn, indexColumn, newIdx)
	if err := sqlitex.ExecTransient(conn, query, nil); err != nil {
		return fmt.Errorf("couldn't set new default wallet %s", err)
	}

	query = fmt.Sprintf("UPDATE %s SET %s = 0 where %s=%s;", walletsTable, defaultWalletColumn, indexColumn, prevDefaultId)
	if err := sqlitex.ExecTransient(conn, query, nil); err != nil {

		// if we cannot set the previous default to non default, then we roll back the changes we made, so the old one will still be the default
		query = fmt.Sprintf("UPDATE %s SET %s = 0 where %s=%s;", walletsTable, defaultWalletColumn, indexColumn, newIdx)
		sqlitex.ExecTransient(conn, query, nil)
		return fmt.Errorf("couldn't disable old default wallet %s", err)
	}

	return nil
}

// fetchData takes a sqlite statement where the query was done.
// It also takes a struct whose field names are the colums to retrieve.
// filed types must be in accordance with theit respective sqlite
// equivalent
func fetchData(stmt *sqlite.Stmt, retStruct interface{}) error {

	trueVal := reflect.TypeOf(retStruct).Elem()
	if trueVal.Kind().String() != "struct" {
		return fmt.Errorf("expecting retStruct to be a struct but is %s instead", trueVal.Kind().String())
	}

	numFields := trueVal.NumField()

	generic := make(map[string]interface{})
	for columnIndex := 0; columnIndex < numFields; columnIndex++ {

		columnName := trueVal.Field(columnIndex).Name

		var genericVal interface{}
		switch columnType := stmt.ColumnType(stmt.ColumnIndex(columnName)); columnType {
		case sqlite.SQLITE_BLOB:
			var buff []byte
			stmt.GetBytes(columnName, buff)
			genericVal = buff
		case sqlite.SQLITE_INTEGER:
			genericVal = stmt.GetInt64(columnName)
		case sqlite.SQLITE_FLOAT:
			genericVal = stmt.GetFloat(columnName)
		case sqlite.SQLITE_NULL:
			genericVal = nil
		case sqlite.SQLITE_TEXT:
			genericVal = stmt.GetText(columnName)
		default:
			return fmt.Errorf("sqlite type unreckognized")
		}
		generic[columnName] = genericVal
	}

	if retStruct != nil {
		if err := mapstructure.Decode(generic, retStruct); err != nil {
			return err
		}

	}
	return nil
}

/*
func insertData(conn *sqlite.Conn, insertStruct interface{}) error {

	trueVal := reflect.TypeOf(retStruct).Elem()
	if trueVal.Kind().String() != "struct" {
		return fmt.Errorf("expecting retStruct to be a struct but is %s instead", trueVal.Kind().String())
	}

	numFields := trueVal.NumField()

	generic := make(map[string]interface{})
	for fieldIndex := 0; fieldIndex < numFields; fieldIndex++ {

		field := trueVal.Field(fieldIndex)

		var genericVal interface{}

		switch fieldType := trueVal.Kind().String(); fieldType {
		case "slice", "array":
			field.Ge
			sqlite.SQLITE_BLOB:
			var buff []byte
			stmt.GetBytes(columnName, buff)
			genericVal = buff
		case "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64":
			sqlite.SQLITE_INTEGER
		case "float32", "float64":
			sqlite.SQLITE_FLOAT
		case "bool":
			sqlite.SQLITE_INTEGER
		case "string":
			sqlite.SQLITE_TEXT
		default:
			return fmt.Errorf("type %s doesn't have a direct sqlite conversion",fieldType)
		}
		generic[columnName] = genericVal
	}

	if retStruct != nil {
		if err := mapstructure.Decode(generic, retStruct); err != nil {
			return err
		}

	}
	return nil
}
*/

// fetchGenericData fills values of a map with data from the query in stmt. The map
// has to have the name of the columns as keys and an empty list of interfaces as
// values. For each row of the stmtm fetchGenericData will fill an entry in the list
// on each column. Deprecated
func fetchGenericData(stmt *sqlite.Stmt, columns *map[string][]interface{}) error {
	for {
		if hasRow, err := stmt.Step(); err != nil {
			return err
		} else if !hasRow {
			break
		}
		for columnName, val := range *columns {
			switch columnType := stmt.ColumnType(stmt.ColumnIndex(columnName)); columnType {
			case sqlite.SQLITE_BLOB:
				var buff []byte
				stmt.GetBytes(columnName, buff)
				val = append(val, buff)
			case sqlite.SQLITE_INTEGER:
				val = append(val, stmt.GetInt64(columnName))
			case sqlite.SQLITE_FLOAT:
				val = append(val, stmt.GetFloat(columnName))
			case sqlite.SQLITE_NULL:
				val = append(val, nil)
			case sqlite.SQLITE_TEXT:
				val = append(val, stmt.GetText(columnName))
			default:
				return fmt.Errorf("sqlite type unreckognized")
			}
			(*columns)[columnName] = val
		}
	}
	return nil
}
