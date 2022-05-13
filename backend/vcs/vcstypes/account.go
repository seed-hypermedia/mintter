package vcstypes

import (
	"context"
	"encoding"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/ipfs"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"
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

	proof, err := makeInviteProof(accountKey, device)
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
	Proof  []byte
}

type AccountEvent struct {
	// One of.
	AliasChanged     string             `refmt:"aliasChanged,omitempty"`
	BioChanged       string             `refmt:"bioChanged,omitempty"`
	EmailChanged     string             `refmt:"emailChanged,omitempty"`
	DeviceRegistered DeviceRegistration `refmt:"deviceRegistered,omitempty"`
}

// Register account with the device and return the created account object ID.
func Register(ctx context.Context, account, device core.KeyPair, v *vcs.SQLite) (cid.Cid, error) {
	aid := account.CID()

	ap := NewAccountPermanode(aid)

	blk, err := vcs.EncodeBlock[vcs.Permanode](ap)
	if err != nil {
		return cid.Undef, err
	}

	if err := v.StorePermanode(ctx, blk.Block, blk.Value); err != nil {
		return cid.Undef, err
	}

	accmodel := NewAccount(blk.Cid(), aid)

	if err := accmodel.RegisterDevice(device.PublicKey, account); err != nil {
		return cid.Undef, err
	}

	id := core.NewIdentity(aid, device)

	evts := accmodel.Events()
	if len(evts) <= 0 {
		panic("BUG: no events after account register")
	}

	data, err := cbornode.DumpObject(evts)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to encode account events: %w", err)
	}

	recorded, err := v.RecordChange(ctx, blk.Cid(), id, vcs.Version{}, "mintter.Account", data)
	if err != nil {
		return cid.Undef, err
	}

	ver := vcs.NewVersion(recorded.LamportTime, recorded.ID)

	if err := v.StoreNamedVersion(ctx, blk.Cid(), id, "main", ver); err != nil {
		return cid.Undef, fmt.Errorf("failed to store named version for account: %w", err)
	}

	conn, release, err := v.DB().Conn(ctx)
	if err != nil {
		return cid.Undef, err
	}
	defer release()

	dcodec, dhash := ipfs.DecodeCID(device.CID())
	devicedb, err := vcssql.DevicesLookupPK(conn, dhash, int(dcodec))
	if err != nil {
		return cid.Undef, err
	}
	if devicedb.DevicesID == 0 {
		return cid.Undef, fmt.Errorf("no device in the database")
	}

	acodec, ahash := ipfs.DecodeCID(account.CID())
	accdb, err := vcssql.AccountsLookupPK(conn, ahash, int(acodec))
	if err != nil {
		return cid.Undef, err
	}
	if accdb.AccountsID == 0 {
		return cid.Undef, fmt.Errorf("no account in the database")
	}

	if err := vcssql.DevicesUpdateAccount(conn, accdb.AccountsID, devicedb.DevicesID); err != nil {
		return cid.Undef, fmt.Errorf("failed to index account device: %w", err)
	}

	return blk.Cid(), nil
}

const accBindingPrefix = "account-binding:"

func makeInviteProof(k core.Signer, id encoding.BinaryMarshaler) ([]byte, error) {
	idBytes, err := id.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("failed to marshal id: %w", err)
	}

	sig, err := k.Sign(append([]byte(accBindingPrefix), idBytes...))
	if err != nil {
		return nil, fmt.Errorf("failed to sign id with private key: %w", err)
	}

	return sig, nil
}

func verifyInviteProof(k core.Verifier, id encoding.BinaryMarshaler, signature []byte) error {
	idBytes, err := id.MarshalBinary()
	if err != nil {
		return err
	}

	if err := k.Verify(append([]byte(accBindingPrefix), idBytes...), signature); err != nil {
		return fmt.Errorf("failed to verify invite proof: %w", err)
	}

	return nil
}
