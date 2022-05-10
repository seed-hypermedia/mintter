package vcs

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs"
	"mintter/backend/ipfs/sqlitebs"
	"mintter/backend/vcs/vcssql"
	"sort"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

// SQLite is a VCS backed by a SQLite database.
type SQLite struct {
	db *sqlitex.Pool
	bs blockstore.Blockstore
}

func New(db *sqlitex.Pool) *SQLite {
	var bs blockstore.Blockstore
	var err error
	bs = sqlitebs.New(db, sqlitebs.Config{
		TableName:       string(sqliteschema.IPFSBlocks),
		ColumnMultihash: string(sqliteschema.IPFSBlocksMultihash.ShortName()),
		ColumnCodec:     string(sqliteschema.IPFSBlocksCodec.ShortName()),
		ColumnData:      string(sqliteschema.IPFSBlocksData.ShortName()),
	})
	bs, err = blockstore.CachedBlockstore(context.Background(), bs, blockstore.DefaultCacheOpts())
	if err != nil {
		panic(err)
	}

	return &SQLite{db: db, bs: bs}
}

func (s *SQLite) IterateChanges(ctx context.Context, oid ObjectID, v Version, fn func(Change) error) error {
	queue := v.CIDs()

	visited := make(map[cid.Cid]Change)

	for len(queue) > 0 {
		last := len(queue) - 1
		id := queue[last]
		queue = queue[:last]

		if _, ok := visited[id]; ok {
			continue
		}

		blk, err := s.bs.Get(ctx, id)
		if err != nil {
			return err
		}

		var sc SignedCBOR[Change]
		if err := cbornode.DecodeInto(blk.RawData(), &sc); err != nil {
			return err
		}
		visited[id] = sc.Payload

		for _, p := range sc.Payload.Parents {
			queue = append(queue, p)
		}
	}

	out := make([]Change, len(visited))
	var i int
	for _, c := range visited {
		out[i] = c
		i++
	}

	sort.Slice(out, func(i, j int) bool {
		return out[i].LamportTime < out[j].LamportTime
	})

	for _, c := range out {
		if err := fn(c); err != nil {
			return err
		}
	}

	return nil
}

var errNotFound = errors.New("not found")

// LoadWorkingCopy loads a working copy from the database.
func (s *SQLite) LoadWorkingCopy(ctx context.Context, oid ObjectID, name string) (WorkingCopy, error) {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return WorkingCopy{}, err
	}
	defer release()

	dboid, err := s.lookupObjectID(conn, oid)
	if err != nil {
		return WorkingCopy{}, fmt.Errorf("failed to lookup object ID: %w", err)
	}

	res, err := vcssql.WorkingCopyGet(conn, dboid, name)
	if err != nil {
		return WorkingCopy{}, fmt.Errorf("failed to get working copy from database: %w", err)
	}

	if res.WorkingCopyCreateTime == 0 {
		return WorkingCopy{}, errNotFound
	}

	ver, err := DecodeVersion(res.WorkingCopyVersion)
	if err != nil {
		return WorkingCopy{}, fmt.Errorf("failed to decode working copy version %s: %w", res.WorkingCopyVersion, err)
	}

	// Sometimes empty but non-nil slice is returned.

	var data []byte
	if len(res.WorkingCopyData) == 0 {
		data = nil
	} else {
		data = res.WorkingCopyData
	}

	return WorkingCopy{
		oid:        oid,
		name:       name,
		ver:        ver,
		data:       data,
		createTime: time.Unix(int64(res.WorkingCopyCreateTime), 0).UTC(),
		updateTime: time.Unix(int64(res.WorkingCopyUpdateTime), 0).UTC(),
	}, nil
}

// RemoveWorkingCopy removes a working copy from the database.
func (s *SQLite) RemoveWorkingCopy(ctx context.Context, o ObjectID, name string) error {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	oid, err := s.lookupObjectID(conn, o)
	if err != nil {
		return err
	}

	if err := vcssql.WorkingCopyDelete(conn, oid, name); err != nil {
		return err
	}

	return nil
}

// SaveWorkingCopy saves a working copy to the database.
func (s *SQLite) SaveWorkingCopy(ctx context.Context, wc WorkingCopy) error {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	oid, err := s.lookupObjectID(conn, wc.oid)
	if err != nil {
		return err
	}

	// TODO: implement optimistic concurrency control here.

	if err := vcssql.WorkingCopyReplace(conn, oid, "main", wc.ver.String(), wc.Data(), int(wc.createTime.Unix()), int(wc.updateTime.Unix())); err != nil {
		return err
	}

	return nil
}

func (s *SQLite) RecordChange(ctx context.Context, oid ObjectID, id core.Identity, oldVer Version, kind string, body []byte) (RecordedChange, error) {
	c := Change{
		Type:        ChangeType,
		Object:      oid,
		Author:      id.AccountID(),
		Parents:     oldVer.CIDs(),
		LamportTime: oldVer.TotalCount() + 1,
		Body:        body,
		Kind:        kind,
		CreateTime:  time.Now().UTC().Round(time.Second),
	}

	signed, err := NewSignedCBOR(c, id.DeviceKey())
	if err != nil {
		return RecordedChange{}, err
	}

	data, err := cbornode.DumpObject(signed)
	if err != nil {
		return RecordedChange{}, fmt.Errorf("failed to encode signed change: %w", err)
	}

	blk := ipfs.NewBlock(cid.DagCBOR, data)
	if err != nil {
		return RecordedChange{}, err
	}

	if err := s.bs.Put(ctx, blk); err != nil {
		return RecordedChange{}, fmt.Errorf("failed to store change IPLD block: %w", err)
	}

	return RecordedChange{ID: blk.Cid(), Change: c}, nil
}

func (s *SQLite) StoreNamedVersion(ctx context.Context, o ObjectID, id core.Identity, name string, v Version) error {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	oid, err := s.lookupObjectID(conn, o)
	if err != nil {
		return err
	}

	aid, err := s.lookupAccountID(conn, id.AccountID())
	if err != nil {
		return err
	}

	did, err := s.lookupDeviceID(conn, id.DeviceKey().CID())
	if err != nil {
		return err
	}

	if err := vcssql.NamedVersionsReplace(conn, oid, aid, did, name, v.String()); err != nil {
		return err
	}

	return nil
}

func (s *SQLite) LoadNamedVersion(ctx context.Context, o ObjectID, account cid.Cid, device cid.Cid, name string) (Version, error) {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return Version{}, err
	}
	defer release()

	oid, err := s.lookupObjectID(conn, o)
	if err != nil {
		return Version{}, err
	}

	aid, err := s.lookupAccountID(conn, account)
	if err != nil {
		return Version{}, err
	}

	did, err := s.lookupDeviceID(conn, device)
	if err != nil {
		return Version{}, err
	}

	res, err := vcssql.NamedVersionsGet(conn, oid, aid, did, name)
	if err != nil {
		return Version{}, err
	}

	if res.NamedVersionsVersion == "" {
		return Version{}, fmt.Errorf("not found version named %s for object %s", name, o)
	}

	ver, err := DecodeVersion(res.NamedVersionsVersion)
	if err != nil {
		return Version{}, fmt.Errorf("failed to decode named version: %w", err)
	}

	return ver, nil
}

func (s *SQLite) StorePermanode(ctx context.Context, blk EncodedBlock[Permanode]) error {
	if err := s.bs.Put(ctx, blk); err != nil {
		return err
	}

	// ocodec, ohash := ipfs.DecodeCID(blk.Cid())

	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	// Ensure account exists.
	aid, err := s.lookupAccountID(conn, blk.Value.PermanodeOwner())
	if err != nil {
		return err
	}

	ocodec, ohash := ipfs.DecodeCID(blk.Cid())

	if err := vcssql.ObjectsInsertOrIgnore(conn, ohash, int(ocodec), aid); err != nil {
		return err
	}

	return nil
}

func (s *SQLite) DeletePermanode(ctx context.Context, c cid.Cid) error {
	if err := s.bs.DeleteBlock(ctx, c); err != nil {
		return err
	}

	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	ocodec, ohash := ipfs.DecodeCID(c)

	return vcssql.ObjectsDelete(conn, ohash, int(ocodec))
}

func (s *SQLite) LoadPermanode(ctx context.Context, c cid.Cid, v Permanode) error {
	blk, err := s.bs.Get(ctx, c)
	if err != nil {
		return err
	}

	if err := cbornode.DecodeInto(blk.RawData(), v); err != nil {
		return err
	}

	return nil
}

func (s *SQLite) lookupObjectID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	ocodec, ohash := ipfs.DecodeCID(c)

	res, err := vcssql.ObjectsLookupPK(conn, ohash, int(ocodec))
	if err != nil {
		return 0, err
	}

	if res.ObjectsID != 0 {
		return res.ObjectsID, nil
	}

	insert, err := vcssql.ObjectsInsertPK(conn, ohash, int(ocodec))
	if err != nil {
		return 0, err
	}

	if insert.ObjectsID == 0 {
		return 0, fmt.Errorf("failed to insert account")
	}

	return insert.ObjectsID, nil
}

func (s *SQLite) lookupAccountID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	ocodec, ohash := ipfs.DecodeCID(c)

	res, err := vcssql.AccountsLookupPK(conn, ohash, int(ocodec))
	if err != nil {
		return 0, err
	}

	if res.AccountsID != 0 {
		return res.AccountsID, nil
	}

	insert, err := vcssql.AccountsInsertPK(conn, ohash, int(ocodec))
	if err != nil {
		return 0, err
	}

	if insert.AccountsID == 0 {
		return 0, fmt.Errorf("failed to insert account")
	}

	return insert.AccountsID, nil
}

func (s *SQLite) lookupDeviceID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	ocodec, ohash := ipfs.DecodeCID(c)

	res, err := vcssql.DevicesLookupPK(conn, ohash, int(ocodec))
	if err != nil {
		return 0, err
	}

	if res.DevicesID != 0 {
		return res.DevicesID, nil
	}

	insert, err := vcssql.DevicesInsertPK(conn, ohash, int(ocodec))
	if err != nil {
		return 0, err
	}

	if insert.DevicesID == 0 {
		return 0, fmt.Errorf("failed to insert account")
	}

	return insert.DevicesID, nil
}
