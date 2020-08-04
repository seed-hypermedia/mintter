package ipldutil

import (
	"bytes"
	"errors"
	"fmt"
	"io"

	"github.com/fxamacker/cbor/v2"
	"github.com/libp2p/go-libp2p-core/crypto"

	typegen "github.com/whyrusleeping/cbor-gen"
)

type rawCBOR []byte

// UnmarshalCBOR sets *m to a copy of data.
func (m *rawCBOR) UnmarshalCBOR(data []byte) error {
	if m == nil {
		return errors.New("cbor.RawMessage: UnmarshalCBOR on nil pointer")
	}
	*m = append((*m)[0:0], data...)
	return nil
}

type signedIPLD struct {
	Data      rawCBOR `cbor:"data"`
	Signer    string  `cbor:"signer"`
	Signature []byte  `cbor:"signature"`
}

func (t signedIPLD) VerifySignature(k crypto.PubKey) error {
	ok, err := k.Verify(t.Data, t.Signature)
	if err != nil {
		return fmt.Errorf("failed to verify IPLD node signature: %w", err)
	}

	if !ok {
		return errors.New("IPLD node signature verification failed")
	}

	return nil
}

// This code is partially generated using cbor-gen package, but it was not treating RawCBOR type correctly
// so we've adapted some of the things to encode RawCBOR as is without encoding it as bytes.

func (t signedIPLD) MarshalCBOR(w io.Writer) error {
	if _, err := w.Write([]byte{163}); err != nil {
		return err
	}

	scratch := make([]byte, 9)

	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajTextString, uint64(len("data"))); err != nil {
		return err
	}
	if _, err := io.WriteString(w, "data"); err != nil {
		return err
	}

	if len(t.Data) > typegen.ByteArrayMaxLen {
		return errors.New("byte array in field Data is too long")
	}

	if _, err := w.Write(t.Data[:]); err != nil {
		return err
	}

	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajTextString, uint64(len("signer"))); err != nil {
		return err
	}
	if _, err := io.WriteString(w, "signer"); err != nil {
		return err
	}

	if len(t.Signer) > typegen.MaxLength {
		return errors.New("value in field Signer is too long")
	}

	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajTextString, uint64(len(t.Signer))); err != nil {
		return err
	}
	if _, err := io.WriteString(w, string(t.Signer)); err != nil {
		return err
	}

	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajTextString, uint64(len("signature"))); err != nil {
		return err
	}
	if _, err := io.WriteString(w, "signature"); err != nil {
		return err
	}

	if len(t.Signature) > typegen.ByteArrayMaxLen {
		return errors.New("byte array in field Signature is too long")
	}

	if err := typegen.WriteMajorTypeHeaderBuf(scratch, w, typegen.MajByteString, uint64(len(t.Signature))); err != nil {
		return err
	}

	if _, err := w.Write(t.Signature[:]); err != nil {
		return err
	}
	return nil
}

func (t *signedIPLD) UnmarshalCBOR(r io.Reader) error {
	var b bytes.Buffer

	if _, err := io.Copy(&b, r); err != nil {
		return err
	}

	return cbor.Unmarshal(b.Bytes(), t)
}
