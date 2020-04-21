package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mintter/backend/identity"
	"mintter/backend/logbook"
	"os"
	"sync"
)

// UpdateProfile in the store. It is actually an upsert.
func (s *Store) UpdateProfile(ctx context.Context, prof identity.Profile) (identity.Profile, error) {
	// TODO(burdiyan): Check to only update current profile.

	old, err := s.pc.load()
	if err != nil {
		return identity.Profile{}, err
	}

	merged := old
	if err := merged.Merge(prof); err != nil {
		return identity.Profile{}, err
	}

	if err := s.pc.store(merged); err != nil {
		return identity.Profile{}, err
	}

	diff, ok := old.About.Diff(merged.About)
	if !ok {
		return merged, nil
	}

	lg, err := s.lb.Get(logbook.LogID{
		LogName: logbook.NameProfile,
		Account: s.pc.p.Account,
	})
	if err != nil {
		return identity.Profile{}, fmt.Errorf("failed to get profile log: %w", err)
	}

	// TODO(burdiyan): verify the signature of the record?
	if _, err := lg.Append(eventAbout.New(diff)); err != nil {
		return identity.Profile{}, fmt.Errorf("failed to append to log: %w", err)
	}

	return merged, nil
}

// GetProfile from the store.
// func (s *Store) GetProfile(ctx context.Context) (identity.Profile, error) {
// 	return s.pc.load()
// }

// CurrentProfile returns current user's profile.
func (s *Store) CurrentProfile(ctx context.Context) (identity.Profile, error) {
	return s.pc.load()
}

type profileCache struct {
	filename string

	mu sync.Mutex
	p  identity.Profile
}

func (pc *profileCache) load() (identity.Profile, error) {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	if pc.p.Account.ID != "" {
		return pc.p, nil
	}

	f, err := os.Open(pc.filename)
	if err != nil {
		return identity.Profile{}, fmt.Errorf("failed to load profile: %w", err)
	}
	defer f.Close()

	if err := json.NewDecoder(f).Decode(&pc.p); err != nil {
		return identity.Profile{}, fmt.Errorf("failed to decode json profile: %w", err)
	}

	if pc.p.Account.ID == "" {
		return identity.Profile{}, errors.New("profile is not initialized")
	}

	return pc.p, nil
}

func (pc *profileCache) store(p identity.Profile) error {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	f, err := os.Create(pc.filename)
	if err != nil {
		return fmt.Errorf("failed to create profile file: %w", err)
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")

	if err := enc.Encode(p); err != nil {
		return fmt.Errorf("failed to encode json: %w", err)
	}

	pc.p = p

	return nil
}
