package ipldutil

import (
	"context"
	"fmt"

	"mintter/backend/identity"

	"github.com/ipfs/go-cid"

	blocks "github.com/ipfs/go-block-format"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

type blockStore interface {
	Get(cid.Cid) (blocks.Block, error)
	Put(blocks.Block) error
}

type profileStore interface {
	CurrentProfile(context.Context) (identity.Profile, error)
	GetProfile(context.Context, identity.ProfileID) (identity.Profile, error)
}

// SigningStore is an IPLD store that cryptographically signs and verifies signatures of IPLD objects.
// It also implements cbornode.IpldStore interface.
type SigningStore struct {
	profstore profileStore
	bs        *cbornode.BasicIpldStore
}

// NewSigningStore creates a new SigningStore.
func NewSigningStore(profstore profileStore, bs blockStore) *SigningStore {
	return &SigningStore{
		profstore: profstore,
		bs:        cbornode.NewCborStore(bs),
	}
}

// Get objects from a signed IPLD and verify its signature.
func (s *SigningStore) Get(ctx context.Context, c cid.Cid, v interface{}) error {
	var in signedIPLD

	if err := s.bs.Get(ctx, c, &in); err != nil {
		return err
	}

	pid, err := identity.DecodeProfileID(in.Signer)
	if err != nil {
		return err
	}

	prof, err := s.profstore.GetProfile(ctx, pid)
	if err != nil {
		return err
	}

	if err := in.VerifySignature(prof.Account.PubKey); err != nil {
		return err
	}

	return cbornode.DecodeInto(in.Data, v)
}

// Put v into a signed IPLD.
func (s *SigningStore) Put(ctx context.Context, v interface{}) (cid.Cid, error) {
	prof, err := s.profstore.CurrentProfile(ctx)
	if err != nil {
		return cid.Undef, err
	}

	data, err := cbornode.DumpObject(v)
	if err != nil {
		return cid.Undef, err
	}

	sign, err := prof.Account.PrivKey.Sign(data)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to sign object: %w", err)
	}

	signed := signedIPLD{
		Data:      rawCBOR(data),
		Signature: sign,
		Signer:    prof.Account.ID.String(),
	}

	return s.bs.Put(ctx, signed)
}
