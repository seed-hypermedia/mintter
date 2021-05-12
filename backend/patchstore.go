package backend

import (
	"context"
	"encoding/binary"
	"fmt"
	"sync"
	"time"

	p2p "mintter/api/go/p2p/v1alpha"
	"mintter/backend/badgergraph"
	"mintter/backend/ipfsutil"

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

	db       *badgergraph.DB
	bs       blockstore.Blockstore
	exchange exchange.Interface

	mu   sync.RWMutex
	subs map[chan<- signedPatch]struct{}
}

func newPatchStore(k crypto.PrivKey, bs blockstore.Blockstore, db *badgergraph.DB) (*patchStore, error) {
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

func encodeCodec(codec uint64) []byte {
	out := make([]byte, 8)
	binary.BigEndian.PutUint64(out, codec)
	return out
}

func (s *patchStore) AddPatch(ctx context.Context, sp signedPatch) error {
	txn := s.db.NewTransaction(true)
	defer txn.Discard()

	ocodec, ohash := ipfsutil.DecodeCID(sp.ObjectID)
	_, phash := ipfsutil.DecodeCID(sp.peer)

	ouid, err := txn.UID(typeObject, ohash)
	if err != nil {
		return err
	}

	if _, err := txn.GetProperty(ouid, predicateObjectType); err == badger.ErrKeyNotFound {
		if err := txn.SetProperty(ouid, predicateObjectType, encodeCodec(ocodec), true); err != nil {
			return err
		}
	}

	puid, err := txn.UID(typePeer, phash)
	if err != nil {
		return err
	}

	hxid := headXID(ouid, puid)
	huid, err := txn.UID(typeHead, hxid)
	if err != nil {
		return fmt.Errorf("failed to get uid for head: %w", err)
	}

	var h *p2p.PeerVersion
	var newHead bool
	v, err := txn.GetProperty(huid, predicateHeadData)
	switch err {
	case nil:
		h = v.(*p2p.PeerVersion)
	case badger.ErrKeyNotFound:
		h = &p2p.PeerVersion{}
		newHead = true
	default:
		return fmt.Errorf("failed to get head: %w", err)
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

	if err := txn.SetProperty(huid, predicateHeadData, h, false); err != nil {
		return fmt.Errorf("failed to store new head: %w", err)
	}

	if newHead {
		if err := txn.SetRelation(huid, predicateHeadPeerUID, puid, true); err != nil {
			return fmt.Errorf("failed to store peer uid to head: %w", err)
		}

		if err := txn.SetRelation(huid, predicateHeadObjectUID, ouid, true); err != nil {
			return fmt.Errorf("failed to store object uid to head: %w", err)
		}
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

func headXID(ouid, puid uint64) []byte {
	out := make([]byte, 8+8)
	binary.BigEndian.PutUint64(out, ouid)
	binary.BigEndian.PutUint64(out[8:], puid)
	return out
}

func (s *patchStore) LoadState(ctx context.Context, obj cid.Cid) (*state, error) {
	var heads []*p2p.PeerVersion
	if err := s.db.View(func(txn *badgergraph.Txn) error {
		var err error
		heads, err = s.getHeads(ctx, txn, obj)
		return err
	}); err != nil && err != badger.ErrKeyNotFound {
		return nil, fmt.Errorf("failed to get heads: %w", err)
	}

	if heads == nil {
		return newState(obj, nil), nil
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

// ListObjects allows to list object CIDs of a particular type.
// The type of the object is encoded in its CID multicodec when object is created.
func (s *patchStore) ListObjects(ctx context.Context, codec uint64) ([]cid.Cid, error) {
	var out []cid.Cid
	s.db.View(func(txn *badgergraph.Txn) error {
		uids, err := txn.ListIndexedNodes(predicateObjectType, encodeCodec(codec))
		if err != nil {
			return fmt.Errorf("failed to list objects with type %v: %w", codec, err)
		}

		out = make([]cid.Cid, len(uids))
		for i, u := range uids {
			ohash, err := txn.XID(typeObject, u)
			if err != nil {
				return fmt.Errorf("failed to find xid for object with uid %d: %w", u, err)
			}
			out[i] = cid.NewCidV1(codec, ohash)
		}
		return nil
	})

	return out, nil
}

func (s *patchStore) getHeads(ctx context.Context, txn *badgergraph.Txn, obj cid.Cid) ([]*p2p.PeerVersion, error) {
	_, ohash := ipfsutil.DecodeCID(obj)

	ouid, err := txn.UID(typeObject, ohash)
	if err != nil && err != badger.ErrKeyNotFound {
		return nil, fmt.Errorf("failed to get head: %w", err)
	}
	if err != nil {
		return nil, err
	}

	heads, err := txn.ListReverseRelations(predicateHeadObjectUID, ouid)
	if err != nil {
		return nil, fmt.Errorf("no reverse relation Head -> Peer: %w", err)
	}

	out := make([]*p2p.PeerVersion, len(heads))

	for i, h := range heads {
		v, err := txn.GetProperty(h, predicateHeadData)
		if err != nil {
			return nil, fmt.Errorf("failed to get property %s: %w", predicateHeadData, err)
		}
		out[i] = v.(*p2p.PeerVersion)
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
