// Package store provides persistence layer for the local application.
package store

import (
	"fmt"
	"mintter/backend/identity"
	"mintter/backend/logbook"
	"os"
	"path/filepath"

	"github.com/ipfs/go-datastore"
	badger "github.com/ipfs/go-ds-badger"
)

// Store is the persistence layer of the app.
type Store struct {
	repoPath string
	db       datastore.TxnDatastore
	lb       *logbook.Book

	pc profileCache
}

// New creates a new Store.
func New(repoPath string, prof identity.Profile) (*Store, error) {
	if err := os.MkdirAll(repoPath, 0700); err != nil {
		return nil, fmt.Errorf("failed to initialize local repo: %w", err)
	}

	db, err := badger.NewDatastore(filepath.Join(repoPath, "store"), &badger.DefaultOptions)
	if err != nil {
		return nil, err
	}

	s := &Store{
		repoPath: repoPath,
		db:       db,
	}

	s.lb, err = logbook.New(prof.Account, s.db)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize logbook: %w", err)
	}

	s.pc.filename = filepath.Join(repoPath, "profile.json")

	if err := s.pc.store(prof); err != nil {
		return nil, err
	}

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
