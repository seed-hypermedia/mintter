package identity

import (
	"bytes"
	"encoding/json"

	crypto "github.com/libp2p/go-libp2p-core/crypto"
)

var jsonNull = []byte{'n', 'u', 'l', 'l'}

// PubKey wraps crypto.PubKey to enable JSON encoding.
type PubKey struct {
	crypto.PubKey
}

// MarshalBinary implements binary.Marshaler.
func (pk PubKey) MarshalBinary() ([]byte, error) {
	return crypto.MarshalPublicKey(pk)
}

// UnmarshalBinary implements binary.Unmarshaler.
func (pk *PubKey) UnmarshalBinary(data []byte) error {
	k, err := crypto.UnmarshalPublicKey(data)
	if err != nil {
		return err
	}

	pk.PubKey = k

	return nil
}

// MarshalJSON implements json.Marshaler.
func (pk PubKey) MarshalJSON() ([]byte, error) {
	if pk.PubKey == nil {
		return jsonNull, nil
	}

	raw, err := crypto.MarshalPublicKey(pk)
	if err != nil {
		return nil, err
	}

	return json.Marshal(raw)
}

// UnmarshalJSON implements json.Unmarshaler.
func (pk *PubKey) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, jsonNull) {
		return nil
	}

	var in []byte
	if err := json.Unmarshal(data, &in); err != nil {
		return err
	}

	k, err := crypto.UnmarshalPublicKey(in)
	if err != nil {
		return err
	}

	pk.PubKey = k

	return nil
}

// PrivKey wraps crypto.PrivKey to enable JSON encoding.
type PrivKey struct {
	crypto.PrivKey
}

// MarshalBinary implements binary.Marshaler.
func (pk PrivKey) MarshalBinary() ([]byte, error) {
	return crypto.MarshalPrivateKey(pk)
}

// UnmarshalBinary implements binary.Unmarshaler.
func (pk *PrivKey) UnmarshalBinary(data []byte) error {
	k, err := crypto.UnmarshalPrivateKey(data)
	if err != nil {
		return err
	}

	pk.PrivKey = k

	return nil
}

// MarshalJSON implements json.Marshaler.
func (pk PrivKey) MarshalJSON() ([]byte, error) {
	if pk.PrivKey == nil {
		return jsonNull, nil
	}

	raw, err := crypto.MarshalPrivateKey(pk)
	if err != nil {
		return nil, err
	}

	return json.Marshal(raw)
}

// UnmarshalJSON implements json.Unmarshaler.
func (pk *PrivKey) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, jsonNull) {
		return nil
	}

	var in []byte
	if err := json.Unmarshal(data, &in); err != nil {
		return err
	}

	k, err := crypto.UnmarshalPrivateKey(in)
	if err != nil {
		return err
	}

	pk.PrivKey = k

	return nil
}
