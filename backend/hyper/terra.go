package hyper

import (
	"fmt"
	"seed/backend/core"
	"seed/backend/hlc"
	"time"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/polydawn/refmt/obj/atlas"
)

var timeAtlas = atlas.BuildEntry(time.Time{}).Transform().
	TransformMarshal(atlas.MakeMarshalTransformFunc(func(t time.Time) (int64, error) {
		return t.Unix(), nil
	})).
	TransformUnmarshal(atlas.MakeUnmarshalTransformFunc(func(in int64) (time.Time, error) {
		return time.Unix(in, 0), nil
	})).
	Complete()

func init() {
	cbornode.RegisterCborType(timeAtlas)
	cbornode.RegisterCborType(KeyDelegation{})
	cbornode.RegisterCborType(Change{})
	cbornode.RegisterCborType(Comment{})
	cbornode.RegisterCborType(Block{})
	cbornode.RegisterCborType(Annotation{})
	cbornode.RegisterCborType(CommentBlock{})
}

// Available types.
const (
	TypeKeyDelegation BlobType = "KeyDelegation"
	TypeChange        BlobType = "Change"
	TypeDagPB         BlobType = "DagPB"
	TypeComment       BlobType = "Comment"
)

// Delegation purposes.
// The delegation object doesn't make distinction between key types,
// so by just looking at it we can't know whether the issuer is actually an account.
// This should give us more flexibility for the future, if we want to delegate
// keys from accounts to accounts, or from devices to other devices.
// So to distinguish between delegation types there's a field to specify the purpose.
const (
	DelegationPurposeRegistration = "DeviceRegistration" // assumes issuer is an account and delegate is a device.
)

// KeyDelegation is a signed payload which allows one key pair (delegate)
// to participate in the network on behalf of another key (issuer).
// The delegation is signed by the issuer, and used by the delegate.
// The field names `aud`, `iss`, `nbf` are borrowed from the JWT specification.
type KeyDelegation struct {
	Type      BlobType       `refmt:"@type"`
	Issuer    core.Principal `refmt:"issuer"`
	Delegate  core.Principal `refmt:"delegate"`
	IssueTime time.Time      `refmt:"issueTime"`
	Purpose   string         `refmt:"purpose"`
	Signature core.Signature `refmt:"sig,omitempty"` // omitempty for signing.
}

// NewKeyDelegation creates a new signed key delegation from one key to another.
func NewKeyDelegation(issuer core.KeyPair, delegate core.PublicKey, validFrom time.Time) (kd KeyDelegation, err error) {
	if validFrom.IsZero() {
		return kd, fmt.Errorf("must specify valid from timestamp")
	}

	d := KeyDelegation{
		Type:      TypeKeyDelegation,
		Issuer:    issuer.Principal(),
		Delegate:  delegate.Principal(),
		Purpose:   "DeviceRegistration",
		IssueTime: validFrom,
	}

	data, err := cbornode.DumpObject(d)
	if err != nil {
		return kd, fmt.Errorf("failed to encode signing bytes for key delegation: %w", err)
	}

	sig, err := issuer.Sign(data)
	if err != nil {
		return kd, fmt.Errorf("failed to sign key delegation %w", err)
	}

	d.Signature = sig

	return d, nil
}

// Verify signature of the delegation.
func (kd KeyDelegation) Verify() error {
	sig := kd.Signature
	kd.Signature = nil

	data, err := cbornode.DumpObject(kd)
	if err != nil {
		return fmt.Errorf("failed to encoding signing bytes to verify key delegation: %w", err)
	}

	if err := kd.Issuer.Verify(data, sig); err != nil {
		return err
	}

	return nil
}

// Blob encodes the delegation into a blob.
func (kd KeyDelegation) Blob() Blob {
	hb, err := EncodeBlob(kd)
	if err != nil {
		panic(err)
	}
	return hb
}

// Actions for entity changes.
const (
	ActionCreate = "Create"
	ActionUpdate = "Update"
)

// Change for a Seed mutable Entity.
type Change struct {
	// Type is always the same (see constants).
	Type BlobType `refmt:"@type"`

	// Deps is a list of dependency patches.
	Deps []cid.Cid `refmt:"deps,omitempty"`

	// Delegation points to the blob where we can get the Account ID
	// on which behalf this blob is signed.
	Delegation cid.Cid `refmt:"delegation"` // points to the delegation where we can get the account id

	// Action is an option machine-readable description of an action that Change describes.
	Action string `refmt:"action,omitempty"`

	// Message is an optional human readable message.
	Message string `refmt:"message,omitempty"`

	// HLCTime is the Hybrid-Logical timestamp.
	// Must be greater than the one of any of the deps.
	// Can be used as a Unix timestamp in *microseconds*.
	HLCTime hlc.Timestamp `refmt:"hlcTime"`

	// Entity is an arbitrary string describing the entity to mutate.
	// Meant to be globally unique, and should include the type of the entity if relevant.
	// Using an IRI[iri] might be a good option.
	//
	// [iri]: https://en.wikipedia.org/wiki/Internationalized_Resource_Identifier
	Entity EntityID `refmt:"entity"`

	// Patch is the body of our Merge Patch CRDT.
	// TODO(burdiyan): point to docs.
	Patch map[string]any `refmt:"patch,omitempty"`

	// Signer is the public key of the signer.
	Signer core.Principal `refmt:"signer,omitempty"`

	// Sig is the signature over the rest of the fields.
	Sig core.Signature `refmt:"sig,omitempty"`
}

// NewChange creates a new Change blob.
func NewChange(eid EntityID, deps []cid.Cid, ts hlc.Timestamp, signer core.KeyPair, delegation cid.Cid, patch map[string]any, opts ...ChangeOption) (hb Blob, err error) {
	// Make sure deps field is not present in the patch if there're no deps.
	if len(deps) == 0 {
		deps = nil
	}

	if len(patch) == 0 && len(deps) == 1 {
		return hb, fmt.Errorf("new changes must have a patch: nothing to update")
	}

	SortCIDs(deps)

	ch := Change{
		Type:       TypeChange,
		Entity:     eid,
		Deps:       deps,
		Delegation: delegation,
		HLCTime:    ts,
		Patch:      patch,
		Signer:     signer.Principal(),
	}
	for _, o := range opts {
		o(&ch)
	}

	sigdata, err := cbornode.DumpObject(ch)
	if err != nil {
		return hb, fmt.Errorf("failed to encode signing bytes for change %w", err)
	}

	ch.Sig, err = signer.Sign(sigdata)
	if err != nil {
		return hb, fmt.Errorf("failed to sign change: %w", err)
	}

	hb, err = EncodeBlob(ch)
	if err != nil {
		return hb, err
	}

	return hb, nil
}

// Verify change signature.
func (ch Change) Verify() error {
	sig := ch.Sig
	ch.Sig = nil

	data, err := cbornode.DumpObject(ch)
	if err != nil {
		return fmt.Errorf("failed to encoding signing bytes to verify change blob: %w", err)
	}

	if err := ch.Signer.Verify(data, sig); err != nil {
		return err
	}

	return nil
}

// Comment is a signed blob representing a comment or a reply.
type Comment struct {
	Type           BlobType       `refmt:"@type"`
	Delegation     cid.Cid        `refmt:"delegation"`
	Target         string         `refmt:"target,omitempty"`
	ThreadRoot     cid.Cid        `refmt:"threadRoot,omitempty"`
	RepliedComment cid.Cid        `refmt:"repliedComment,omitempty"`
	HLCTime        hlc.Timestamp  `refmt:"hlcTime"`
	Body           []CommentBlock `refmt:"body"`
	Signer         core.Principal `refmt:"signer,omitempty"`
	Sig            core.Signature `refmt:"sig,omitempty"`
}

// NewComment creates a new Comment blob.
func NewComment(target string, threadRoot, repliedComment cid.Cid, ts hlc.Timestamp, signer core.KeyPair, delegation cid.Cid, body []CommentBlock) (hb Blob, err error) {
	c := Comment{
		Type:           TypeComment,
		Delegation:     delegation,
		Target:         target,
		ThreadRoot:     threadRoot,
		RepliedComment: repliedComment,
		HLCTime:        ts,
		Body:           body,
		Signer:         signer.Principal(),
	}

	sigdata, err := cbornode.DumpObject(c)
	if err != nil {
		return hb, fmt.Errorf("failed to encode signing bytes for comment %w", err)
	}

	c.Sig, err = signer.Sign(sigdata)
	if err != nil {
		return hb, fmt.Errorf("failed to sign change: %w", err)
	}

	hb, err = EncodeBlob(c)
	if err != nil {
		return hb, err
	}

	return hb, nil
}

// Verify comment signature.
func (c Comment) Verify() error {
	sig := c.Sig
	c.Sig = nil

	data, err := cbornode.DumpObject(c)
	if err != nil {
		return fmt.Errorf("failed to encoding signing bytes to verify comment blob: %w", err)
	}

	if err := c.Signer.Verify(data, sig); err != nil {
		return err
	}

	return nil
}

// Block is a block of text with annotations.
type Block struct {
	ID          string            `refmt:"id,omitempty"` // Omitempty when used in Documents.
	Type        string            `refmt:"type,omitempty"`
	Text        string            `refmt:"text,omitempty"`
	Ref         string            `refmt:"ref,omitempty"`
	Attributes  map[string]string `refmt:"attributes,omitempty"`
	Annotations []Annotation      `refmt:"annotations,omitempty"`
}

// Annotation is a range of text that has a type and attributes.
type Annotation struct {
	Type       string            `refmt:"type"`
	Ref        string            `refmt:"ref,omitempty"`
	Attributes map[string]string `refmt:"attributes,omitempty"`
	Starts     []int32           `refmt:"starts,omitempty"`
	Ends       []int32           `refmt:"ends,omitempty"`
}

// CommentBlock is a block of text with annotations.
type CommentBlock struct {
	Block

	Children []CommentBlock
}
