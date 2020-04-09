// Package server implements Mintter HTTP server.
package server

import (
	"fmt"
	"mintter/backend/identity"
	"os"
	"sync"

	"go.uber.org/zap"
)

// Server implements Mintter rpc.
type Server struct {
	repoPath string
	log      *zap.Logger

	// Don't access these directly. Use loadProfile and storeProfile methods.
	mu   sync.Mutex
	prof identity.Profile
}

// NewServer creates a new Server.
func NewServer(repoPath string, log *zap.Logger) (*Server, error) {
	if err := os.MkdirAll(repoPath, 0700); err != nil {
		return nil, fmt.Errorf("unable to initialize local repo: %w", err)
	}

	return &Server{
		repoPath: repoPath,
		log:      log,
	}, nil
}

// RepoPath returns repo path.
func (s *Server) RepoPath() string {
	return s.repoPath
}
