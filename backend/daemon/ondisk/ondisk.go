// Package ondisk manages database.
package ondisk

import (
	"crypto/rand"
	"errors"
	"fmt"
	"mintter/backend/core"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"github.com/libp2p/go-libp2p/core/crypto"
	"go.uber.org/zap"
)

const (
	// This is changed when breaking changes are made. Eventually we'd want
	// to support some migration mechanisms to help with backward-compatibility.
	compatibilityVersion = "2023-06-05.01"

	keysDir = "keys"
	dbDir   = "db"

	devicePrivateKeyPath = keysDir + "/libp2p_id_ed25519"
	accountKeyPath       = keysDir + "/mintter_id_ed25519.pub"

	versionFilename = "VERSION"
)

// Migration of the on-disk repository layout.
type Migration struct {
	Version string
	Run     func() error
}

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
// Migrations must be sorted, otherwise the behavior is undefined,
// and may lead to corrupted data.
func NewOnDisk(path string, log *zap.Logger, migrations []Migration) (r *OnDisk, err error) {
	r, err = prepareRepo(path, log, migrations)
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
func NewOnDiskWithDeviceKey(path string, log *zap.Logger, key crypto.PrivKey, migrations []Migration) (r *OnDisk, err error) {
	r, err = prepareRepo(path, log, migrations)
	if err != nil {
		return nil, err
	}

	if err := r.setupKeys(key); err != nil {
		return nil, fmt.Errorf("failed to setup keys: %w", err)
	}

	return r, nil
}

func prepareRepo(path string, log *zap.Logger, migrations []Migration) (r *OnDisk, err error) {
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

	if err := migrateRepo(path, migrations); err != nil {
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

	r.log.Debug("AccountInitialized", zap.String("accountID", r.acc.String()))

	close(r.ready)

	return nil
}

// SQLitePath returns the file path to create the SQLite database.
func (r *OnDisk) SQLitePath() string {
	return filepath.Join(r.path, dbDir, "db.sqlite")
}

func (r *OnDisk) deviceKeyFromFile() (crypto.PrivKey, error) {
	privFile := filepath.Join(r.path, devicePrivateKeyPath)

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
	if err := os.WriteFile(filepath.Join(r.path, devicePrivateKeyPath), pkBytes, 0600); err != nil {
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

	if err := os.WriteFile(filepath.Join(r.path, accountKeyPath), data, 0600); err != nil {
		return err
	}

	return nil
}

func (r *OnDisk) readAccountFile() (core.PublicKey, error) {
	data, err := os.ReadFile(filepath.Join(r.path, accountKeyPath))
	if err != nil {
		return core.PublicKey{}, err
	}

	pub, err := crypto.UnmarshalPublicKey(data)
	if err != nil {
		return core.PublicKey{}, err
	}

	return core.NewPublicKey(core.CodecAccountKey, pub.(*crypto.Ed25519PublicKey))
}

func migrateRepo(path string, migrations []Migration) error {
	// File profile.json can only be there if it's previously existing directory from the pre-whitepaper architecture.
	if _, err := os.ReadFile(filepath.Join(path, "profile.json")); err == nil {
		return fmt.Errorf("incompatible repo layout in %s: remove this directory or use a different one", path)
	}

	versionFile := filepath.Join(path, versionFilename)

	var gotVersion string
	{
		ver, err := os.ReadFile(versionFile)
		if err != nil {
			v := []byte(compatibilityVersion)
			if err := os.WriteFile(versionFile, v, 0600); err != nil {
				return fmt.Errorf("failed to create repo version file: %w", err)
			}

			ver = v
		}

		gotVersion = string(ver)
	}

	if gotVersion == compatibilityVersion {
		return nil
	}

	if gotVersion > compatibilityVersion {
		return fmt.Errorf("software is too old: data directory was created with version %s, but we only understand up to %s", gotVersion, compatibilityVersion)
	}

	i := sort.Search(len(migrations), func(idx int) bool {
		return migrations[idx].Version == gotVersion
	})
	if i == len(migrations) {
		return fmt.Errorf("incompatible software: no migration from version %s to %s", gotVersion, compatibilityVersion)
	}

	for _, mig := range migrations[i+1:] {
		if err := mig.Run(); err != nil {
			return fmt.Errorf("repo migration %s failed: %w", mig.Version, err)
		}
		if err := os.WriteFile(versionFile, []byte(mig.Version), 0600); err != nil {
			return fmt.Errorf("failed to write version file with %s: %w", mig.Version, err)
		}
	}

	// Retry the same migration process to make sure we actually got to the version we want.
	return migrateRepo(path, migrations)
}
