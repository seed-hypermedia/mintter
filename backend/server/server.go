// Package server implements Mintter HTTP server.
package server

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/identity"
	"mintter/backend/p2p"
	"mintter/backend/store"
	"os"

	"go.uber.org/atomic"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements Mintter rpc.
type Server struct {
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
	}

	if err := s.init(identity.Profile{}); err != nil {
		return nil, fmt.Errorf("failed to init node: %w", err)
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

func (s *Server) init(prof identity.Profile) (err error) {
	if s.ready.Load() {
		return errors.New("already initialized")
	}

	// We have to attempt to load profile from the repo in case in was already initialized before.
	// Initializing with a new profile in this case should fail. Otherwise we can safely create a new profile.
	s.store, err = store.Open(s.cfg.RepoPath)
	if err != nil {
		if prof.ID.ID == "" {
			return nil
		}

		s.store, err = store.Create(s.cfg.RepoPath, prof)
		if err != nil {
			return fmt.Errorf("failed to create a store: %w", err)
		}
	} else {
		if prof.ID.ID != "" {
			return errors.New("remove existing profile before initializing a new one")
		}
	}

	s.node, err = p2p.NewNode(context.Background(), s.cfg.RepoPath, s.store, s.log.With(zap.String("component", "p2p")), s.cfg.P2P)
	if err != nil {
		return fmt.Errorf("failed to init P2P node: %w", err)
	}

	s.ready.CAS(false, true)

	return nil
}

func (s *Server) checkReady() error {
	if !s.ready.Load() {
		return status.Error(codes.FailedPrecondition, "call InitProfile first")
	}

	return nil
}
