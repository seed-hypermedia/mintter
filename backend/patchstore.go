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
	"github.com/multiformats/go-multihash"

	blockstore "github.com/ipfs/go-ipfs-blockstore"
)

// nowFunc is overwritten in tests.
var nowFunc = func() time.Time {
	return time.Now().UTC()
}

type patchStore struct {
	db *badgergraph.DB
	bs *blockstoreGetter

	mu   sync.RWMutex
	subs map[chan<- signedPatch]struct{}
}

func newPatchStore(bs blockstore.Blockstore, db *badgergraph.DB) (*patchStore, error) {
	return &patchStore{
		db:   db,
		bs:   &blockstoreGetter{bs},
		subs: make(map[chan<- signedPatch]struct{}),
	}, nil
}

func (s *patchStore) StoreVersion(ctx context.Context, obj cid.Cid, ver *p2p.Version) error {
	return s.db.Update(func(txn *badgergraph.Txn) error {
		ocodec, ohash := ipfsutil.DecodeCID(obj)

		ouid, err := uidForCID(txn, ocodec, ohash)
		if err != nil {
			return err
		}

		for _, pv := range ver.VersionVector {
			peer, err := cid.Decode(pv.Peer)
			if err != nil {
				return fmt.Errorf("failed to decode version peer %s: %w", pv.Peer, err)
			}

			pcodec, phash := ipfsutil.DecodeCID(peer)

			puid, err := uidForCID(txn, pcodec, phash)
			if err != nil {
				return err
			}

			hxid := headXID(ouid, puid)
			huid, err := txn.UID(typeHead, hxid)
			if err != nil {
				return err
			}

			v, err := txn.GetProperty(huid, pHeadData.FullName())
			if err != nil && err != badger.ErrKeyNotFound {
				return fmt.Errorf("failed to get head: %w", err)
			}

			// We avoid storing data that's older than we have, or if it's the same.
			if v != nil && v.(*p2p.PeerVersion).Seq >= pv.Seq {
				continue
			}

			// The first time we store a head we also write its peer and object relations.
			if v == nil {
				if err := txn.WriteTriple(huid, pHeadPeer, puid); err != nil {
					return fmt.Errorf("failed to store peer uid to head: %w", err)
				}

				if err := txn.WriteTriple(huid, pHeadObject, ouid); err != nil {
					return fmt.Errorf("failed to store object uid to head: %w", err)
				}
			}

			if err := txn.WriteTriple(huid, pHeadData, pv); err != nil {
				return fmt.Errorf("failed to store new head: %w", err)
			}
		}

		return nil
	})
}

func (s *patchStore) AddPatch(ctx context.Context, sp signedPatch) error {
	txn := s.db.NewTransaction(true)
	defer txn.Discard()

	ocodec, ohash := ipfsutil.DecodeCID(sp.ObjectID)
	pcodec, phash := ipfsutil.DecodeCID(sp.peer)

	ouid, err := uidForCID(txn, ocodec, ohash)
	if err != nil {
		return fmt.Errorf("failed to get UID for object: %w", err)
	}

	puid, err := uidForCID(txn, pcodec, phash)
	if err != nil {
		return fmt.Errorf("failed to get UID for peer: %w", err)
	}

	hxid := headXID(ouid, puid)
	huid, err := txn.UID(typeHead, hxid)
	if err != nil {
		return fmt.Errorf("failed to get uid for head: %w", err)
	}

	var h *p2p.PeerVersion
	var newHead bool
	v, err := txn.GetProperty(huid, pHeadData.FullName())
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

	if len(sp.Deps) > 0 && !sp.Deps[0].Equals(headCID) {
		return fmt.Errorf("first dep must be previous head of this peer")
	}

	// TODO: use the same txn to store blocks.
	if err := s.bs.Put(sp.blk); err != nil {
		return fmt.Errorf("failed to put patch in blockstore: %w", err)
	}

	h.Peer = sp.peer.String()
	h.Head = sp.cid.String()
	h.Seq = sp.Seq
	h.LamportTime = sp.LamportTime

	if err := txn.WriteTriple(huid, pHeadData, h); err != nil {
		return fmt.Errorf("failed to store new head: %w", err)
	}

	if newHead {
		if err := txn.WriteTriple(huid, pHeadPeer, puid); err != nil {
			return fmt.Errorf("failed to store peer uid to head: %w", err)
		}

		if err := txn.WriteTriple(huid, pHeadObject, ouid); err != nil {
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

func (s *patchStore) LoadState(ctx context.Context, obj cid.Cid) (*state, error) {
	ver, err := s.GetObjectVersion(ctx, obj)
	if err != nil {
		return nil, fmt.Errorf("failed to get object version: %w", err)
	}

	return resolvePatches(ctx, obj, ver, s.bs)
}

// ListObjects allows to list object CIDs of a particular type.
// The type of the object is encoded in its CID multicodec when object is created.
func (s *patchStore) ListObjects(ctx context.Context, codec uint64) ([]cid.Cid, error) {
	var out []cid.Cid
	s.db.View(func(txn *badgergraph.Txn) error {
		uids, err := txn.ListIndexedNodes(pCIDCodec.FullName(), []byte(cid.CodecToStr[codec]))
		if err != nil {
			return fmt.Errorf("failed to list objects with type %v: %w", codec, err)
		}

		out = make([]cid.Cid, len(uids))
		for i, u := range uids {
			ohash, err := txn.XID(typeCID, u)
			if err != nil {
				return fmt.Errorf("failed to find xid for object with uid %d: %w", u, err)
			}
			out[i] = cid.NewCidV1(codec, ohash)
		}
		return nil
	})

	return out, nil
}

// GetObjectVersion retrieves peer versions for a given object ID.
func (s *patchStore) GetObjectVersion(ctx context.Context, obj cid.Cid) (*p2p.Version, error) {
	var out []*p2p.PeerVersion

	if err := s.db.View(func(txn *badgergraph.Txn) error {
		versions, err := s.getHeads(ctx, txn, obj)
		out = versions
		return err
	}); err != nil && err != badger.ErrKeyNotFound {
		return nil, err
	}

	return &p2p.Version{
		VersionVector: out,
	}, nil
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

func (s *patchStore) getHeads(ctx context.Context, txn *badgergraph.Txn, obj cid.Cid) ([]*p2p.PeerVersion, error) {
	_, ohash := ipfsutil.DecodeCID(obj)

	ouid, err := txn.UID(typeCID, ohash)
	if err != nil && err != badger.ErrKeyNotFound {
		return nil, fmt.Errorf("failed to get head: %w", err)
	}
	if err != nil {
		return nil, err
	}

	heads, err := txn.ListReverseRelations(pHeadObject.FullName(), ouid)
	if err != nil {
		return nil, fmt.Errorf("no reverse relation Head -> Peer: %w", err)
	}

	out := make([]*p2p.PeerVersion, len(heads))

	for i, h := range heads {
		v, err := txn.GetProperty(h, pHeadData.FullName())
		if err != nil {
			return nil, fmt.Errorf("failed to get property %s: %w", pHeadData.FullName(), err)
		}
		out[i] = v.(*p2p.PeerVersion)
	}

	return out, nil
}

func uidForCID(txn *badgergraph.Txn, codec uint64, hash multihash.Multihash) (uint64, error) {
	uid, err := txn.UIDRead(typeCID, hash)
	if err == nil {
		return uid, nil
	}

	if err != badger.ErrKeyNotFound {
		return 0, err
	}

	uid, err = txn.UIDAllocate(typeCID, hash)
	if err != nil {
		return 0, fmt.Errorf("failed to allocate uid: %w", err)
	}

	if err := txn.WriteTriple(uid, pCIDCodec, cid.CodecToStr[codec]); err != nil {
		return 0, fmt.Errorf("failed to set cid codec triple: %w", err)
	}

	return uid, nil
}

func headXID(ouid, puid uint64) []byte {
	out := make([]byte, 8+8)
	binary.BigEndian.PutUint64(out, ouid)
	binary.BigEndian.PutUint64(out[8:], puid)
	return out
}
