// Package ipldutil provides utility functions for dealing with IPLD objects.
package ipldutil

import (
	"errors"
	"fmt"

	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/multiformats/go-multihash"
)

const nopHashCode = 0x01

type signedNode struct {
	Data      []byte
	Signature []byte
}

func (s signedNode) verify(k crypto.PubKey) error {
	ok, err := k.Verify(s.Data, s.Signature)
	if err != nil {
		return fmt.Errorf("failed to verify IPLD node signature: %w", err)
	}

	if !ok {
		return errors.New("IPLD node signature verification failed")
	}

	return nil
}

func init() {
	if _, ok := multihash.Codes[nopHashCode]; ok {
		panic("nop hash code already exist")
	}

	multihash.Codes[nopHashCode] = "nop-hash"
	multihash.DefaultLengths[nopHashCode] = -1

	if err := multihash.RegisterHashFunc(nopHashCode, func(data []byte, length int) ([]byte, error) {
		return nil, nil
	}); err != nil {
		panic(err)
	}

	cbornode.RegisterCborType(signedNode{})
}

// MarshalSigned converts v into CBOR IPLD node, signs the resulting bytes and
// produces another IPLD node containing both data and signature.
func MarshalSigned(v interface{}, k crypto.PrivKey) (*cbornode.Node, error) {
	// TODO(burdiyan): for now all IPLD tools would not treat this IPLD document correctly,
	// because the data is encoded as bytes and not as map. Think about improving this eventually.

	n, err := cbornode.WrapObject(v, nopHashCode, -1)
	if err != nil {
		return nil, fmt.Errorf("failed to make IPLD from the underlying object: %w", err)
	}

	sign, err := k.Sign(n.RawData())
	if err != nil {
		return nil, fmt.Errorf("failed to sign object: %w", err)
	}

	return cbornode.WrapObject(signedNode{
		Data:      n.RawData(),
		Signature: sign,
	}, multihash.SHA2_256, -1)
}

// UnmarshalSigned IPLD CBOR document into v.
func UnmarshalSigned(data []byte, v interface{}, k crypto.PubKey) error {
	var in signedNode

	if err := cbornode.DecodeInto(data, &in); err != nil {
		return err
	}

	if k != nil {
		if err := in.verify(k); err != nil {
			return err
		}
	}

	return cbornode.DecodeInto(in.Data, v)
}
