// Package logbook groups various append-only logs for each profile.
package logbook

import (
	"mintter/backend/appendonly"
	"mintter/backend/identity"

	"github.com/ipfs/go-datastore"
)

// Book is a group of append-only logs.
type Book struct {
	Profile *appendonly.Log
}

// New creates a new logbook.
func New(acc identity.Account, db datastore.TxnDatastore) (*Book, error) {
	var (
		b   = &Book{}
		err error
	)

	b.Profile, err = appendonly.NewLog("profile", acc, db)
	if err != nil {
		return nil, err
	}

	return b, nil
}
