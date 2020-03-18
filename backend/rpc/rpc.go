package rpc

import (
	"fmt"
	"os"

	"github.com/lightningnetwork/lnd/aezeed"
)

// Mnemonic is wallet recovery phrase.
type Mnemonic = aezeed.Mnemonic

// EncipheredSeed is the raw seed enciphered with the passphrase.
type EncipheredSeed = [aezeed.EncipheredCipherSeedSize]byte

// Server implements Mintter rpc.
type Server struct {
	repoPath string
}

// NewServer creates a new Server.
func NewServer(repoPath string) (*Server, error) {
	if err := os.MkdirAll(repoPath, 0700); err != nil {
		return nil, fmt.Errorf("unable to initialize local repo: %w", err)
	}

	return &Server{
		repoPath: repoPath,
	}, nil
}
