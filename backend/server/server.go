// Package server implements Mintter HTTP server.
package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"mintter/backend/identity"
	"mintter/backend/store"
	"os"
	"path/filepath"
	"sync"

	"go.uber.org/atomic"
	"go.uber.org/zap"
)

// Server implements Mintter rpc.
type Server struct {
	repoPath string
	log      *zap.Logger
	pc       profileCache

	ready atomic.Bool
	store *store.Store
}

// NewServer creates a new Server.
func NewServer(repoPath string, log *zap.Logger) (*Server, error) {
	if err := os.MkdirAll(repoPath, 0700); err != nil {
		return nil, fmt.Errorf("failed initialize local repo: %w", err)
	}

	s := &Server{
		repoPath: repoPath,
		log:      log,
	}

	s.pc.filename = filepath.Join(repoPath, "profile.json")

	if prof, err := s.pc.load(); err == nil {
		s.store, err = store.New(repoPath, prof)
		if err != nil {
			return nil, err
		}

		s.ready.CAS(false, true)
	}

	return s, nil
}

// RepoPath returns server's repo path.
func (s *Server) RepoPath() string {
	return s.repoPath
}

// Close the server.
func (s *Server) Close() error {
	if !s.ready.Load() {
		return nil
	}

	return s.store.Close()
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
