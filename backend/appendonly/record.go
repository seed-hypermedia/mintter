package appendonly

import (
	"errors"
	"fmt"
	"time"

	"github.com/fxamacker/cbor/v2"
	crypto "github.com/libp2p/go-libp2p-crypto"
	"github.com/multiformats/go-multihash"
)

// SignedRecord is the final record signed with the private key.
type SignedRecord struct {
	signingBytes []byte
	hash         string

	Record    Record `cbor:"1,keyasint"`
	Signature []byte `cbor:"2,keyasint"`
}

// Hash is the record ID. Hash of the record including signature.
func (sr SignedRecord) Hash() string {
	return sr.hash
}

// SigningBytes of the underlying record.
func (sr SignedRecord) SigningBytes() []byte {
	return sr.signingBytes
}

// Verify record signature.
func (sr SignedRecord) Verify(key crypto.PubKey) error {
	ok, err := key.Verify(sr.signingBytes, sr.Signature)
	if err != nil {
		return err
	}

	if !ok {
		return errors.New("signature not ok")
	}

	return nil
}

// UnmarshalCBOR implements cbor.Unmarshaler.
func (sr *SignedRecord) UnmarshalCBOR(data []byte) error {
	var in struct {
		RawRecord cbor.RawMessage `cbor:"1,keyasint"`
		Signature []byte          `cbor:"2,keyasint"`
	}

	if err := cbor.Unmarshal(data, &in); err != nil {
		return err
	}

	if err := cbor.Unmarshal(in.RawRecord, &sr.Record); err != nil {
		return err
	}

	recmh, err := multihash.Sum(in.RawRecord, sr.Record.MultihashCode, -1)
	if err != nil {
		panic(err)
	}

	sr.signingBytes = recmh
	sr.Signature = in.Signature

	mh, err := multihash.Sum(data, sr.Record.MultihashCode, -1)
	if err != nil {
		panic(err)
	}

	sr.hash = mh.String()

	return nil
}

// Record of the log.
type Record struct {
	Seq           int       `cbor:"1,keyasint"`
	Author        string    `cbor:"2,keyasint"`
	MultihashCode uint64    `cbor:"3,keyasint"`
	Previous      string    `cbor:"4,keyasint"`
	Content       []byte    `cbor:"5,keyasint"`
	AppendTime    time.Time `cbor:"6,keyasint"`
}

// Sign the record with key.
func (r Record) Sign(key crypto.PrivKey) (SignedRecord, error) {
	data, err := encMode.Marshal(r)
	if err != nil {
		panic(fmt.Errorf("failed to marshal to cbor: %+v", err))
	}

	// Log records are signed as in SSB. The signature is included in the signed record
	// along with the actual data that was signed.

	recmh, err := multihash.Sum(data, r.MultihashCode, -1)
	if err != nil {
		panic(err)
	}

	sign, err := key.Sign(recmh)
	if err != nil {
		return SignedRecord{}, fmt.Errorf("failed to sign record: %w", err)
	}

	sr := SignedRecord{
		signingBytes: recmh,

		Record:    r,
		Signature: sign,
	}

	// Hash is used as a message ID. It includes the whole signed record.
	raw, err := encMode.Marshal(sr)
	if err != nil {
		panic(err)
	}

	mh, err := multihash.Sum(raw, sr.Record.MultihashCode, -1)
	if err != nil {
		panic(err)
	}

	sr.hash = mh.String()

	return sr, nil
}
