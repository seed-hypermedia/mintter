package daemon

import (
	"crypto/rand"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/keychain"
)

// Daemon implements the functionality of the Mintter node.
type Daemon struct {
	opts options
}

// New creates a new Daemon instance.
func New(opts ...Option) (*Daemon, error) {
	op := defaultOptions()

	for _, o := range opts {
		o(&op)
	}

	if err := os.MkdirAll(op.repoPath, 0700); err != nil {
		return nil, fmt.Errorf("unable to initialize local repo: %w", err)
	}

	return &Daemon{
		opts: op,
	}, nil
}

// Mnemonic is wallet recovery phrase.
type Mnemonic = aezeed.Mnemonic

// EncipheredSeed is the raw seed enciphered with the passphrase.
type EncipheredSeed = [aezeed.EncipheredCipherSeedSize]byte

// GenSeed will generate and store the user's seed in the repo.
func (d *Daemon) GenSeed(passphrase []byte) (Mnemonic, EncipheredSeed, error) {
	seed, err := newSeed()
	if err != nil {
		return Mnemonic{}, EncipheredSeed{}, err
	}

	rawSeed, err := seed.Encipher(passphrase)
	if err != nil {
		return Mnemonic{}, EncipheredSeed{}, fmt.Errorf("failed to encipher seed: %w", err)
	}

	words, err := seed.ToMnemonic(passphrase)
	if err != nil {
		return Mnemonic{}, EncipheredSeed{}, fmt.Errorf("failed to create mnemonic: %w", err)
	}

	return words, rawSeed, nil
}

// InitWallet initialize the daemon from the provided mnemonic.
func (d *Daemon) InitWallet(m Mnemonic, pass []byte) error {
	seed, err := m.ToCipherSeed(pass)
	if err != nil {
		return fmt.Errorf("failed to decipher seed: %w", err)
	}

	rawSeed, err := seed.Encipher(pass)
	if err != nil {
		return fmt.Errorf("failed to encipher seed: %w", err)
	}

	if _, err := d.loadSeed(); err == nil {
		return errors.New("wallet is already initialized")
	}

	if err := d.storeSeed(rawSeed); err != nil {
		return fmt.Errorf("failed to store seed: %w", err)
	}

	return nil
}

func (d *Daemon) storeSeed(seed EncipheredSeed) error {
	return ioutil.WriteFile(filepath.Join(d.opts.repoPath, "seed"), seed[:], 0400)
}

func (d *Daemon) loadSeed() (EncipheredSeed, error) {
	var seed EncipheredSeed

	data, err := ioutil.ReadFile(filepath.Join(d.opts.repoPath, "seed"))
	if err != nil {
		return seed, err
	}

	copy(seed[:], data)

	return seed, nil
}

func newSeed() (*aezeed.CipherSeed, error) {
	var entropy [aezeed.EntropySize]byte

	if _, err := rand.Read(entropy[:]); err != nil {
		return nil, fmt.Errorf("unable to generate random seed: %w", err)
	}

	return aezeed.New(keychain.KeyDerivationVersion, &entropy, time.Now())
}
