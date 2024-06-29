package core

import (
	"encoding/binary"
	"fmt"
	"unsafe"

	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/multiformats/go-multibase"
	"github.com/multiformats/go-multicodec"
)

// Principal is the byte representation of a public key.
// We don't use libp2p encoding for keys, because it's very tied to libp2p,
// as it uses bespoke protobuf encoding and limited number of key types.
//
// Later, some new approaches emerged in the community for encoding public keys,
// with additional multicodecs defined in the common table[codecs] for different key types.
//
// So we define principal here similar to how DID Key type is defined[did-key], but binary
// instead of being a multibase string.
//
// Basically this is a binary string of `<multicodec-key-type-varint><raw-public-key-bytes>`.
//
// [did-key]: https://w3c-ccg.github.io/did-method-key/#format
type Principal []byte

// PeerID returns the Libp2p PeerID representation of a key.
func (p Principal) PeerID() (peer.ID, error) {
	pk, err := p.Libp2pKey()
	if err != nil {
		return "", err
	}

	pid, err := peer.IDFromPublicKey(pk)
	if err != nil {
		return "", fmt.Errorf("failed to convert principal to peer ID: %w", err)
	}
	return pid, nil
}

// KeyType returns the multicodec from the byte prefix of the binary representation.
// It doesn't check if it's a valid key type.
func (p Principal) KeyType() multicodec.Code {
	code, _ := binary.Uvarint(p)
	return multicodec.Code(code)
}

// Explode splits the principal into it's multicodec and raw key bytes.
func (p Principal) Explode() (multicodec.Code, []byte) {
	code, n := binary.Uvarint(p)
	return multicodec.Code(code), p[n:]
}

// String encodes Principal as a string, using base58btc encoding as defined in DID Key spec.
func (p Principal) String() string {
	if len(p) == 0 {
		return ""
	}

	s, err := multibase.Encode(multibase.Base58BTC, p)
	if err != nil {
		panic(err)
	}
	return s
}

// UnsafeString casts raw bytes to a without copying.
// Useful for using as map key.
func (p Principal) UnsafeString() string {
	return unsafe.String(&p[0], len(p))
}

// Equal checks if two principals are equal.
func (p Principal) Equal(pp Principal) bool {
	return p.UnsafeString() == pp.UnsafeString()
}

// Verify implements Verifier.
func (p Principal) Verify(data []byte, sig Signature) error {
	code, key := p.Explode()
	if code != multicodec.Ed25519Pub {
		panic("BUG: unsupported key type")
	}

	pk, err := crypto.UnmarshalEd25519PublicKey(key)
	if err != nil {
		return err
	}

	return sig.verify(pk, data)
}

// Libp2pKey converts principal into a Libp2p public key.
func (p Principal) Libp2pKey() (crypto.PubKey, error) {
	codec, n := binary.Uvarint(p)

	switch multicodec.Code(codec) {
	case multicodec.Ed25519Pub:
		return crypto.UnmarshalEd25519PublicKey(p[n:])
	case multicodec.Secp256k1Pub:
		return crypto.UnmarshalSecp256k1PublicKey(p[n:])
	default:
		return nil, fmt.Errorf("unsupported principal key type prefix %x", codec)
	}
}

// DID converts principal into a DID Key representation.
func (p Principal) DID() string {
	return "did:key:" + p.String()
}

var pubKeyCodecs = map[int]multicodec.Code{
	crypto.Ed25519:   multicodec.Ed25519Pub,
	crypto.Secp256k1: multicodec.Secp256k1Pub,
}

var pubKeyCodecBytes = map[multicodec.Code][]byte{
	multicodec.Ed25519Pub:   binary.AppendUvarint(nil, uint64(multicodec.Ed25519Pub)),
	multicodec.Secp256k1Pub: binary.AppendUvarint(nil, uint64(multicodec.Secp256k1Pub)),
}

// PrincipalFromPubKey converts a Libp2p public key into Principal.
func PrincipalFromPubKey(k crypto.PubKey) Principal {
	codec, ok := pubKeyCodecs[int(k.Type())]
	if !ok {
		panic("BUG: invalid principal key type")
	}

	raw, err := k.Raw()
	if err != nil {
		panic(err)
	}

	prefix, ok := pubKeyCodecBytes[codec]
	if !ok {
		panic("BUG: no prefix for codec " + codec.String())
	}

	out := make([]byte, 0, len(raw)+len(prefix))
	out = append(out, prefix...)
	out = append(out, raw...)

	return Principal(out)
}

// DecodePrincipal decodes the principal from its string representation.
func DecodePrincipal[T string | []byte](s T) (Principal, error) {
	var sb []byte

	switch s := any(s).(type) {
	case string:
		if s == "" {
			return nil, fmt.Errorf("must specify principal to decode")
		}

		enc, data, err := multibase.Decode(s)
		if err != nil {
			return nil, err
		}

		if enc != multibase.Base58BTC {
			return nil, fmt.Errorf("unsupported principal multibase: %s", multicodec.Code(enc).String())
		}
		sb = data
	case []byte:
		sb = s
	}

	codec, n := binary.Uvarint(sb)
	key := sb[n:]

	if multicodec.Code(codec) != multicodec.Ed25519Pub {
		return nil, fmt.Errorf("invalid principal key type")
	}

	// TODO(burdiyan): should we validate the key bytes here?
	_ = key

	return Principal(sb), nil
}
