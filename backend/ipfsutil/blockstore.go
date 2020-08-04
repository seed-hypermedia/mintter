package ipfsutil

import (
	"context"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	exchange "github.com/ipfs/go-ipfs-exchange-interface"

	blocks "github.com/ipfs/go-block-format"
	blockservice "github.com/ipfs/go-blockservice"
)

// NetworkBlockStore wraps block service into the common block store interface.
// Looks like eventually IPFS will go down the path of merging blockservice
// into the blockstore interface (which indeed does make sense). With
// this abstraction we anticipate this so that we can depend only
// on blockstore interface and ignore block service's peculiarities.
type NetworkBlockStore struct {
	bs blockservice.BlockService

	timeout time.Duration
}

// NewNetworkBlockStore wraps block service into blockstore interface.
func NewNetworkBlockStore(bs blockservice.BlockService) *NetworkBlockStore {
	return &NetworkBlockStore{
		bs:      bs,
		timeout: 1 * time.Minute,
	}
}

// DeleteBlock implements block store interface.
func (s *NetworkBlockStore) DeleteBlock(c cid.Cid) error {
	return s.bs.DeleteBlock(c)
}

// Has implements block store interface.
func (s *NetworkBlockStore) Has(c cid.Cid) (bool, error) {
	return s.bs.Blockstore().Has(c)
}

// Get implements block store interface.
func (s *NetworkBlockStore) Get(c cid.Cid) (blocks.Block, error) {
	ctx, cancel := context.WithTimeout(context.TODO(), s.timeout)
	defer cancel()

	return s.bs.GetBlock(ctx, c)
}

// GetSize implements block store interface.
func (s *NetworkBlockStore) GetSize(c cid.Cid) (int, error) {
	n, err := s.bs.Blockstore().GetSize(c)
	if err == nil {
		return n, nil
	}
	if err != nil && err != datastore.ErrNotFound {
		return 0, err
	}

	ctx, cancel := context.WithTimeout(context.TODO(), s.timeout)
	defer cancel()

	if _, err := s.bs.GetBlock(ctx, c); err != nil {
		return 0, err
	}

	return s.bs.Blockstore().GetSize(c)
}

// Put implements block store interface.
func (s *NetworkBlockStore) Put(b blocks.Block) error {
	return s.bs.AddBlock(b)
}

// PutMany implements block store interface.
func (s *NetworkBlockStore) PutMany(bs []blocks.Block) error {
	return s.bs.AddBlocks(bs)
}

// AllKeysChan implements block store interface.
func (s *NetworkBlockStore) AllKeysChan(ctx context.Context) (<-chan cid.Cid, error) {
	return s.bs.Blockstore().AllKeysChan(ctx)
}

// HashOnRead implements block store interface.
func (s *NetworkBlockStore) HashOnRead(enabled bool) {
	s.bs.Blockstore().HashOnRead(enabled)
}

// Exchange returns the underlying exchange.
func (s *NetworkBlockStore) Exchange() exchange.Interface {
	return s.bs.Exchange()
}
