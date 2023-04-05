// Package ondisk manages database.
package ondisk

import (
	"bytes"
	"crypto/rand"
	"errors"
	"fmt"
	"mintter/backend/core"
	"os"
	"path/filepath"
	"sync"

	"github.com/libp2p/go-libp2p/core/crypto"
	"go.uber.org/zap"
)

/*
Repo layout v1 file tree:

- /VERSION => compatibility version
- /keys/
-- libp2p_id_ed25519 => device private key
-- mintter_id_ed25519.pub => account public key
- /db/
- /autocert-cache/ => directory with autocert cache
*/

const (
	// This is changed when breaking changes are made. Eventually we'd want
	// to support some migration mechanisms to help with backward-compatibility.
	compatibilityVersion = "2023-04-05.01"

	keysDir = "keys"
	dbDir   = "db"

	privKeyFilePath    = keysDir + "/libp2p_id_ed25519"
	accountKeyFilePath = keysDir + "/mintter_id_ed25519.pub"

	versionFilename = "VERSION"
)

// ErrRepoMigrate is a custom error type.
var ErrRepoMigrate = errors.New("repo migration failed")

// OnDisk is a configuration directory stored on disk.
type OnDisk struct {
	path   string
	device core.KeyPair

	mu    sync.Mutex
	acc   core.PublicKey
	ready chan struct{}
	log   *zap.Logger
}

// NewOnDisk creates a new OnDisk configuration repo.
func NewOnDisk(path string, log *zap.Logger) (r *OnDisk, err error) {
	r, err = prepareRepo(path, log)
	if err != nil {
		return nil, err
	}

	pk, err := r.deviceKeyFromFile()
	if err != nil {
		return nil, fmt.Errorf("failed to recover device key from file: %w", err)
	}

	if pk == nil {
		pk, _, err = crypto.GenerateEd25519Key(rand.Reader)
		if err != nil {
			return nil, fmt.Errorf("failed to generate random key pair: %w", err)
		}
	}

	if err := r.setupKeys(pk); err != nil {
		return nil, fmt.Errorf("failed to setup keys: %w", err)
	}

	return r, nil
}

// NewOnDiskWithDeviceKey creates a new repo with device key.
func NewOnDiskWithDeviceKey(path string, log *zap.Logger, key crypto.PrivKey) (r *OnDisk, err error) {
	r, err = prepareRepo(path, log)
	if err != nil {
		return nil, err
	}

	if err := r.setupKeys(key); err != nil {
		return nil, fmt.Errorf("failed to setup keys: %w", err)
	}

	return r, nil
}

func prepareRepo(path string, log *zap.Logger) (r *OnDisk, err error) {
	if !filepath.IsAbs(path) {
		return nil, fmt.Errorf("must provide absolute repo path, got = %s", path)
	}

	dirs := [...]string{
		path,
		filepath.Join(path, keysDir),
		filepath.Join(path, dbDir),
	}

	for _, d := range dirs {
		if err := os.MkdirAll(d, 0700); err != nil {
			return nil, fmt.Errorf("failed to create dir %s: %w", d, err)
		}
	}

	if err := migrateRepo(path); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrRepoMigrate, err)
	}

	r = &OnDisk{
		path:  path,
		ready: make(chan struct{}),
		log:   log,
	}

	return r, nil
}

// Device gets device.
func (r *OnDisk) Device() core.KeyPair {
	return r.device
}

// Account gets account.
func (r *OnDisk) Account() (core.PublicKey, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.acc.ID() == "" {
		return core.PublicKey{}, fmt.Errorf("account is not initialized")
	}

	return r.acc, nil
}

// MustAccount gets account immediately or panic.
func (r *OnDisk) MustAccount() core.PublicKey {
	acc, err := r.Account()
	if err != nil {
		panic(err)
	}
	return acc
}

// Ready gets ready.
func (r *OnDisk) Ready() <-chan struct{} {
	return r.ready
}

// CommitAccount commits an account.
func (r *OnDisk) CommitAccount(acc core.PublicKey) error {
	if _, err := r.readAccountFile(); err == nil {
		return fmt.Errorf("account is already committed")
	}

	if codec := acc.Codec(); codec != core.CodecAccountKey {
		return fmt.Errorf("invalid account codec: %d", codec)
	}

	if err := r.setAccount(acc); err != nil {
		return err
	}

	return r.writeAccountFile(acc)
}

func (r *OnDisk) setAccount(k core.PublicKey) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.acc = k

	r.log.Debug("AccountInitialized", zap.String("accountID", r.acc.CID().String()))

	close(r.ready)

	return nil
}

// SQLitePath returns the file path to create the SQLite database.
func (r *OnDisk) SQLitePath() string {
	return filepath.Join(r.path, dbDir, "db.sqlite")
}

func (r *OnDisk) deviceKeyFromFile() (crypto.PrivKey, error) {
	privFile := filepath.Join(r.path, privKeyFilePath)

	privBytes, err := os.ReadFile(privFile)
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("failed reading private key file: %w", err)
	}

	if privBytes == nil {
		return nil, nil
	}

	k, err := crypto.UnmarshalPrivateKey(privBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal private key: %w", err)
	}

	return k, nil
}

func (r *OnDisk) setupKeys(pk crypto.PrivKey) error {
	device, err := core.NewKeyPair(core.CodecDeviceKey, pk.(*crypto.Ed25519PrivateKey))
	if err != nil {
		return fmt.Errorf("failed to generate device: %w", err)
	}
	r.device = device

	pkBytes, err := crypto.MarshalPrivateKey(pk)
	if err != nil {
		return err
	}

	// TODO: clean this up, coz we may end up writing the same file twice here between multiple runs.
	if err := os.WriteFile(filepath.Join(r.path, privKeyFilePath), pkBytes, 0600); err != nil {
		return err
	}

	accKey, err := r.readAccountFile()
	if err == nil {
		if err := r.setAccount(accKey); err != nil {
			return err
		}
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("failed to read account file: %w", err)
	}

	return nil
}

func (r *OnDisk) writeAccountFile(k core.PublicKey) error {
	if codec := k.Codec(); codec != core.CodecAccountKey {
		return fmt.Errorf("invalid account codec: %d", codec)
	}

	data, err := k.MarshalBinary()
	if err != nil {
		return err
	}

	if err := os.WriteFile(filepath.Join(r.path, accountKeyFilePath), data, 0600); err != nil {
		return err
	}

	return nil
}

func (r *OnDisk) readAccountFile() (core.PublicKey, error) {
	data, err := os.ReadFile(filepath.Join(r.path, accountKeyFilePath))
	if err != nil {
		return core.PublicKey{}, err
	}

	pub, err := crypto.UnmarshalPublicKey(data)
	if err != nil {
		return core.PublicKey{}, err
	}

	return core.NewPublicKey(core.CodecAccountKey, pub.(*crypto.Ed25519PublicKey))
}

func migrateRepo(path string) error {
	// File profile.json can only be there if it's previously existing directory from the pre-whitepaper architecture.
	if _, err := os.ReadFile(filepath.Join(path, "profile.json")); err == nil {
		return fmt.Errorf("incompatible repo layout in %s: remove this directory or use a different one", path)
	}

	versionFile := filepath.Join(path, versionFilename)

	ver, err := os.ReadFile(versionFile)
	if err != nil {
		v := []byte(compatibilityVersion)
		if err := os.WriteFile(versionFile, v, 0600); err != nil {
			return fmt.Errorf("failed to create repo version file: %w", err)
		}

		ver = v
	}

	if !bytes.Equal(ver, []byte(compatibilityVersion)) {
		return fmt.Errorf("incompatible repo version: got = %s, want = %s; try a different directory for repo path", ver, compatibilityVersion)
	}

	return nil
}
