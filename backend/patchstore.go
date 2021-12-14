package backend

import (
	"context"
	"errors"
	"fmt"
	"time"

	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/ipfs/sqlitebs"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
)

// nowFunc is overwritten in tests.
var nowFunc = func() time.Time {
	return nowTruncated()
}

type blockStore interface {
	Put(context.Context, blocks.Block) error
	Get(context.Context, cid.Cid) (blocks.Block, error)
}

type sqlitePatchStore struct {
	db *sqlitex.Pool
	bs blockStore
}

func newSQLitePatchStore(db *sqlitex.Pool, bs blockStore) (*sqlitePatchStore, error) {
	return &sqlitePatchStore{
		db: db,
		bs: bs,
	}, nil
}

func (s *sqlitePatchStore) AddPatch(ctx context.Context, sps ...signedPatch) (err error) {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return nil
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	for _, sp := range sps {
		// TODO: these upserts should not be needed.
		// We'll need to optimize when we fully migrated to SQLite.

		acodec, ahash := ipfs.DecodeCID(sp.Author)
		if err := accountsInsertOrIgnore(conn, ahash, int(acodec)); err != nil {
			return err
		}

		dcodec, dhash := ipfs.DecodeCID(sp.peer)
		if err := devicesInsertOrIgnore(conn, dhash, int(dcodec), ahash); err != nil {
			return err
		}

		ocodec, ohash := ipfs.DecodeCID(sp.ObjectID)
		if err := objectsInsertOrIgnore(conn, ohash, int(ocodec), ahash); err != nil {
			return err
		}

		bcodec, bhash := ipfs.DecodeCID(sp.blk.Cid())

		if err := s.bs.Put(sqlitebs.ContextWithConn(ctx, conn), sp.blk); err != nil {
			return err
		}

		if err := headsUpsert(conn, ohash, int(ocodec), dhash, int(sp.Seq), int(sp.LamportTime), bhash, int(bcodec)); err != nil {
			return err
		}

		if rows := conn.Changes(); rows != 1 {
			return fmt.Errorf("failed to insert change, probably wrong seq: %d", rows)
		}
	}

	return nil
}

func (s *sqlitePatchStore) StoreVersion(ctx context.Context, ver *p2p.Version) (err error) {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	oid, err := cid.Decode(ver.ObjectId)
	if err != nil {
		return err
	}

	ocodec, ohash := ipfs.DecodeCID(oid)
	if ocodec != codecAccountID && ocodec != codecDocumentFeed && ocodec != codecDocumentID {
		return fmt.Errorf("invalid object codec %s", cid.CodecToStr[ocodec])
	}

	for _, vv := range ver.VersionVector {
		did, err := cid.Decode(vv.Peer)
		if err != nil {
			return err
		}

		dcodec, dhash := ipfs.DecodeCID(did)
		if dcodec != cid.Libp2pKey {
			return fmt.Errorf("wrong codec for device in version %s", cid.CodecToStr[dcodec])
		}

		bid, err := cid.Decode(vv.Head)
		if err != nil {
			return err
		}

		bcodec, bhash := ipfs.DecodeCID(bid)
		if bcodec != cid.DagCBOR {
			return fmt.Errorf("wront codec for patch to be stored %s", cid.CodecToStr[bcodec])
		}

		acc, err := accountsGetForDevice(conn, dhash)
		if err != nil {
			return fmt.Errorf("failed to get account for device %s", vv.Peer)
		}

		if err := objectsInsertOrIgnore(conn, ohash, int(ocodec), acc.AccountsMultihash); err != nil {
			return err
		}

		if err := headsUpsert(conn, ohash, int(ocodec), dhash, int(vv.Seq), int(vv.LamportTime), bhash, int(bcodec)); err != nil {
			return err
		}

		// TODO: is this needed

		// if conn.Changes() != 1 {
		// 	return fmt.Errorf("failed to store version, something is missing")
		// }
	}

	return nil
}

var errNotFound = errors.New("not found")

func (s *sqlitePatchStore) LoadState(ctx context.Context, obj cid.Cid) (*changeset, error) {
	ver, err := s.GetObjectVersion(ctx, obj)
	if err == nil {
		// TODO: reuse connection to avoid saturating the pool.
		return resolvePatches(ctx, obj, ver, blockstoreGetter{blockstore: s.bs})
	}

	if err == errNotFound {
		return newChangeset(obj, nil), nil
	}

	return nil, err
}

func (s *sqlitePatchStore) InitObject(ctx context.Context, sp signedPermanode) (err error) {
	ocodec, ohash := ipfs.DecodeCID(sp.blk.Cid())
	if ocodec != codecDocumentID {
		panic("BUG: init object not document " + cid.CodecToStr[ocodec])
	}

	acodec, ahash := ipfs.DecodeCID(cid.Cid(sp.perma.AccountID))

	conn, ok := sqlitebs.ConnFromContext(ctx)
	if !ok {
		c, release, err := s.db.Conn(ctx)
		if err != nil {
			return err
		}
		defer release()
		conn = c
	}

	defer sqlitex.Save(conn)(&err)

	if err := accountsInsertOrIgnore(conn, ahash, int(acodec)); err != nil {
		return err
	}

	if err := objectsInsertOrIgnore(conn, ohash, int(ocodec), ahash); err != nil {
		return err
	}

	if err := s.bs.Put(sqlitebs.ContextWithConn(ctx, conn), sp.blk); err != nil {
		return err
	}

	return nil
}

func (s *sqlitePatchStore) GetObjectVersion(ctx context.Context, obj cid.Cid) (*p2p.Version, error) {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return s.getObjectVersion(ctx, conn, obj)
}

func (s *sqlitePatchStore) getObjectVersion(ctx context.Context, conn *sqlite.Conn, obj cid.Cid) (*p2p.Version, error) {
	ocodec, ohash := ipfs.DecodeCID(obj)

	rows, err := headsListForObject(conn, ohash, int(ocodec))
	if err != nil {
		return nil, err
	}
	if rows == nil {
		return nil, errNotFound
	}

	out := &p2p.Version{
		ObjectId:      obj.String(),
		VersionVector: make([]*p2p.PeerVersion, len(rows)),
	}

	for i, r := range rows {
		ver := &p2p.PeerVersion{
			Peer:        cid.NewCidV1(uint64(r.DevicesCodec), r.DevicesMultihash).String(),
			Head:        cid.NewCidV1(uint64(r.IPFSBlocksCodec), r.IPFSBlocksMultihash).String(),
			Seq:         uint64(r.HeadsSeq),
			LamportTime: uint64(r.HeadsLamportTime),
		}
		out.VersionVector[i] = ver
	}

	return out, nil
}
