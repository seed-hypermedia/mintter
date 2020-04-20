// Package logbook groups various append-only logs for each profile.
package logbook

import (
	"mintter/backend/appendonly"
	"mintter/backend/identity"
	"sync"

	"github.com/ipfs/go-datastore"
)

// Well-known log names.
const (
	NameProfile = "profile"
)

// LogID combines the account and log name as a log identity.
type LogID struct {
	Account identity.Account
	LogName string
}

// Book is a group of append-only logs.
type Book struct {
	db  datastore.TxnDatastore
	acc identity.Account // Owner's account.

	mu   sync.Mutex
	logs map[LogID]*appendonly.Log // TODO(burdiyan): Introduce APC/LRU cache to avoid unbounded growth.
}

// Get the log for profile.
func (b *Book) Get(id LogID) (*appendonly.Log, error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	log := b.logs[id]
	if log == nil {
		l, err := appendonly.NewLog(id.LogName, id.Account, b.db)
		if err != nil {
			return nil, err
		}
		log = l
		b.logs[id] = log
	}

	return log, nil
}

// List all known logs.
func (b *Book) List() []LogID {
	b.mu.Lock()
	defer b.mu.Unlock()

	out := make([]LogID, 0, len(b.logs))
	for k := range b.logs {
		out = append(out, k)
	}

	return out
}

// New creates a new logbook.
func New(acc identity.Account, db datastore.TxnDatastore) (*Book, error) {
	b := &Book{
		logs: make(map[LogID]*appendonly.Log),
		acc:  acc,
		db:   db,
	}

	return b, nil
}
