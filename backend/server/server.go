// Package server implements Mintter HTTP server.
package server

import (
	"errors"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/identity"
	"mintter/backend/logging"
	"mintter/backend/p2p"
	"mintter/backend/store"
	"os"
	"strings"

	"go.uber.org/atomic"
	"go.uber.org/multierr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements Mintter rpc.
type Server struct {
	log      *logging.ZapEventLogger
	initFunc InitFunc

	// We are doing a kind of lazy init for these within InitProfile handler
	// and we recover the state in the constructor if profile was previously initialized.
	ready atomic.Bool
	store *store.Store
	node  *p2p.Node
}

var errLater = errors.New("will initialize later")

// InitFunc is a factory for dependencies of the Server. They are initialized lazily.
type InitFunc func(prof identity.Profile) (*store.Store, *p2p.Node, error)

// InitFuncFromConfig creates a default InitFunc from the given config.
//
// TODO(burdiyan): clean this up when we remove the v1 documents server. Now this is messy as hell.
func InitFuncFromConfig(cfg config.Config, log *logging.ZapEventLogger) InitFunc {
	return InitFunc(func(prof identity.Profile) (st *store.Store, n *p2p.Node, err error) {
		if strings.HasPrefix(cfg.RepoPath, "~") {
			homedir, err := os.UserHomeDir()
			if err != nil {
				return nil, nil, fmt.Errorf("failed to detect home directory: %w", err)
			}

			cfg.RepoPath = strings.Replace(cfg.RepoPath, "~", homedir, 1)
		}

		if err := os.MkdirAll(cfg.RepoPath, 0700); err != nil {
			return nil, nil, fmt.Errorf("failed to initialize local repo in %s: %w", cfg.RepoPath, err)
		}

		// We have to attempt to load profile from the repo in case in was already initialized before.
		// Initializing with a new profile in this case should fail. Otherwise we can safely create a new profile.
		st, err = store.Open(cfg.RepoPath)
		if err != nil {
			if prof.ID.ID == "" {
				return st, n, errLater
			}

			st, err = store.Create(cfg.RepoPath, prof)
			if err != nil {
				return st, n, fmt.Errorf("failed to create a store: %w", err)
			}
		} else {
			if prof.ID.ID != "" {
				return st, n, errors.New("remove existing profile before initializing a new one")
			}
		}

		n, err = p2p.NewNode(cfg.RepoPath, st, logging.Logger("p2p"), cfg.P2P)
		if err != nil {
			return st, n, fmt.Errorf("failed to init P2P node: %w", err)
		}

		return
	})
}

var uicfg config.UI

// SetUIConfig globally.
//
// TODO: this is a quick hack to avoid changing signature for NewServer,
// as all of this is being refactored.
func SetUIConfig(cfg config.UI) {
	uicfg = cfg
}

// NewServer creates a new Server.
func NewServer(init InitFunc, log *logging.ZapEventLogger) (*Server, error) {
	s := &Server{
		log:      log,
		initFunc: init,
	}

	if err := s.init(identity.Profile{}); err != nil {
		return nil, fmt.Errorf("failed to init node: %w", err)
	}

	return s, nil
}

// InitFunc returns the underlying init func. Used only for tests.
func (s *Server) InitFunc() InitFunc {
	return s.initFunc
}

// Close the server.
func (s *Server) Close() (err error) {
	if !s.ready.Load() {
		return nil
	}

	err = multierr.Combine(err, s.node.Close(), s.store.Close())

	return err
}

// Seed a server with already created profile. Mainly used for testing.
func (s *Server) Seed(prof identity.Profile) error {
	return s.init(prof)
}

func (s *Server) init(prof identity.Profile) (err error) {
	if s.ready.Load() {
		return errors.New("already initialized")
	}

	s.store, s.node, err = s.initFunc(prof)
	if err != nil {
		if err == errLater {
			return nil
		}
		return err
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
