package appendonly

import (
	"errors"
	"fmt"
	"time"

	"github.com/fxamacker/cbor/v2"
	crypto "github.com/libp2p/go-libp2p-crypto"
	"github.com/multiformats/go-multihash"
)

var (
	encMode cbor.EncMode
)

func init() {
	opts := cbor.CanonicalEncOptions()
	opts.Time = cbor.TimeRFC3339
	m, err := opts.EncMode()
	if err != nil {
		panic(err)
	}

	encMode = m
}

// LogRecord is the record including the sequence number.
// This is how it's stored in the actual log.
// So the overall layout of the log data is:
//
// - LogRecord: stored in DB and includes the seq number.
//   - SignedRecord: record and the author's signature of the underlying record.
//     - Record: includes user-produced content and metadata like timestamp, author and etc.
//       - Content: actual user's content.
type LogRecord struct {
	Seq int          `cbor:"1,keyasint"`
	Rec SignedRecord `cbor:"2,keyasint"`
}

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

func (sr SignedRecord) Marshal() ([]byte, error) {
	return encMode.Marshal(sr)
}

func (sr *SignedRecord) Unmarshal(data []byte) error {
	return sr.UnmarshalCBOR(data)
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

// ContentType is a type for types of content.
type ContentType uint32

// Content types.
const (
	ContentTypeCBOR ContentType = iota
)

// Record of the log.
type Record struct {
	Author        string      `cbor:"1,keyasint"`
	MultihashCode uint64      `cbor:"2,keyasint"`
	Previous      string      `cbor:"3,keyasint"`
	ContentType   ContentType `cbor:"4,keyasint"`
	Content       []byte      `cbor:"5,keyasint"`
	AppendTime    time.Time   `cbor:"6,keyasint"`
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
