package vcstypes

import (
	"fmt"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"time"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

const AccountType vcs.ObjectType = "https://schema.mintter.org/Account"

func init() {
	cbornode.RegisterCborType(AccountPermanode{})
	cbornode.RegisterCborType(AccountEvent{})
	cbornode.RegisterCborType(DeviceRegistration{})
}

type AccountPermanode struct {
	vcs.BasePermanode
}

func NewAccountPermanode(owner cid.Cid) AccountPermanode {
	return AccountPermanode{
		BasePermanode: vcs.BasePermanode{
			Type:       AccountType,
			Owner:      owner,
			CreateTime: time.Time{}, // zero time for deterministic permanode.
		},
	}
}

type Account struct {
	events []AccountEvent
	obj    cid.Cid
	state  AccountState
}

func NewAccount(objectID cid.Cid, accountID cid.Cid) *Account {
	if objectID.Prefix().Codec != cid.DagCBOR {
		panic("BUG: wrong object ID for Account")
	}

	if accountID.Prefix().Codec != core.CodecAccountKey {
		panic("BUG: wrong account ID for Account")
	}

	return &Account{
		obj: objectID,
		state: AccountState{
			ID: accountID,
		},
	}
}

func (a *Account) ObjectID() cid.Cid { return a.obj }

func (a *Account) SetAlias(alias string) {
	if alias == "" {
		return
	}

	if a.state.Profile.Alias == alias {
		return
	}

	a.state.Profile.Alias = alias

	a.events = append(a.events, AccountEvent{
		AliasChanged: alias,
	})
}

func (a *Account) SetBio(bio string) {
	if bio == "" {
		return
	}

	if a.state.Profile.Bio == bio {
		return
	}

	a.state.Profile.Bio = bio

	a.events = append(a.events, AccountEvent{
		BioChanged: bio,
	})
}

func (a *Account) SetEmail(email string) {
	if email == "" {
		return
	}

	if a.state.Profile.Email == email {
		return
	}

	a.state.Profile.Email = email

	a.events = append(a.events, AccountEvent{
		EmailChanged: email,
	})
}

func (a *Account) RegisterDevice(device core.PublicKey, accountKey core.KeyPair) error {
	if device.Codec() != core.CodecDeviceKey {
		return fmt.Errorf("bad device key")
	}

	if accountKey.Codec() != core.CodecAccountKey {
		return fmt.Errorf("bad account key")
	}

	if !accountKey.CID().Equals(a.state.ID) {
		return fmt.Errorf("trying to register device with wrong account key")
	}

	if a.state.Devices == nil {
		a.state.Devices = map[cid.Cid]DeviceRegistration{}
	}

	did := device.CID()

	// We don't want to create duplicate registrations.
	if _, ok := a.state.Devices[did]; ok {
		return nil
	}

	proof, err := NewRegistrationProof(accountKey, did)
	if err != nil {
		return err
	}

	reg := DeviceRegistration{
		Device: did,
		Proof:  proof,
	}

	a.state.Devices[did] = reg

	a.events = append(a.events, AccountEvent{
		DeviceRegistered: reg,
	})

	return nil
}

func (a *Account) Events() []AccountEvent {
	return a.events
}

func (a *Account) State() AccountState { return a.state }

func (a *Account) Apply(evt AccountEvent, updateTime time.Time) error {
	switch {
	case evt.AliasChanged != "":
		a.state.Profile.Alias = evt.AliasChanged
	case evt.BioChanged != "":
		a.state.Profile.Bio = evt.BioChanged
	case evt.EmailChanged != "":
		a.state.Profile.Email = evt.EmailChanged
	case evt.DeviceRegistered.Proof != nil:
		if a.state.Devices == nil {
			a.state.Devices = make(map[cid.Cid]DeviceRegistration)
		}
		a.state.Devices[evt.DeviceRegistered.Device] = evt.DeviceRegistered
	default:
		panic("BUG: unknown account event")
	}

	return nil
}

func (a *Account) ApplyChange(id cid.Cid, c vcs.Change) error {
	var evts []AccountEvent

	if err := cbornode.DecodeInto(c.Body, &evts); err != nil {
		return fmt.Errorf("failed to decode account events: %w", err)
	}

	for _, e := range evts {
		if err := a.Apply(e, c.CreateTime); err != nil {
			return fmt.Errorf("failed to apply account event: %w", err)
		}
	}

	return nil
}

type AccountState struct {
	ID      cid.Cid
	Profile Profile
	Devices map[cid.Cid]DeviceRegistration
}

type Profile struct {
	Alias string
	Bio   string
	Email string
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
	if p == nil || len(p) == 0 {
		return fmt.Errorf("empty registration proof")
	}

	data, err := child.MarshalBinary()
	if err != nil {
		return err
	}

	return parent.Verify(append([]byte(registrationProofPrefix), data...), core.Signature(p))
}

const registrationProofPrefix = "mintter-registration-proof:"

type AccountEvent struct {
	// One of.
	AliasChanged     string             `refmt:"aliasChanged,omitempty"`
	BioChanged       string             `refmt:"bioChanged,omitempty"`
	EmailChanged     string             `refmt:"emailChanged,omitempty"`
	DeviceRegistered DeviceRegistration `refmt:"deviceRegistered,omitempty"`
}
