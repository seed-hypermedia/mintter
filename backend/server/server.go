// Package server implements Mintter HTTP server.
package server

import (
	"fmt"
	"mintter/backend/store"
	"os"

	"go.uber.org/atomic"
	"go.uber.org/zap"
)

// Server implements Mintter rpc.
type Server struct {
	repoPath string
	log      *zap.Logger

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

	if store, err := store.Open(repoPath); err == nil {
		s.store = store
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
