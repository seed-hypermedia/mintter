// Package slip10 implements SLIP-0010 spec: https://github.com/satoshilabs/slips/blob/master/slip-0010.md.
// Currently only works with ed25519 keys.
package slip10

import (
	"bytes"
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/binary"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// FirstHardenedIndex is the index of the first hardened key (2^31) as per BIP-32.
const FirstHardenedIndex = uint32(0x80000000)

var pathRegex = regexp.MustCompile("^m(/[0-9]+')*$")

// Node is a BIP-44 key derivation node.
type Node struct {
	seed      []byte
	chainCode []byte
}

// DeriveForPath derives key for a path in BIP-44 format and a seed.
// Ed25119 derivation operated on hardened keys only.
func DeriveForPath(path string, seed []byte) (Node, error) {
	if !isValidPath(path) {
		return Node{}, fmt.Errorf("invalid derivation path")
	}

	key, err := newMasterNode(seed)
	if err != nil {
		return Node{}, err
	}

	segments := strings.Split(path, "/")
	for _, segment := range segments[1:] {
		i64, err := strconv.ParseUint(strings.TrimRight(segment, "'"), 10, 32)
		if err != nil {
			return Node{}, err
		}

		// we operate on hardened keys
		i := uint32(i64) + FirstHardenedIndex
		key, err = key.Derive(i)
		if err != nil {
			return Node{}, err
		}
	}

	return key, nil
}

// Derive child node from the parent node.
func (k *Node) Derive(i uint32) (Node, error) {
	// no public derivation for ed25519
	if i < FirstHardenedIndex {
		return Node{}, fmt.Errorf("no public derivation for ed25519")
	}

	iBytes := make([]byte, 4)
	binary.BigEndian.PutUint32(iBytes, i)
	key := append([]byte{0x0}, k.seed...)
	data := append(key, iBytes...)

	hash := hmac.New(sha512.New, k.chainCode)
	_, err := hash.Write(data)
	if err != nil {
		return Node{}, err
	}
	sum := hash.Sum(nil)
	newKey := Node{
		seed:      sum[:32],
		chainCode: sum[32:],
	}
	return newKey, nil
}

// Seed bytes of the underlying node.
func (k *Node) Seed() []byte {
	return k.seed
}

func (k *Node) keypair() (ed25519.PublicKey, ed25519.PrivateKey) {
	reader := bytes.NewReader(k.seed)
	pub, priv, err := ed25519.GenerateKey(reader)
	if err != nil {
		// can't happens because we check the seed on NewMasterNode/DeriveForPath
		panic(err)
	}

	return pub[:], priv[:]
}

func (k *Node) privateKey() []byte {
	_, priv := k.keypair()
	return priv.Seed()
}

// publicKeyWithPrefix returns public key with 0x00 prefix, as specified in the slip-10
// https://github.com/satoshilabs/slips/blob/master/slip-0010/testvectors.py#L64
func (k *Node) publicKeyWithPrefix() []byte {
	pub, _ := k.keypair()
	return append([]byte{0x00}, pub...)
}

// newMasterNode generates a new master key from seed.
func newMasterNode(seed []byte) (Node, error) {
	// As in https://github.com/satoshilabs/slips/blob/master/slip-0010.md
	const seedModifier = "ed25519 seed"

	hash := hmac.New(sha512.New, []byte(seedModifier))
	_, err := hash.Write(seed)
	if err != nil {
		return Node{}, err
	}
	sum := hash.Sum(nil)
	key := Node{
		seed:      sum[:32],
		chainCode: sum[32:],
	}
	return key, nil
}

// isValidPath check whether or not the path has valid segments.
func isValidPath(path string) bool {
	if !pathRegex.MatchString(path) {
		return false
	}

	// check for overflows
	segments := strings.Split(path, "/")
	for _, segment := range segments[1:] {
		_, err := strconv.ParseUint(strings.TrimRight(segment, "'"), 10, 32)
		if err != nil {
			return false
		}
	}

	return true
}
