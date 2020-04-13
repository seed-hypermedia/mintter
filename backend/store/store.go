// Package store provides persistence layer for the local application.
package store

import (
	"errors"
	"fmt"
	"mintter/backend/logbook"
	"os"
	"path/filepath"
	"sync"

	"github.com/ipfs/go-datastore"
	badger "github.com/ipfs/go-ds-badger"
)

// Store is the persistence layer of the app.
type Store struct {
	repoPath string
	db       datastore.TxnDatastore
	pc       profileCache

	// Use logs() method to access these. Lazy initialization.
	once sync.Once
	l    *logbook.Book
}

// New creates a new Store.
func New(repoPath string) (*Store, error) {
	if err := os.MkdirAll(repoPath, 0700); err != nil {
		return nil, fmt.Errorf("failed initialize local repo: %w", err)
	}

	db, err := badger.NewDatastore(filepath.Join(repoPath, "store"), &badger.DefaultOptions)
	if err != nil {
		return nil, err
	}

	s := &Store{
		repoPath: repoPath,
		db:       db,
	}

	s.pc.filename = filepath.Join(repoPath, "profile.json")

	return s, nil
}

// Close the store.
func (s *Store) Close() error {
	return s.db.Close()
}

// RepoPath returns the base repo path.
func (s *Store) RepoPath() string {
	return s.repoPath
}

func (s *Store) logbook() (*logbook.Book, error) {
	// Load profile, if good, init logs.
	prof, err := s.pc.load()
	if err != nil {
		return nil, err
	}

	if prof.Account.ID == "" {
		return nil, errors.New("account is not initialized")
	}

	s.once.Do(func() {
		s.l, err = logbook.New(prof.Account, s.db)
	})

	return s.l, err
}
