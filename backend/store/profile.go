package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mintter/backend/identity"
	"os"
	"sync"
)

// TODO: Rehydrate profile from the log.

// CreateProfile for the first time.
func (s *Store) CreateProfile(ctx context.Context, prof identity.Profile) error {
	if _, err := s.pc.load(); err == nil {
		return errors.New("account is already initialized")
	}

	return s.pc.store(prof)
}

// UpdateProfile in the store. It is actually an upsert.
func (s *Store) UpdateProfile(ctx context.Context, prof identity.Profile) (identity.Profile, error) {
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

	logs, err := s.logs()
	if err != nil {
		return identity.Profile{}, err
	}

	// TODO(burdiyan): verify the signature of the record?
	if _, err := logs.profile.Append(eventAbout.New(diff)); err != nil {
		return identity.Profile{}, fmt.Errorf("failed to append to log: %w", err)
	}

	return merged, nil
}

// GetProfile from the store.
func (s *Store) GetProfile(ctx context.Context) (identity.Profile, error) {
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
