package mttacc

import (
	"fmt"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"time"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

// AccountType is a type URL for Account Permanodes.
const AccountType vcs.ObjectType = "https://schema.mintter.org/Account"

func init() {
	cbornode.RegisterCborType(AccountPermanode{})
	cbornode.RegisterCborType(DeviceRegistration{})
}

// AccountPermanode is an implementation of a Permanode for Account objects.
type AccountPermanode struct {
	vcs.BasePermanode
}

// NewAccountPermanode creates a new permanode for an Account.
func NewAccountPermanode(owner cid.Cid) AccountPermanode {
	return AccountPermanode{
		BasePermanode: vcs.BasePermanode{
			Type:       AccountType,
			Owner:      owner,
			CreateTime: time.Time{}, // zero time for deterministic permanode.
		},
	}
}

// DeviceRegistration delegates capabilities to mutate an Account to a Device.
type DeviceRegistration struct {
	Device cid.Cid
	Proof  RegistrationProof
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
