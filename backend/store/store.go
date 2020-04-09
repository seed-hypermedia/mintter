// Package store provides persistence layer for the local application.
package store

import (
	"context"
	"mintter/backend/identity"
)

// Store is the persistence layer of the app.
type Store struct {
}

// UpdateProfile in the store.
func (s *Store) UpdateProfile(ctx context.Context, prof identity.Profile) error {
	// Store profile.
	// Diff with existing profile.
	// Publish diff in the log.

	return nil
}

// GetProfile from the store.
func (s *Store) GetProfile(ctx context.Context) (identity.Profile, error) {
	return identity.Profile{}, nil
}

type logRecord struct {
	Type string      `cbor:"type"`
	Data interface{} `cbor:"data"`
}
