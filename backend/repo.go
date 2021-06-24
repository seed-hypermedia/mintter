package backend

import (
	"bytes"
	"crypto/rand"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/libp2p/go-libp2p-core/crypto"
	"go.uber.org/zap"
)

/*
Repo layout v1 file tree:

- VERSION => v1
- keys/
-- libp2p_id_ed25519 => device private key
-- mintter_id_ed25519.pub => account public key
- db/
-- badger-v3/ => directory with badger-related data
-- providing.db => BoltDB database for DHT provider
- drafts/ => directory with drafts
*/

const (
	currentRepoLayoutVersion = "dev-4" // TODO: when layout is stable set a correct version here.

	keysDir   = "keys"
	dbDir     = "db"
	draftsDir = "drafts"

	badgerDirPath = dbDir + "/badger-v3"

	providingDBPath    = dbDir + "/providing.db"
	privKeyFilePath    = keysDir + "/libp2p_id_ed25519"
	accountKeyFilePath = keysDir + "/mintter_id_ed25519.pub"

	versionFilename = "VERSION"
)

var errRepoMigrate = errors.New("repo migration failed")

type repo struct {
	path   string
	device Device

	mu    sync.Mutex
	acc   PublicAccount
	ready chan struct{}
	log   *zap.Logger
}

func newRepo(path string, log *zap.Logger) (r *repo, err error) {
	if strings.HasPrefix(path, "~") {
		homedir, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to detect home directory: %w", err)
		}
		path = strings.Replace(path, "~", homedir, 1)
	}

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

func newRepoWithDeviceKey(path string, log *zap.Logger, key crypto.PrivKey) (r *repo, err error) {
	r, err = prepareRepo(path, log)
	if err != nil {
		return nil, err
	}

	if err := r.setupKeys(key); err != nil {
		return nil, fmt.Errorf("failed to setup keys: %w", err)
	}

	return r, nil
}

func prepareRepo(path string, log *zap.Logger) (r *repo, err error) {
	dirs := [...]string{
		path,
		filepath.Join(path, keysDir),
		filepath.Join(path, dbDir),
		filepath.Join(path, badgerDirPath),
		filepath.Join(path, draftsDir),
	}

	for _, d := range dirs {
		if err := os.MkdirAll(d, 0700); err != nil {
			return nil, fmt.Errorf("failed to create dir %s: %w", d, err)
		}
	}

	if err := migrateRepo(path); err != nil {
		return nil, fmt.Errorf("%w: %v", errRepoMigrate, err)
	}

	r = &repo{
		path:  path,
		ready: make(chan struct{}),
		log:   log,
	}

	return r, nil
}

func (r *repo) privKey() crypto.PrivKey {
	return r.device.priv
}

func (r *repo) Device() Device {
	return r.device
}

func (r *repo) Account() (PublicAccount, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.acc.id.IsZero() {
		return PublicAccount{}, fmt.Errorf("account is not initialized")
	}

	return r.acc, nil
}

func (r *repo) Ready() <-chan struct{} {
	return r.ready
}

func (r *repo) CommitAccount(acc Account) error {
	if _, err := r.readAccountFile(); err == nil {
		return fmt.Errorf("account is already committed")
	}

	if err := r.setAccount(acc.pub); err != nil {
		return err
	}

	return r.writeAccountFile(acc.pub)
}

func (r *repo) setAccount(k crypto.PubKey) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	pacc, err := NewPublicAccount(k)
	if err != nil {
		return fmt.Errorf("failed to create public account: %w", err)
	}

	r.acc = pacc

	r.log.Debug("AccountInitialized", zap.String("accountID", r.acc.id.String()))

	close(r.ready)

	return nil
}

func (r *repo) badgerDir() string {
	return filepath.Join(r.path, badgerDirPath)
}

func (r *repo) providingDBPath() string {
	return filepath.Join(r.path, providingDBPath)
}

func (r *repo) draftsDir() string {
	return filepath.Join(r.path, draftsDir)
}

func (r *repo) deviceKeyFromFile() (crypto.PrivKey, error) {
	privFile := filepath.Join(r.path, privKeyFilePath)

	privBytes, err := ioutil.ReadFile(privFile)
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

func (r *repo) setupKeys(pk crypto.PrivKey) error {
	device, err := NewDevice(pk)
	if err != nil {
		return fmt.Errorf("failed to generate device: %w", err)
	}
	r.device = device

	pkBytes, err := crypto.MarshalPrivateKey(pk)
	if err != nil {
		return err
	}

	// TODO: clean this up, coz we may end up writing the same file twice here between multiple runs.
	if err := ioutil.WriteFile(filepath.Join(r.path, privKeyFilePath), pkBytes, 0600); err != nil {
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

func (r *repo) writeAccountFile(k crypto.PubKey) error {
	if k.Type() != crypto.Ed25519 {
		return fmt.Errorf("only Ed25519 keys are supported, got %s", k.Type().String())
	}

	data, err := crypto.MarshalPublicKey(k)
	if err != nil {
		return err
	}

	if err := ioutil.WriteFile(filepath.Join(r.path, accountKeyFilePath), data, 0644); err != nil {
		return err
	}

	return nil
}

func (r *repo) readAccountFile() (crypto.PubKey, error) {
	data, err := ioutil.ReadFile(filepath.Join(r.path, accountKeyFilePath))
	if err != nil {
		return nil, err
	}

	return crypto.UnmarshalPublicKey(data)
}

func migrateRepo(path string) error {
	// File profile.json can only be there if it's previously existing directory from the pre-whitepaper architecture.
	if _, err := ioutil.ReadFile(filepath.Join(path, "profile.json")); err == nil {
		return fmt.Errorf("incompatible repo layout in %s: remove this directory or use a different one", path)
	}

	versionFile := filepath.Join(path, versionFilename)

	ver, err := ioutil.ReadFile(versionFile)
	if err != nil {
		v := []byte(currentRepoLayoutVersion)
		if err := ioutil.WriteFile(versionFile, v, 0644); err != nil {
			return fmt.Errorf("failed to create repo version file: %w", err)
		}

		ver = v
	}

	if !bytes.Equal(ver, []byte(currentRepoLayoutVersion)) {
		return fmt.Errorf("incompatible repo version: got = %s, want = %s; try a different directory for repo path", ver, currentRepoLayoutVersion)
	}

	return nil
}
