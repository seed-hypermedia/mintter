package getkeys

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

func openDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", path+"?mode=ro")
	if err != nil {
		return nil, err
	}
	return db, nil
}

func getCurrentIdx(db *sql.DB) (int, error) {
	row := db.QueryRow("SELECT intval FROM vars WHERE name='bip32_max_index';")
	if row.Err() != nil {
		return 0, row.Err()
	}
	var idx int
	if err := row.Scan(&idx); err != nil {
		return 0, err
	}
	return idx, nil
}
