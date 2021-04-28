package backend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"golang.org/x/sync/errgroup"

	blocks "github.com/ipfs/go-block-format"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	exchange "github.com/ipfs/go-ipfs-exchange-interface"
)

// nowFunc is overwritten in tests.
var nowFunc = func() time.Time {
	return time.Now().UTC()
}

type patchStore struct {
	k    crypto.PrivKey
	peer cid.Cid

	db       *db
	bs       blockstore.Blockstore
	exchange exchange.Interface

	mu   sync.RWMutex
	subs map[chan<- signedPatch]struct{}
}

func newPatchStore(k crypto.PrivKey, bs blockstore.Blockstore, db *db) (*patchStore, error) {
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

	ouid, err := s.db.uidFromCID(txn, sp.ObjectID, true)
	if err != nil {
		return err
	}

	puid, err := s.db.uidFromCID(txn, sp.peer, true)
	if err != nil {
		return err
	}

	headKey := makeCompoundPredicateKey(predicatePatchHead, ouid, puid)

	var h head
	{
		item, err := txn.Get(headKey)
		switch err {
		case nil:
			if err := item.Value(func(data []byte) error {
				return json.Unmarshal(data, &h)
			}); err != nil {
				return err
			}
		case badger.ErrKeyNotFound:
			// Leave head with 0 value.
		default:
			return err
		}
	}

	if h.Seq+1 != sp.Seq {
		return fmt.Errorf("concurrency error: precondition failed: stored seq = %d, incoming seq = %d", h.Seq, sp.Seq)
	}

	if len(sp.Deps) > 0 {
		if !sp.Deps[0].Equals(h.CID) {
			return fmt.Errorf("first dep must be previous head of this peer")
		}
	}

	// TODO: use the same txn to store blocks.
	if err := s.bs.Put(sp.blk); err != nil {
		return fmt.Errorf("failed to put patch in blockstore: %w", err)
	}

	h.CID = sp.cid
	h.Seq = sp.Seq
	h.LamportTime = sp.LamportTime

	newHead, err := json.Marshal(h)
	if err != nil {
		return err
	}

	if err := txn.Set(headKey, newHead); err != nil {
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
	txn := s.db.NewTransaction(false)
	defer txn.Discard()

	heads, err := s.getHeads(ctx, txn, obj)
	if err != nil {
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
			next := h.CID
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

func (s *patchStore) getHeads(ctx context.Context, txn *badger.Txn, obj cid.Cid) ([]head, error) {
	ouid, err := s.db.uidFromCID(txn, obj, false)
	if err != nil && err != badger.ErrKeyNotFound {
		return nil, err
	}

	if err == badger.ErrKeyNotFound {
		return nil, nil
	}

	var out []head

	opts := badger.DefaultIteratorOptions
	opts.PrefetchSize = 10
	opts.Prefix = makeCompoundPredicatePrefix(predicatePatchHead, ouid)
	it := txn.NewIterator(opts)
	defer it.Close()

	for it.Rewind(); it.Valid(); it.Next() {
		item := it.Item()
		if err := item.Value(func(data []byte) error {
			var h head
			if err := json.Unmarshal(data, &h); err != nil {
				return err
			}
			out = append(out, h)
			return nil
		}); err != nil {
			return nil, err
		}
	}

	return out, nil
}

func (s *patchStore) ReplicateFromHead(ctx context.Context, h head) error {
	exists, err := s.bs.Has(h.CID)
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

func makePrefixHead(obj cid.Cid) []byte {
	var b bytes.Buffer
	b.WriteString("mtt/objects/")
	b.Write(obj.Bytes())
	return b.Bytes()
}

func makeKeyHead(obj, peer cid.Cid) []byte {
	var b bytes.Buffer
	b.WriteString("mtt/objects/")
	b.Write(obj.Bytes())
	b.WriteString("/peers/")
	b.Write(peer.Bytes())
	return b.Bytes()
}

type head struct {
	Peer        cid.Cid
	CID         cid.Cid
	Seq         uint64
	LamportTime uint64
}

type patchIndexItem struct {
	Seq         uint64
	LamportTime uint64
	CID         cid.Cid
}
