package backend

import (
	"bytes"
	"crypto/rand"
	"errors"
	"fmt"
	"io/ioutil"
	"mintter/backend/ipfsutil"
	"os"
	"path/filepath"
	"sync"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/multiformats/go-multihash"
	"go.uber.org/zap"
)

const (
	currentRepoLayoutVersion = "v1"

	keysDir = "keys"

	privKeyFilename = "libp2p_id_ed25519"
	accountFilename = "mintter_id_ed25519.pub"
)

var errRepoMigrate = errors.New("repo migration failed")

type repo struct {
	path   string
	device Device

	mu    sync.Mutex
	acc   PublicAccount
	ready chan struct{}
}

func newRepo(path string, log *zap.Logger) (r *repo, err error) {
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
	if err := os.MkdirAll(path, 0700); err != nil {
		return nil, fmt.Errorf("store: failed to initialize local repo in %s: %w", path, err)
	}

	if err := os.MkdirAll(filepath.Join(path, keysDir), 0700); err != nil {
		return nil, fmt.Errorf("store: failed to initialize local repo in %s: %w", path, err)
	}

	if err := migrateRepo(path); err != nil {
		return nil, fmt.Errorf("%w: %v", errRepoMigrate, err)
	}

	r = &repo{
		path:  path,
		ready: make(chan struct{}),
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

func (r *repo) CommitAccount(k crypto.PubKey) error {
	if _, err := r.readAccountFile(); err == nil {
		return fmt.Errorf("account is already committed")
	}

	if err := r.setAccount(k); err != nil {
		return err
	}

	return r.writeAccountFile(k)
}

func (r *repo) setAccount(k crypto.PubKey) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	keyBytes, err := crypto.MarshalPublicKey(k)
	if err != nil {
		return fmt.Errorf("failed to marshal public key: %w", err)
	}

	aid, err := ipfsutil.NewCID(cid.Libp2pKey, multihash.IDENTITY, keyBytes)
	if err != nil {
		return fmt.Errorf("failed to create account id from public key: %w", err)
	}

	r.acc = PublicAccount{
		id:  AccountID(aid),
		pub: k,
	}

	close(r.ready)

	return nil
}

func (r *repo) deviceKeyFromFile() (crypto.PrivKey, error) {
	privFile := filepath.Join(r.path, keysDir, privKeyFilename)

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
	if err := ioutil.WriteFile(filepath.Join(r.path, keysDir, privKeyFilename), pkBytes, 0600); err != nil {
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

	if err := ioutil.WriteFile(filepath.Join(r.path, keysDir, accountFilename), data, 0644); err != nil {
		return err
	}

	return nil
}

func (r *repo) readAccountFile() (crypto.PubKey, error) {
	data, err := ioutil.ReadFile(filepath.Join(r.path, keysDir, accountFilename))
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

	versionFile := filepath.Join(path, "VERSION")

	ver, err := ioutil.ReadFile(versionFile)
	if err != nil {
		v := []byte(currentRepoLayoutVersion)
		if err := ioutil.WriteFile(versionFile, v, 0644); err != nil {
			return fmt.Errorf("failed to create repo version file: %w", err)
		}

		ver = v
	}

	if !bytes.Equal(ver, []byte(currentRepoLayoutVersion)) {
		return fmt.Errorf("unsupported repo layout version: got = %s, want = %s", ver, currentRepoLayoutVersion)
	}

	return nil
}
