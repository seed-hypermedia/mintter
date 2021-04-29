package backend

import (
	"context"
	"fmt"
	p2p "mintter/api/go/p2p/v1alpha"
	"mintter/backend/badgerutil"
	"mintter/backend/ipfsutil"
	"sync"
	"time"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"golang.org/x/sync/errgroup"
	"google.golang.org/protobuf/proto"

	blocks "github.com/ipfs/go-block-format"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	exchange "github.com/ipfs/go-ipfs-exchange-interface"
)

/*
Predicates:

peers/cid/<peer-uid> => cid of the peer
peers/heads/<object-uid> => head for a given object

objects/accounts/cid => cid of this account object
objects/documents/cid => cid of this document object
*/

var (
	predPeersCID   = []byte("peers/cid")
	predPeersHeads = []byte("peers/heads/")

	predObjectsAccountCID   = []byte("objects/accounts/cid")
	predObjectsDocumentsCID = []byte("objects/documents/cid")

	kindPeers   = []byte("peers")
	kindObjects = []byte("objects")
)

// nowFunc is overwritten in tests.
var nowFunc = func() time.Time {
	return time.Now().UTC()
}

type patchStore struct {
	k    crypto.PrivKey
	peer cid.Cid

	db       *badgerutil.DB
	bs       blockstore.Blockstore
	exchange exchange.Interface

	mu   sync.RWMutex
	subs map[chan<- signedPatch]struct{}
}

func newPatchStore(k crypto.PrivKey, bs blockstore.Blockstore, db *badgerutil.DB) (*patchStore, error) {
	pid, err := peer.IDFromPrivateKey(k)
	if err != nil {
		return nil, err
	}

	return &patchStore{
		k:    k,
		peer: peer.ToCid(pid),

		db:   db,
		bs:   bs,
		subs: make(map[chan<- signedPatch]struct{}),
	}, nil
}

func (s *patchStore) AddPatch(ctx context.Context, sp signedPatch) error {
	txn := s.db.NewTransaction(true)
	defer txn.Discard()

	_, ohash := ipfsutil.DecodeCID(sp.ObjectID)
	_, phash := ipfsutil.DecodeCID(sp.peer)

	ouid, err := s.db.UID(txn, kindObjects, ohash)
	if err != nil {
		return err
	}

	puid, err := s.db.UID(txn, kindPeers, phash)
	if err != nil {
		return err
	}

	headPred := badgerutil.PredicateWithUID(predPeersHeads, ouid)

	h := &p2p.PeerVersion{}
	{
		err := s.db.GetData(txn, headPred, puid, badgerutil.DecodeProto(h))
		if err != nil && err != badger.ErrKeyNotFound {
			return fmt.Errorf("failed to get head: %w", err)
		}
	}

	if h.Seq+1 != sp.Seq {
		return fmt.Errorf("concurrency error: precondition failed: stored seq = %d, incoming seq = %d", h.Seq, sp.Seq)
	}

	var headCID cid.Cid
	if h.Head != "" {
		headCID, err = cid.Decode(h.Head)
		if err != nil {
			return fmt.Errorf("bad head CID: %w", err)
		}
	}

	if len(sp.Deps) > 0 {
		if !sp.Deps[0].Equals(headCID) {
			return fmt.Errorf("first dep must be previous head of this peer")
		}
	}

	// TODO: use the same txn to store blocks.
	if err := s.bs.Put(sp.blk); err != nil {
		return fmt.Errorf("failed to put patch in blockstore: %w", err)
	}

	h.Head = sp.cid.String()
	h.Seq = sp.Seq
	h.LamportTime = sp.LamportTime

	newHead, err := proto.Marshal(h)
	if err != nil {
		return err
	}

	if err := s.db.SetData(txn, headPred, puid, newHead); err != nil {
		return err
	}

	if err := txn.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Notify
	s.mu.RLock()
	defer s.mu.RUnlock()

	for s := range s.subs {
		s <- sp
	}

	return nil
}

func (s *patchStore) LoadState(ctx context.Context, obj cid.Cid) (*state, error) {
	var heads []*p2p.PeerVersion
	if err := s.db.View(func(txn *badger.Txn) error {
		v, err := s.getHeads(ctx, txn, obj)
		if err != nil {
			return err
		}
		heads = v
		return nil
	}); err != nil {
		return nil, err
	}

	g, ctx := errgroup.WithContext(ctx)

	out := make([][]signedPatch, len(heads))

	// TODO: release Badger transaction here. We don't need it anymore
	for i, h := range heads {
		i := i
		h := h
		out[i] = make([]signedPatch, h.Seq) // Allocate enough space to store all the known patches.
		g.Go(func() error {
			next, err := cid.Decode(h.Head)
			if err != nil {
				return fmt.Errorf("bad head CID: %w", err)
			}

			idx := h.Seq - 1

			// TODO: check if object and peer are the same between iterations.
			for next.Defined() {
				select {
				case <-ctx.Done():
					return ctx.Err()
				default:
					blk, err := s.bs.Get(next)
					if err != nil {
						return err
					}

					sp, err := decodePatchBlock(blk)
					if err != nil {
						return err
					}

					out[i][idx] = sp
					idx--

					if len(sp.Deps) > 1 {
						panic("BUG: multiple deps are not implemented yet")
					}

					if len(sp.Deps) == 0 {
						next = cid.Undef
					} else {
						next = sp.Deps[0]
					}
				}
			}

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return newState(obj, out), nil
}

func (s *patchStore) ListObjects(ctx context.Context, codec uint64, after string, limit int) ([]cid.Cid, error) {
	// if err := s.db.View(func(txn *badger.Txn) error {
	// 	defer it.Close()

	// 	for it.Rewind(); it.Valid(); it.Next() {
	// 		// item := it.Item()
	// 		// s.db.getCIDValue()
	// 	}
	// 	return nil
	// }); err != nil {
	// 	return nil, fmt.Errorf("transaction failed: %w", err)
	// }
	return nil, nil
}

func (s *patchStore) getHeads(ctx context.Context, txn *badger.Txn, obj cid.Cid) ([]*p2p.PeerVersion, error) {
	_, ohash := ipfsutil.DecodeCID(obj)
	ouid, err := s.db.UIDReadOnly(txn, kindObjects, ohash)
	if err != nil && err != badger.ErrKeyNotFound {
		return nil, fmt.Errorf("failed to get head: %w", err)
	}

	if err == badger.ErrKeyNotFound {
		return nil, nil
	}

	var out []*p2p.PeerVersion

	it := s.db.ScanData(txn, badgerutil.PredicateWithUID(predPeersHeads, ouid), badgerutil.WithScanPrefetchSize(10))
	defer it.Close()

	for it.Rewind(); it.Valid(); it.Next() {
		h := &p2p.PeerVersion{}
		if err := it.Item().Value(badgerutil.DecodeProto(h)); err != nil {
			return nil, err
		}
		out = append(out, h)
	}

	return out, nil
}

func (s *patchStore) ReplicateFromHead(ctx context.Context, h *p2p.PeerVersion) error {
	exists, err := s.bs.Has(cid.Undef)

	if err != nil {
		return err
	}

	if exists {
		return nil
	}

	// Get local head.
	// Create buffer of size h.Seq - local seq.

	var blk blocks.Block
	// blk, err := s.exchange.Get(h.CID)
	// if err != nil {
	// 	return err
	// }

	sp, err := decodePatchBlock(blk)
	if err != nil {
		return err
	}

	_ = sp

	txn := s.db.NewTransaction(false)
	defer txn.Discard()

	if err := txn.Commit(); err != nil {
		return err
	}

	return nil
}

// Watch will notify the given channel when new patches get added to the store.
// Callers must make sure to drain the channels and not block for too long.
func (s *patchStore) Watch(c chan<- signedPatch) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.subs[c] = struct{}{}
}

// Unwatch will remove the given channel from the subscribers list in the store.
func (s *patchStore) Unwatch(c chan<- signedPatch) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.subs, c)
}
