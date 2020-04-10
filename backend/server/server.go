// Package server implements Mintter HTTP server.
package server

import (
	"fmt"

	"mintter/backend/store"

	"go.uber.org/zap"
)

// Server implements Mintter rpc.
type Server struct {
	repoPath string
	log      *zap.Logger
	store    *store.Store
}

// NewServer creates a new Server.
func NewServer(repoPath string, log *zap.Logger) (*Server, error) {
	store, err := store.New(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create the store: %w", err)
	}

	return &Server{
		repoPath: repoPath,
		log:      log,
		store:    store,
	}, nil
}

// RepoPath returns server's repo path.
func (s *Server) RepoPath() string {
	return s.repoPath
}

// Close the server.
func (s *Server) Close() error {
	return s.store.Close()
}
