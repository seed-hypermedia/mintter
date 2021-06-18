package backend

import (
	"context"
	"encoding/binary"
	"fmt"
	"time"

	p2p "mintter/api/go/p2p/v1alpha"
	"mintter/backend/badgergraph"

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
}

func newPatchStore(log *zap.Logger, bs blockstore.Blockstore, db *badgergraph.DB) (*patchStore, error) {
	return &patchStore{
		log: log,
		db:  db,
		bs:  &blockstoreGetter{bs},
	}, nil
}

func (s *patchStore) StoreVersion(ctx context.Context, obj cid.Cid, ver *p2p.Version) error {
	return s.db.Update(func(txn *badgergraph.Txn) error {
		ouid, err := txn.UID(typeObject, obj.Hash())
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
	if err := s.db.Update(func(txn *badgergraph.Txn) error {
		ouid, err := txn.UID(typeObject, sp.ObjectID.Hash())
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

		v, err := txn.GetProperty(huid, pHeadData.FullName())
		if err != nil && err != badger.ErrKeyNotFound {
			return err
		}

		if v == nil {
			head := &p2p.PeerVersion{
				Peer:        sp.peer.String(),
				Head:        sp.cid.String(),
				Seq:         sp.Seq,
				LamportTime: sp.LamportTime,
			}

			if err := txn.WriteTriple(huid, pHeadData, head); err != nil {
				return err
			}

			if err := txn.WriteTriple(huid, pHeadPeer, puid); err != nil {
				return fmt.Errorf("failed to store peer uid to head: %w", err)
			}

			if err := txn.WriteTriple(huid, pHeadObject, ouid); err != nil {
				return fmt.Errorf("failed to store object uid to head: %w", err)
			}

			return nil
		}

		pv := v.(*p2p.PeerVersion)

		if pv.Seq+1 != sp.Seq {
			return fmt.Errorf("concurrency error: precondition failed: stored seq = %d, incoming seq = %d", pv.Seq, sp.Seq)
		}

		oldHead, err := cid.Decode(pv.Head)
		if err != nil {
			return fmt.Errorf("failed to decode old head cid: %w", err)
		}

		if len(sp.Deps) > 0 && !sp.Deps[0].Equals(oldHead) {
			return fmt.Errorf("first dep of the patch must be the previous head of this peer")
		}

		pv.Seq = sp.Seq
		pv.LamportTime = sp.LamportTime
		pv.Head = sp.cid.String()

		if err := txn.WriteTriple(huid, pHeadData, pv); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return fmt.Errorf("failed to store head: %w", err)
	}

	if err := s.bs.Put(sp.blk); err != nil {
		return fmt.Errorf("failed to store patch block: %w", err)
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

	// TODO: fix this.

	// s.db.View(func(txn *badgergraph.Txn) error {
	// 	uids, err := txn.ListIndexedNodes(pCIDCodec.FullName(), []byte(cid.CodecToStr[codec]))
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
			uids, err := txn.ListIndexedNodes(badgergraph.NodeTypePredicate().FullName(), []byte(typeObject))
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
		VersionVector: out,
	}, nil
}

func (s *patchStore) getHeads(ctx context.Context, txn *badgergraph.Txn, obj cid.Cid) ([]*p2p.PeerVersion, error) {
	ouid, err := txn.UID(typeObject, obj.Hash())
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

func headXID(ouid, puid uint64) []byte {
	out := make([]byte, 8+8)
	binary.BigEndian.PutUint64(out, ouid)
	binary.BigEndian.PutUint64(out[8:], puid)
	return out
}
