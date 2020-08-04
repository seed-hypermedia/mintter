// Package ipldutil provides utility functions for dealing with IPLD objects.
package ipldutil

import (
	"errors"
	"fmt"

	"github.com/fxamacker/cbor/v2"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-merkledag"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/multiformats/go-multihash"

	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

func init() {
	format.Register(cid.DagProtobuf, merkledag.DecodeProtobufBlock)
	format.Register(cid.Raw, merkledag.DecodeRawBlock)
	format.Register(cid.DagCBOR, cbornode.DecodeBlock)
}

// MarshalSigned converts v into CBOR IPLD node, signs the resulting bytes and
// produces another IPLD node containing both data and signature.
func MarshalSigned(v interface{}, k crypto.PrivKey) (*cbornode.Node, error) {
	data, err := cbornode.DumpObject(v)
	if err != nil {
		return nil, err
	}

	sign, err := k.Sign(data)
	if err != nil {
		return nil, fmt.Errorf("failed to sign object: %w", err)
	}

	signed := signedRaw{
		Data: cbor.RawMessage(data),
		Sig:  sign,
	}

	// TODO(burdiyan): build final message manually to avoid depending on another CBOR library.
	signedData, err := cbor.Marshal(signed)
	if err != nil {
		return nil, err
	}

	return cbornode.Decode(signedData, multihash.SHA2_256, -1)
}

// UnmarshalSigned IPLD CBOR document into v.
func UnmarshalSigned(data []byte, v interface{}, k crypto.PubKey) error {
	var in signedRaw

	if err := cbor.Unmarshal(data, &in); err != nil {
		return err
	}

	if k != nil {
		if err := in.VerifySignature(k); err != nil {
			return err
		}
	}

	return cbornode.DecodeInto(in.Data, v)
}

type signedRaw struct {
	Data cbor.RawMessage `cbor:"data"`
	Sig  []byte          `cbor:"signature"`
}

func (s signedRaw) VerifySignature(k crypto.PubKey) error {
	ok, err := k.Verify(s.Data, s.Sig)
	if err != nil {
		return fmt.Errorf("failed to verify IPLD node signature: %w", err)
	}

	if !ok {
		return errors.New("IPLD node signature verification failed")
	}

	return nil
}
