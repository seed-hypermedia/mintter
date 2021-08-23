package backend

import (
	"bytes"
	"fmt"
	"io"

	"github.com/libp2p/go-libp2p-core/crypto"

	cbornode "github.com/ipfs/go-ipld-cbor"
	typegen "github.com/whyrusleeping/cbor-gen"
)

// Signing objects is a controversial subject with lots of tradeoffs,
// and here we made a deliberate choice of some of them:
//
// Goal #1: The resulting signed object must be a valid CBOR.
// Goal #2: Only one pass is required to serialize/deserialize the object for signing and verifying.
// Goal #3: The signed data must be "visible", not serialized as opaque byte string.
//
// To achieve these goals the value to sign must be serializable to CBOR map.
// Then we marshal the data, and "embed" it into an "envelope" map with a specific structure.
// The order of fields of the "envelope" map is important and goes as following:
//
// {"payloadSize": <int>, "payload": <map>, "signature": <bytes>, "publicKey": <bytes>}
//
// Field payload is the actual value that we sign. Payload size helps to "exctract" the payload bytes,
// and get to the signature without parsing the payload. Then we can verify the signature, and parse
// the payload into the corresponding struct.

const (
	fieldPayloadSize = "payloadSize"
	fieldPayload     = "payload"
	fieldPublicKey   = "publicKey"
	fieldSignature   = "signature"
)

type VerifiedCBOR struct {
	Payload   []byte
	Signature []byte
	PubKey    crypto.PubKey
}

type SignedCBOR []byte

func (s SignedCBOR) Verify() (VerifiedCBOR, error) {
	scratch := make([]byte, 9)

	br := bytes.NewReader(s)

	maj, extra, err := typegen.CborReadHeaderBuf(br, scratch)
	if err != nil {
		return VerifiedCBOR{}, err
	}
	if maj != typegen.MajMap {
		return VerifiedCBOR{}, fmt.Errorf("cbor input should be of type map")
	}

	if extra > typegen.MaxLength {
		return VerifiedCBOR{}, fmt.Errorf("cbor map struct is too large (%d)", extra)
	}

	size, err := readIntField(scratch, br, fieldPayloadSize)
	if err != nil {
		return VerifiedCBOR{}, err
	}

	data, err := readRawCBORField(scratch, br, fieldPayload, size)
	if err != nil {
		return VerifiedCBOR{}, err
	}

	sig, err := readBytesField(scratch, br, fieldSignature)
	if err != nil {
		return VerifiedCBOR{}, err
	}

	pubKeyData, err := readBytesField(scratch, br, fieldPublicKey)
	if err != nil {
		return VerifiedCBOR{}, err
	}

	pk, err := crypto.UnmarshalPublicKey(pubKeyData)
	if err != nil {
		return VerifiedCBOR{}, err
	}

	ok, err := pk.Verify(data, sig)
	if err != nil {
		return VerifiedCBOR{}, err
	}

	if !ok {
		return VerifiedCBOR{}, fmt.Errorf("signature verification failed")
	}

	return VerifiedCBOR{
		Payload:   data,
		PubKey:    pk,
		Signature: sig,
	}, nil
}

type SigCBOR struct {
	data         []byte
	signingBytes []byte
	signature    []byte
	pubKey       crypto.PubKey
}

func SignCBOR(v interface{}, k crypto.PrivKey) (*SigCBOR, error) {
	if v == nil {
		panic("BUG: can't sign nil CBOR type")
	}

	data, err := cbornode.DumpObject(v)
	if err != nil {
		return nil, err
	}

	sig, err := k.Sign(data)
	if err != nil {
		return nil, err
	}

	pk := k.GetPublic()

	pubKey, err := crypto.MarshalPublicKey(pk)
	if err != nil {
		return nil, err
	}

	w := &bytes.Buffer{} // TODO: allocate buffer large enough to fit the expected data.

	// 164 is a CBOR major type for map of 3 elements.
	if err := w.WriteByte(164); err != nil {
		return nil, err
	}

	scratch := make([]byte, 9)

	payloadSize := len(data)

	if err := writeIntField(scratch, w, fieldPayloadSize, payloadSize); err != nil {
		return nil, err
	}

	if err := writeRawCBORField(scratch, w, fieldPayload, data); err != nil {
		return nil, err
	}

	payloadEnd := w.Len()
	payloadStart := payloadEnd - payloadSize

	if err := writeBytesField(scratch, w, fieldSignature, sig); err != nil {
		return nil, err
	}

	if err := writeBytesField(scratch, w, fieldPublicKey, pubKey); err != nil {
		return nil, err
	}

	signedData := w.Bytes()

	return &SigCBOR{
		data: signedData,
		// Here we reslice the signed data to extract the raw data, instead of saving the raw data
		// generated initially, so that we don't store same data twice in-memory longer than needed.
		signingBytes: signedData[payloadStart:payloadEnd],
		signature:    sig,
		pubKey:       pk,
	}, nil
}

func writeIntField(scratch []byte, w io.Writer, key string, value int) error {
	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajTextString, uint64(len(key))); err != nil {
		return err
	}

	if _, err := io.WriteString(w, key); err != nil {
		return err
	}

	if value < 0 {
		return typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajNegativeInt, uint64(-value-1))
	}

	return typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajUnsignedInt, uint64(value))
}

func writeBytesField(scratch []byte, w io.Writer, key string, value []byte) error {
	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajTextString, uint64(len(key))); err != nil {
		return err
	}

	if _, err := io.WriteString(w, key); err != nil {
		return err
	}

	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajByteString, uint64(len(value))); err != nil {
		return err
	}

	if _, err := w.Write(value); err != nil {
		return err
	}

	return nil
}

func writeRawCBORField(scratch []byte, w io.Writer, key string, value []byte) error {
	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajTextString, uint64(len(key))); err != nil {
		return err
	}

	if _, err := io.WriteString(w, key); err != nil {
		return err
	}

	if _, err := w.Write(value); err != nil {
		return err
	}

	return nil
}

func readIntField(scratch []byte, r io.Reader, key string) (int, error) {
	readKey, err := typegen.ReadStringBuf(r, scratch)
	if err != nil {
		return 0, err
	}

	if key != readKey {
		return 0, fmt.Errorf("failed to read cbor field: want = %v, got = %v", key, readKey)
	}

	maj, extra, err := typegen.CborReadHeaderBuf(r, scratch)
	if err != nil {
		return 0, err
	}

	var extraI int

	switch maj {
	case typegen.MajUnsignedInt:
		extraI = int(extra)
		if extraI < 0 {
			return 0, fmt.Errorf("int64 positive overflow")
		}
	case typegen.MajNegativeInt:
		extraI = int(extra)
		if extraI < 0 {
			return 0, fmt.Errorf("int64 negative oveflow")
		}
		extraI = -1 - extraI
	default:
		return 0, fmt.Errorf("wrong type for int64 field: %d", maj)
	}

	return extraI, nil
}

func readRawCBORField(scratch []byte, r io.Reader, key string, size int) ([]byte, error) {
	readKey, err := typegen.ReadStringBuf(r, scratch)
	if err != nil {
		return nil, err
	}

	if key != readKey {
		return nil, fmt.Errorf("failed to read cbor field: want = %v, got = %v", key, readKey)
	}

	data := make([]byte, size)
	if _, err := io.ReadFull(r, data); err != nil {
		return nil, err
	}

	return data, nil
}

func readBytesField(scratch []byte, r io.Reader, key string) ([]byte, error) {
	readKey, err := typegen.ReadStringBuf(r, scratch)
	if err != nil {
		return nil, err
	}

	if key != readKey {
		return nil, fmt.Errorf("failed to read cbor field: want = %v, got = %v", key, readKey)
	}

	maj, extra, err := typegen.CborReadHeaderBuf(r, scratch)
	if err != nil {
		return nil, err
	}

	if extra > typegen.ByteArrayMaxLen {
		return nil, fmt.Errorf("cbor field %s is too large (%d)", key, extra)
	}
	if maj != typegen.MajByteString {
		return nil, fmt.Errorf("cbor field error %s: expected byte array, got = %v", key, maj)
	}

	data := make([]byte, extra)

	if _, err := io.ReadFull(r, data); err != nil {
		return nil, err
	}

	return data, nil
}
