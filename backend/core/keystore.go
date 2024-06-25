package core

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"

	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/zalando/go-keyring"
)

// KeyStore is an interface for managing signing keys.
type KeyStore interface {
	GetKey(ctx context.Context, name string) (KeyPair, error)
	StoreKey(ctx context.Context, name string, kp KeyPair) error
	ListKeys(ctx context.Context) ([]NamedKey, error)
	DeleteKey(ctx context.Context, name string) error
	DeleteAllKeys(ctx context.Context) error
	ChangeKeyName(ctx context.Context, currentName, newName string) error
}

// NamedKey is a record for the stored private key with a name.
type NamedKey struct {
	Name      string
	PublicKey Principal
}

type osKeyStore struct {
	serviceName string
}

type keyCollection map[string][]byte

const (
	collectionName = "parentCollection"
)

var (
	errEmptyEnvironment = errors.New("no keys in this environment yet")
	errKeyNotFound      = errors.New("named key not found")
	nameFormat          = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
)

// NewOSKeyStore creates a new key store backed by the operating system keyring.
func NewOSKeyStore(environment string) KeyStore {
	if environment == "" {
		panic("BUG: must specify the environment for the OS key store")
	}

	// Suffixing the service name with the environment here
	// to avoid mixing up keys from apps running in different environments.

	return &osKeyStore{
		serviceName: "seed-daemon-" + environment,
	}
}

func (ks *osKeyStore) GetKey(ctx context.Context, name string) (kp KeyPair, err error) {
	secret, err := keyring.Get(ks.serviceName, collectionName)
	if err != nil {
		return kp, err
	}

	collection := keyCollection{}
	if err := json.Unmarshal([]byte(secret), &collection); err != nil {
		return kp, err
	}

	privBytes, ok := collection[name]
	if !ok {
		return kp, errKeyNotFound
	}

	priv, err := crypto.UnmarshalPrivateKey(privBytes)
	if err != nil {
		return kp, err
	}

	pub, err := NewPublicKey(priv.GetPublic())
	if err != nil {
		return kp, err
	}

	return KeyPair{
		k:         priv,
		PublicKey: pub,
	}, nil
}

func (ks *osKeyStore) StoreKey(ctx context.Context, name string, kp KeyPair) error {
	if !nameFormat.MatchString(name) {
		return fmt.Errorf("Invalid name format")
	}

	if kp.k == nil {
		return fmt.Errorf("invalid key format")
	}

	collection := keyCollection{}
	secret, err := keyring.Get(ks.serviceName, collectionName)
	if err == nil {
		if err := json.Unmarshal([]byte(secret), &collection); err != nil {
			return err
		}
		_, ok := collection[name]
		if ok {
			return fmt.Errorf("Name already exists. Please delete it first")
		}
	}

	keyBytes, err := crypto.MarshalPrivateKey(kp.k)
	if err != nil {
		return err
	}
	collection[name] = keyBytes

	b, err := json.Marshal(collection)
	if err != nil {
		return err
	}

	return keyring.Set(ks.serviceName, collectionName, string(b))
}

func (ks *osKeyStore) ListKeys(ctx context.Context) ([]NamedKey, error) {
	// The go-keyring library doesn't let you list the keys given a service name,
	// it only lets you get a key by account name.
	// In theory the underlying tools the library uses let you list keys, but it's not exposed,
	// and maybe it's not very portable across different operating systems.
	// Our best bet would probably be storing the entire bundle of keys under a single credential name,
	// as JSON or Protobuf.
	// The problem here though is that there can be some size limit to that. Apparently it's at least 2KB on most systems,
	// so it shouldn't be a practical issue, unless you store dozens and dozens of keys.
	// Another issues is that if your OS keychain is synced across multiple devices (like iCloud Keychain for macOS and iOS),
	// you might end up overwriting the keys if they are not synced up to date.
	var ret []NamedKey

	secret, err := keyring.Get(ks.serviceName, collectionName)
	if err != nil {
		return ret, nil
	}

	collection := keyCollection{}
	if err := json.Unmarshal([]byte(secret), &collection); err != nil {
		return ret, err
	}

	for name, privBytes := range collection {
		priv, err := crypto.UnmarshalPrivateKey(privBytes)
		if err != nil {
			return ret, err
		}
		pub, err := NewPublicKey(priv.GetPublic())
		if err != nil {
			return ret, err
		}
		ret = append(ret, NamedKey{
			Name:      name,
			PublicKey: pub.Principal(),
		})
	}
	return ret, nil
}

func (ks *osKeyStore) DeleteAllKeys(ctx context.Context) error {
	if err := keyring.Delete(ks.serviceName, collectionName); err != nil {
		return errEmptyEnvironment
	}
	return nil
}

func (ks *osKeyStore) DeleteKey(ctx context.Context, name string) error {
	secret, err := keyring.Get(ks.serviceName, collectionName)
	if err != nil {
		return errEmptyEnvironment
	}

	collection := keyCollection{}
	if err := json.Unmarshal([]byte(secret), &collection); err != nil {
		return err
	}

	_, ok := collection[name]
	if !ok {
		return errKeyNotFound
	}
	delete(collection, name)
	b, err := json.Marshal(collection)
	if err != nil {
		return err
	}
	return keyring.Set(ks.serviceName, collectionName, string(b))
}

func (ks *osKeyStore) ChangeKeyName(ctx context.Context, currentName, newName string) error {
	if currentName == newName {
		return fmt.Errorf("New name equals current name. Nothing to change")
	}

	if !nameFormat.MatchString(newName) {
		return fmt.Errorf("Invalid new name format")
	}

	secret, err := keyring.Get(ks.serviceName, collectionName)
	if err != nil {
		return errEmptyEnvironment
	}

	collection := keyCollection{}
	if err := json.Unmarshal([]byte(secret), &collection); err != nil {
		return err
	}

	privBytes, ok := collection[currentName]
	if !ok {
		return errKeyNotFound
	}

	delete(collection, currentName)

	collection[newName] = privBytes
	b, err := json.Marshal(collection)
	if err != nil {
		return err
	}

	return keyring.Set(ks.serviceName, collectionName, string(b))
}

type memoryKeyStore struct {
	keys map[string]KeyPair
}

// NewMemoryKeyStore creates an in-memory key store implementation.
func NewMemoryKeyStore() KeyStore {
	return &memoryKeyStore{
		keys: make(map[string]KeyPair),
	}
}

func (mks *memoryKeyStore) GetKey(ctx context.Context, name string) (kp KeyPair, err error) {
	if key, exists := mks.keys[name]; exists {
		return key, nil
	}
	return kp, errKeyNotFound
}

func (mks *memoryKeyStore) StoreKey(ctx context.Context, name string, kp KeyPair) error {
	mks.keys[name] = kp
	return nil
}

func (mks *memoryKeyStore) ListKeys(ctx context.Context) ([]NamedKey, error) {
	var namedKeys []NamedKey
	for name, key := range mks.keys {
		namedKeys = append(namedKeys, NamedKey{Name: name, PublicKey: key.Principal()})
	}
	return namedKeys, nil
}

func (mks *memoryKeyStore) DeleteKey(ctx context.Context, name string) error {
	delete(mks.keys, name)
	return nil
}

func (mks *memoryKeyStore) DeleteAllKeys(ctx context.Context) error {
	mks.keys = map[string]KeyPair{}
	return nil
}

func (mks *memoryKeyStore) ChangeKeyName(ctx context.Context, currentName, newName string) error {
	if key, exists := mks.keys[currentName]; exists {
		mks.keys[newName] = key
		delete(mks.keys, currentName)
	}
	return nil
}
