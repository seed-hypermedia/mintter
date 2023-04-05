package sqlitevcs

import (
	context "context"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
)

// Register links device under a given account. Returns the CID of the resulting account object.
func Register(ctx context.Context, acc, device core.KeyPair, conn *Conn) (c cid.Cid, err error) {
	aid := acc.CID()

	perma, err := vcs.EncodePermanode(NewAccountPermanode(aid))
	if err != nil {
		return c, err
	}

	oid := perma.ID

	proof, err := NewRegistrationProof(acc, device.CID())
	if err != nil {
		return c, err
	}

	me := core.NewIdentity(acc.PublicKey, device)

	change := vcs.NewChange(me, oid, nil, KindRegistration, hlc.NewClock().Now(), proof)

	vc, err := change.Block()
	if err != nil {
		return c, err
	}

	defer sqlitex.Save(conn.InternalConn())(&err)
	conn.NewObject(perma)
	conn.StoreChange(vc)
	if err := conn.Err(); err != nil {
		return c, err
	}

	return perma.ID, nil
}

// RegistrationProof is a cryptographic proof certifying that
// one child key belongs to another parent key.
type RegistrationProof []byte

// NewRegistrationProof creates a new registration proof.
// It's deterministic, i.e. calling multiple times with
// the same arguments produces the same result.
func NewRegistrationProof(parent core.Signer, child cid.Cid) (RegistrationProof, error) {
	idBytes, err := child.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("failed to marshal id: %w", err)
	}

	sig, err := parent.Sign(append([]byte(registrationProofPrefix), idBytes...))
	if err != nil {
		return nil, fmt.Errorf("failed to sign id with private key: %w", err)
	}

	return RegistrationProof(sig), nil
}

// Verify registration proof.
func (p RegistrationProof) Verify(parent core.Verifier, child cid.Cid) error {
	if len(p) == 0 {
		return fmt.Errorf("empty registration proof")
	}

	data, err := child.MarshalBinary()
	if err != nil {
		return err
	}

	return parent.Verify(append([]byte(registrationProofPrefix), data...), core.Signature(p))
}

const registrationProofPrefix = "mintter-registration-proof:"
