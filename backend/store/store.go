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
	"go.uber.org/multierr"
)

// Store is the persistence layer of the app.
type Store struct {
	repoPath string
	db       datastore.TxnDatastore
	lb       *logbook.Book

	profilesKey datastore.Key
	draftsKey   datastore.Key
	pubsKey     datastore.Key

	pc   profileCache
	prof identity.Profile
}

// Create a new Store.
func Create(repoPath string, prof identity.Profile) (*Store, error) {
	if err := os.MkdirAll(repoPath, 0700); err != nil {
		return nil, fmt.Errorf("store: failed to initialize local repo in %s: %w", repoPath, err)
	}

	return new(repoPath, prof)
}

// Open an existing store from disk.
func Open(repoPath string) (*Store, error) {
	pc := profileCache{
		filename: filepath.Join(repoPath, "profile.json"),
	}

	prof, err := pc.load()
	if err != nil {
		return nil, err
	}

	return new(repoPath, prof)
}

func new(repoPath string, prof identity.Profile) (s *Store, err error) {
	db, err := badger.NewDatastore(filepath.Join(repoPath, "store"), &badger.DefaultOptions)
	if err != nil {
		return nil, err
	}
	defer func() {
		// We have to close the db if store creation failed.
		// DB is created inline for convenience.
		if err != nil {
			err = multierr.Append(err, db.Close())
		}
	}()

	s = &Store{
		repoPath:    repoPath,
		db:          db,
		prof:        prof,
		profilesKey: datastore.NewKey("/profiles"),
		draftsKey:   datastore.NewKey("/drafts"),
		pubsKey:     datastore.NewKey("/publications"),
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

// LogBook retrieves the underlying store log book.
func (s *Store) LogBook() *logbook.Book {
	return s.lb
}
