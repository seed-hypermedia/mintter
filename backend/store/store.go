// Package store provides persistence layer for the local application.
package store

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"mintter/backend/cleanup"
	"mintter/backend/identity"
	"mintter/backend/logbook"

	"github.com/ipfs/go-datastore"
	badger "github.com/ipfs/go-ds-badger"
	"github.com/libp2p/go-libp2p-core/peerstore"
	"github.com/libp2p/go-libp2p-peerstore/pstoreds"
	"go.uber.org/multierr"
)

var (
	keyProfiles         = datastore.NewKey("/mintter/profiles")
	keyDrafts           = datastore.NewKey("/mintter/drafts")
	keyPublications     = datastore.NewKey("/mintter/publications")
	keyConnectionStatus = datastore.NewKey("/mintter/connectionStatus")
)

// Store is the persistence layer of the app.
type Store struct {
	repoPath string
	prof     identity.Profile

	ps      peerstore.Peerstore
	db      datastore.TxnDatastore
	lb      *logbook.Book
	pc      profileCache
	cleanup io.Closer
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
	var cleanup cleanup.Stack
	db, err := badger.NewDatastore(filepath.Join(repoPath, "store"), &badger.DefaultOptions)
	if err != nil {
		return nil, err
	}
	cleanup = append(cleanup, db)
	defer func() {
		// We have to close the db if store creation failed.
		// DB is created inline for convenience.
		if err != nil {
			err = multierr.Append(err, cleanup.Close())
		}
	}()

	ps, err := pstoreds.NewPeerstore(context.Background(), db, pstoreds.DefaultOpts())
	if err != nil {
		return nil, fmt.Errorf("failed to create peer store: %w", err)
	}
	cleanup = append(cleanup, ps)

	s = &Store{
		ps:       ps,
		repoPath: repoPath,
		db:       db,
		prof:     prof,
		cleanup:  cleanup,
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
	return s.cleanup.Close()
}

// RepoPath returns the base repo path.
func (s *Store) RepoPath() string {
	return s.repoPath
}

// LogBook retrieves the underlying store log book.
func (s *Store) LogBook() *logbook.Book {
	return s.lb
}

// Peerstore retrieves the underlying peer store.
func (s *Store) Peerstore() peerstore.Peerstore {
	return s.ps
}

func (s *Store) get(k datastore.Key) ([]byte, error) {
	v, err := s.db.Get(k)
	if err != nil {
		return nil, fmt.Errorf("failed to get %s: %w", k, err)
	}

	return v, nil
}
