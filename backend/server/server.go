// Package server implements Mintter HTTP server.
package server

import (
	"context"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/p2p"
	"mintter/backend/store"
	"mintter/proto"
	"os"

	"go.uber.org/atomic"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements Mintter rpc.
type Server struct {
	proto.DocumentsServer

	cfg config.Config
	log *zap.Logger

	// We are doing a kind of lazy init for these within InitProfile handler
	// and we recover the state in the constructor if profile was previously initialized.
	ready atomic.Bool
	store *store.Store
	node  *p2p.Node
}

// NewServer creates a new Server.
func NewServer(cfg config.Config, log *zap.Logger) (*Server, error) {
	if err := os.MkdirAll(cfg.RepoPath, 0700); err != nil {
		return nil, fmt.Errorf("failed to initialize local repo in %s: %w", cfg.RepoPath, err)
	}

	s := &Server{
		log: log,
		cfg: cfg,
		// TODO(burdiyan): Remove this when server is implemented fully. It's just for convenience now.
		DocumentsServer: &proto.UnimplementedDocumentsServer{},
	}

	// Make sure to check InitProfile handler if changing this.
	if store, err := store.Open(cfg.RepoPath); err == nil {
		s.store = store
		s.node, err = p2p.NewNode(context.Background(), cfg.RepoPath, store, log.With(zap.String("component", "p2p")), cfg.P2P)
		if err != nil {
			return nil, err
		}
		s.ready.CAS(false, true)
	}

	return s, nil
}

// Config returns underlying config for tests.
func (s *Server) Config() config.Config {
	return s.cfg
}

// Close the server.
func (s *Server) Close() (err error) {
	if !s.ready.Load() {
		return nil
	}

	err = multierr.Combine(err, s.node.Close(), s.store.Close())

	return err
}

func (s *Server) checkReady() error {
	if !s.ready.Load() {
		return status.Error(codes.FailedPrecondition, "call InitProfile first")
	}

	return nil
}
