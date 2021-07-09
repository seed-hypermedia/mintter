package backend

import (
	"context"
	"encoding/binary"
	"fmt"
	"sync"
	"time"

	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/badgergraph"
	"mintter/backend/ipfsutil"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
	"go.uber.org/zap"

	blockstore "github.com/ipfs/go-ipfs-blockstore"
)

// nowFunc is overwritten in tests.
var nowFunc = func() time.Time {
	return time.Now().UTC()
}

type patchStore struct {
	log *zap.Logger
	db  *badgergraph.DB
	bs  *blockstoreGetter

	watchMu  sync.RWMutex
	watchers map[chan<- headUpdated]struct{}
}

func newPatchStore(log *zap.Logger, bs blockstore.Blockstore, db *badgergraph.DB) (*patchStore, error) {
	return &patchStore{
		log: log,
		db:  db,
		bs:  &blockstoreGetter{bs},
	}, nil
}

func (s *patchStore) UpsertObjectID(ctx context.Context, obj cid.Cid) (uint64, error) {
	var uid uint64
	return uid, s.db.Update(func(txn *badgergraph.Txn) error {
		var err error
		uid, err = s.registerObject(txn, obj)
		return err
	})
}

func (s *patchStore) StoreVersion(ctx context.Context, obj cid.Cid, ver *p2p.Version) error {
retry:
	notif := make([]*p2p.PeerVersion, 0, len(ver.VersionVector))
	err := s.db.Update(func(txn *badgergraph.Txn) error {
		ouid, err := s.registerObject(txn, obj)
		if err != nil {
			return err
		}

		for _, pv := range ver.VersionVector {
			peer, err := cid.Decode(pv.Peer)
			if err != nil {
				return fmt.Errorf("failed to decode version peer %s: %w", pv.Peer, err)
			}

			puid, err := txn.UID(typePeer, peer.Hash())
			if err != nil {
				return err
			}

			hxid := headXID(ouid, puid)
			huid, err := txn.UID(typeHead, hxid)
			if err != nil {
				return err
			}

			oldpv := &p2p.PeerVersion{}
			if err := txn.GetPropertyProto(huid, pHeadData, oldpv); err != nil && err != badger.ErrKeyNotFound {
				return fmt.Errorf("failed to get head: %w", err)
			}

			// We avoid storing data that's older than we have, or if it's the same.
			if oldpv.Seq >= pv.Seq {
				continue
			}

			// The first time we store a head we also write its peer and object relations.
			if oldpv.Seq == 0 {
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

			notif = append(notif, pv)
		}

		return nil
	})
	if err == nil {
		for _, pv := range notif {
			s.notify(ctx, headUpdated{
				obj: obj,
				pv:  pv,
			})
		}
		return nil
	}

	if err == badger.ErrConflict {
		goto retry
	}

	return fmt.Errorf("failed to commit transaction: %w", err)
}

func (s *patchStore) AddPatch(ctx context.Context, sp signedPatch) error {
	var newHead *p2p.PeerVersion
	if err := s.db.Update(func(txn *badgergraph.Txn) error {
		ouid, err := s.registerObject(txn, sp.ObjectID)
		if err != nil {
			return err
		}

		puid, err := txn.UID(typePeer, sp.peer.Hash())
		if err != nil {
			return err
		}

		hxid := headXID(ouid, puid)
		huid, err := txn.UID(typeHead, hxid)
		if err != nil {
			return err
		}

		oldpv := &p2p.PeerVersion{}
		if err := txn.GetPropertyProto(huid, pHeadData, oldpv); err != nil && err != badger.ErrKeyNotFound {
			return err
		}

		if oldpv.Seq == 0 {
			oldpv.Peer = sp.peer.String()
			oldpv.Head = sp.cid.String()
			oldpv.Seq = sp.Seq
			oldpv.LamportTime = sp.LamportTime

			if err := txn.WriteTriple(huid, pHeadData, oldpv); err != nil {
				return err
			}

			if err := txn.WriteTriple(huid, pHeadPeer, puid); err != nil {
				return fmt.Errorf("failed to store peer uid to head: %w", err)
			}

			if err := txn.WriteTriple(huid, pHeadObject, ouid); err != nil {
				return fmt.Errorf("failed to store object uid to head: %w", err)
			}

			newHead = oldpv

			return nil
		}

		if oldpv.Seq+1 != sp.Seq {
			return fmt.Errorf("concurrency error: precondition failed: stored seq = %d, incoming seq = %d", oldpv.Seq, sp.Seq)
		}

		oldHead, err := cid.Decode(oldpv.Head)
		if err != nil {
			return fmt.Errorf("failed to decode old head cid: %w", err)
		}

		if len(sp.Deps) > 0 && !sp.Deps[0].Equals(oldHead) {
			return fmt.Errorf("first dep of the patch must be the previous head of this peer")
		}

		oldpv.Seq = sp.Seq
		oldpv.LamportTime = sp.LamportTime
		oldpv.Head = sp.cid.String()

		if err := txn.WriteTriple(huid, pHeadData, oldpv); err != nil {
			return err
		}

		newHead = oldpv

		return nil
	}); err != nil {
		return fmt.Errorf("failed to store head: %w", err)
	}

	if err := s.bs.Put(sp.blk); err != nil {
		return fmt.Errorf("failed to store patch block: %w", err)
	}

	s.notify(ctx, headUpdated{
		obj: sp.ObjectID,
		pv:  newHead,
	})

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

	// TODO: fix this.

	// s.db.View(func(txn *badgergraph.Txn) error {
	// 	uids, err := txn.ListIndexedNodes(pCIDCodec, []byte(cid.CodecToStr[codec]))
	// 	if err != nil {
	// 		return fmt.Errorf("failed to list objects with type %v: %w", codec, err)
	// 	}

	// 	out = make([]cid.Cid, len(uids))
	// 	for i, u := range uids {
	// 		ohash, err := txn.XID(typeCID, u)
	// 		if err != nil {
	// 			return fmt.Errorf("failed to find xid for object with uid %d: %w", u, err)
	// 		}
	// 		out[i] = cid.NewCidV1(codec, ohash)
	// 	}
	// 	return nil
	// })

	return out, nil
}

// AllObjectsChan returns a channel that would receive CIDs of all the known objects.
// This can be used to provide the items on the DHT.
func (s *patchStore) AllObjectsChan(ctx context.Context) (<-chan cid.Cid, error) {
	c := make(chan cid.Cid)

	go func() {
		defer close(c)

		if err := s.db.View(func(txn *badgergraph.Txn) error {
			uids, err := txn.ListNodesOfType(typeObject)
			if err != nil {
				return err
			}

			for _, u := range uids {
				hash, err := txn.XID(typeObject, u)
				if err != nil {
					return err
				}

				// TODO(burdiyan): we use raw codec here, although it's not really correct.
				// Due to the fact that we only store hashes now, we loose some info here.
				// But the thing is that DHT and other IPFS internals are doing the same thing.
				// DHT requires a channel of CIDs, even though it only uses hashes later on.
				// Weird stuff. We probably should store some data that would help us recover
				// the correct codec here, so that if something changes inside IPFS we don't get hurt.
				c <- cid.NewCidV1(cid.Raw, hash)
			}

			return nil
		}); err != nil {
			s.log.Error("AllObjectsChanFailed", zap.Error(err))
		}
	}()

	return c, nil
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
		ObjectId:      obj.String(),
		VersionVector: out,
	}, nil
}

func (s *patchStore) Notify(c chan<- headUpdated) {
	s.watchMu.Lock()
	defer s.watchMu.Unlock()
	if s.watchers == nil {
		s.watchers = make(map[chan<- headUpdated]struct{})
	}
	s.watchers[c] = struct{}{}
}

func (s *patchStore) StopNotify(c chan<- headUpdated) {
	s.watchMu.Lock()
	defer s.watchMu.Unlock()
	delete(s.watchers, c)
}

func (s *patchStore) notify(ctx context.Context, evt headUpdated) {
	s.watchMu.RLock()
	defer s.watchMu.RUnlock()

	if s.watchers == nil {
		return
	}

	for c := range s.watchers {
		select {
		case <-ctx.Done():
			return
		case c <- evt:
		}
	}
}

type headUpdated struct {
	obj cid.Cid
	pv  *p2p.PeerVersion
}

func (s *patchStore) registerObject(txn *badgergraph.Txn, c cid.Cid) (uint64, error) {
	codec, _ := ipfsutil.DecodeCID(c)
	uid, err := txn.UID(typeObject, c.Bytes())
	if err != nil {
		return 0, fmt.Errorf("failed to allocate uid for object: %w", err)
	}

	has, err := txn.HasProperty(uid, pObjectType)
	if err != nil {
		return 0, fmt.Errorf("failed to check object type property: %w", err)
	}

	if !has {
		if err := txn.WriteTriple(uid, pObjectType, cid.CodecToStr[codec]); err != nil {
			return 0, fmt.Errorf("failed to store object type: %w", err)
		}
	}

	return uid, nil
}

func (s *patchStore) getHeads(ctx context.Context, txn *badgergraph.Txn, obj cid.Cid) ([]*p2p.PeerVersion, error) {
	ouid, err := txn.UIDRead(typeObject, obj.Bytes())
	if err != nil && err != badger.ErrKeyNotFound {
		return nil, fmt.Errorf("failed to get head: %w", err)
	}
	if err != nil {
		return nil, err
	}

	heads, err := txn.ListReverseRelations(pHeadObject, ouid)
	if err != nil {
		return nil, fmt.Errorf("no reverse relation Head -> Peer: %w", err)
	}

	out := make([]*p2p.PeerVersion, len(heads))

	for i, h := range heads {
		out[i] = &p2p.PeerVersion{}
		if err := txn.GetPropertyProto(h, pHeadData, out[i]); err != nil {
			return nil, fmt.Errorf("failed to get property %s: %w", pHeadData, err)
		}
	}

	return out, nil
}

func headXID(ouid, puid uint64) []byte {
	out := make([]byte, 8+8)
	binary.BigEndian.PutUint64(out, ouid)
	binary.BigEndian.PutUint64(out[8:], puid)
	return out
}
