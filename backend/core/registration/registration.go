package registration

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"io/ioutil"
	"mintter/backend/core"
	"os"
	"path/filepath"
	"sync"

	"github.com/libp2p/go-libp2p-core/crypto"
)

// Registration errors.
var (
	ErrNeedsRegistration = errors.New("needs registration")
	ErrAlreadyRegistered = errors.New("already registered")
)

const privateKeyFileName = "libp2p_id_ed25519"

type repo interface {
	AccountForDevice(context.Context, core.DeviceID) (core.Account, error)
}

// Service implements the registration process.
type Service struct {
	device core.Device
	accs   core.AccountRepository

	// The mutex protects concurrent access to acc, and also allows to
	// make sure there's only one registration happenning at a time.
	mu  sync.Mutex
	acc core.Account
}

// NewServices creates a new registration service. The service belongs to a device,
// on which the Mintter application is running. Device keys are stored inside repoDir
// and will be loaded from there, or created from scratch and stored in there if missing.
func NewService(repoDir string, accs core.AccountRepository) (*Service, error) {
	if repoDir == "" {
		panic("must specify repoDir")
	}

	if accs == nil {
		panic("must specify account repository")
	}

	if !filepath.IsAbs(repoDir) {
		return nil, fmt.Errorf("repo dir must be absolute path, got: %s", repoDir)
	}

	device, err := loadOrCreateDevice(repoDir)
	if err != nil {
		return nil, err
	}

	return &Service{
		device: device,
		accs:   accs,
	}, nil
}

// RegisterAccount performs registration of the Account with the underlying Device.
func (s *Service) RegisterAccount(ctx context.Context, acc core.Account) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.loadAccountUnsafe(ctx)
	if err == nil {
		return ErrAlreadyRegistered
	}

	if err != ErrNeedsRegistration {
		return fmt.Errorf("internal failure when registering account: %w", err)
	}

	a, err := core.NewRegisteredAccountAggregate(acc, s.device)
	if err != nil {
		return err
	}

	if err := s.accs.StoreAccount(ctx, a); err != nil {
		return err
	}

	return nil
}

// DeviceID returns the ID of the underlying device.
func (s *Service) DeviceID() core.DeviceID {
	return s.device.ID
}

// AccountID returns the Account ID registered for the underlying device, if any.
func (s *Service) AccountID(ctx context.Context) (core.AccountID, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	acc, err := s.loadAccountUnsafe(ctx)
	if err != nil {
		return core.AccountID{}, err
	}

	return acc.ID, nil
}

// loadAccountUnsafe must only be called while holding the lock.
func (s *Service) loadAccountUnsafe(ctx context.Context) (core.Account, error) {
	if !s.acc.ID.IsZero() {
		return s.acc, nil
	}

	// We cache account ID here to avoid calling the database all the time.
	acc, err := s.accs.LoadAccountForDevice(ctx, s.device.ID)
	if err == nil {
		s.acc = acc.Account()
		return s.acc, nil
	}

	if errors.Is(err, core.ErrNotFound) {
		return core.Account{}, ErrNeedsRegistration
	}

	return core.Account{}, fmt.Errorf("failed to load account for device %s: %w", s.device.ID, err)
}

func loadOrCreateDevice(dir string) (core.Device, error) {
	dkfile := filepath.Join(dir, privateKeyFileName)

	data, err := ioutil.ReadFile(dkfile)
	if err != nil && !os.IsNotExist(err) {
		return core.Device{}, fmt.Errorf("failed to read private key from file %s: %v", dkfile, err)
	}

	// Note: only ed25519 device keys are supported now. They are short
	// and simple and so far we don't have a need for other types of keys.

	if data != nil {
		dk, err := crypto.UnmarshalEd25519PrivateKey(data)
		if err != nil {
			return core.Device{}, fmt.Errorf("failed to unmarshal ed25519 private key: %w", err)
		}

		return core.NewDevice(dk)
	}

	dk, _, err := crypto.GenerateEd25519Key(rand.Reader)
	if err != nil {
		return core.Device{}, fmt.Errorf("failed to generate new device key: %w", err)
	}

	data, err = crypto.MarshalPrivateKey(dk)
	if err != nil {
		return core.Device{}, fmt.Errorf("failed to marshal private key: %w", err)
	}

	if err := ioutil.WriteFile(dkfile, data, 0600); err != nil {
		return core.Device{}, fmt.Errorf("failed to write device key file %s: %w", dkfile, err)
	}

	return core.NewDevice(dk)
}
