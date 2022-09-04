package vcs

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/ipfs"
	"mintter/backend/vcs/vcssql"
	"sort"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

// SQLite is a VCS backed by a SQLite database.
type SQLite struct {
	db *sqlitex.Pool
	bs *blkStore
}

func New(db *sqlitex.Pool) *SQLite {
	var err error
	bs := newBlockstore(db)
	// bs, err = blockstore.CachedBlockstore(context.Background(), bs, blockstore.DefaultCacheOpts())
	// if err != nil {
	// 	panic(err)
	// }
	_ = err

	return &SQLite{db: db, bs: bs}
}

// DB returns the underlying database. Only here during refactoring.
// TODO: get rid of this!
func (s *SQLite) DB() *sqlitex.Pool {
	return s.db
}

func (s *SQLite) Blockstore() blockstore.Blockstore {
	return s.bs
}

func (s *SQLite) IterateChanges(ctx context.Context, oid ObjectID, v Version, fn func(RecordedChange) error) error {
	queue := v.CIDs()

	visited := make(map[cid.Cid]RecordedChange)

	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}

	for len(queue) > 0 {
		last := len(queue) - 1
		id := queue[last]
		queue = queue[:last]

		if _, ok := visited[id]; ok {
			continue
		}

		blk, err := s.bs.get(conn, id)
		if err != nil {
			return err
		}

		sc, err := ParseChangeBlock(blk)
		if err != nil {
			return err
		}

		visited[id] = RecordedChange{ID: blk.Cid(), Change: sc.Payload}

		for _, p := range sc.Payload.Parents {
			queue = append(queue, p)
		}
	}

	release()

	out := make([]RecordedChange, len(visited))
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

	ver, err := ParseVersion(res.WorkingCopyVersion)
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

	if err := s.bs.Put(ctx, blk); err != nil {
		return RecordedChange{}, fmt.Errorf("failed to store change IPLD block: %w", err)
	}

	return RecordedChange{ID: blk.Cid(), Change: c}, nil
}

func (s *SQLite) RecordChangeV2(ctx context.Context, oid ObjectID, id core.Identity, deps []cid.Cid, lamportTime uint64, body []byte) (rc RecordedChange, err error) {
	c := Change{
		Type:        ChangeType,
		Object:      oid,
		Author:      id.AccountID(),
		Parents:     deps,
		LamportTime: lamportTime,
		Body:        body,
		Kind:        "mintter.crdt", // TODO(burdiyan): build10: is this necessary?
		CreateTime:  time.Now().UTC().Round(time.Second),
	}

	signed, err := NewSignedCBOR(c, id.DeviceKey())
	if err != nil {
		return rc, err
	}

	data, err := cbornode.DumpObject(signed)
	if err != nil {
		return rc, fmt.Errorf("failed to encode signed change: %w", err)
	}

	blk := ipfs.NewBlock(cid.DagCBOR, data)
	if err != nil {
		return rc, err
	}

	if err := s.bs.Put(ctx, blk); err != nil {
		return rc, fmt.Errorf("failed to store change IPLD block: %w", err)
	}

	return RecordedChange{ID: blk.Cid(), Change: c}, nil
}

// func (s *SQLite) StoreChangeMetadata(ctx context.Context, c cid.Cid, change Change) error {
// 	conn, release, err := s.db.Conn(ctx)
// 	if err != nil {
// 		return err
// 	}
// 	defer release()

// 	oiddb, err := s.lookupObjectID(conn, change.Object)
// 	if err != nil {
// 		return err
// 	}

// 	aiddb, err := s.lookupAccountID(conn, change.Author)
// 	if err != nil {
// 		return err
// 	}

// 	ciddb, err := vcssql.IPFSBlocksLookupPK(conn, blk.Cid().Hash())
// 	if err != nil {
// 		return err
// 	}

// 	if err := vcssql.ChangesInsertOrIgnore(conn, ciddb.IPFSBlocksID, oiddb, c.Kind, int(c.LamportTime), int(c.CreateTime.Unix())); err != nil {
// 		return err
// 	}

// 	if err := vcssql.ChangeAuthorsInsertOrIgnore(conn, aiddb, ciddb.IPFSBlocksID); err != nil {
// 		return err
// 	}

// 	return nil
// }

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

func IsErrNotFound(err error) bool {
	return errors.Is(err, errNotFound)
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
		return Version{}, fmt.Errorf("object = %s version = %s: %w", o, name, errNotFound)
	}

	ver, err := ParseVersion(res.NamedVersionsVersion)
	if err != nil {
		return Version{}, fmt.Errorf("failed to decode named version: %w", err)
	}

	return ver, nil
}

func (s *SQLite) StorePermanode(ctx context.Context, blk blocks.Block, p Permanode) (err error) {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	if err := s.bs.putBlock(conn, blk); err != nil {
		return err
	}

	// Ensure account exists.
	aid, err := s.lookupAccountID(conn, p.PermanodeOwner())
	if err != nil {
		return err
	}

	ohash := blk.Cid().Hash()

	res, err := vcssql.IPFSBlocksLookupPK(conn, ohash)
	if err != nil {
		return err
	}

	if err := vcssql.PermanodesInsertOrIgnore(conn, string(p.PermanodeType()), res.IPFSBlocksID, int(p.PermanodeCreateTime().Unix())); err != nil {
		return err
	}

	if err := vcssql.PermanodeOwnersInsertOrIgnore(conn, aid, res.IPFSBlocksID); err != nil {
		return err
	}

	return nil
}

type Ref struct {
	Account cid.Cid
	Device  cid.Cid
	Version Version
}

func (s *SQLite) ListVersionsByOwner(ctx context.Context, owner cid.Cid) (map[cid.Cid][]Ref, error) {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	ahash := owner.Hash()
	aiddb, err := vcssql.AccountsLookupPK(conn, ahash)
	if err != nil {
		return nil, err
	}

	versions, err := vcssql.NamedVersionsListByObjectOwner(conn, aiddb.AccountsID)
	if err != nil {
		return nil, err
	}

	refs := make(map[cid.Cid][]Ref, len(versions))

	for _, ver := range versions {
		oid := cid.NewCidV1(uint64(ver.PermanodeCodec), ver.PermanodeMultihash)
		aid := cid.NewCidV1(core.CodecAccountKey, ver.AccountsMultihash)
		did := cid.NewCidV1(core.CodecDeviceKey, ver.DevicesMultihash)

		v, err := ParseVersion(ver.NamedVersionsVersion)
		if err != nil {
			return nil, err
		}

		refs[oid] = append(refs[oid], Ref{
			Account: aid,
			Device:  did,
			Version: v,
		})
	}

	return refs, nil
}

func (s *SQLite) ListAllVersions(ctx context.Context) (map[cid.Cid][]Ref, error) {
	conn, release, err := s.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	versions, err := vcssql.NamedVersionsListAll(conn)
	if err != nil {
		return nil, err
	}

	refs := make(map[cid.Cid][]Ref, len(versions))

	for _, ver := range versions {
		oid := cid.NewCidV1(uint64(ver.PermanodeCodec), ver.PermanodeMultihash)
		aid := cid.NewCidV1(core.CodecAccountKey, ver.AccountsMultihash)
		did := cid.NewCidV1(core.CodecDeviceKey, ver.DevicesMultihash)

		v, err := ParseVersion(ver.NamedVersionsVersion)
		if err != nil {
			return nil, err
		}

		refs[oid] = append(refs[oid], Ref{
			Account: aid,
			Device:  did,
			Version: v,
		})
	}

	return refs, nil
}

func (s *SQLite) GetPermanode(ctx context.Context, c cid.Cid, p Permanode) error {
	blk, err := s.bs.Get(ctx, c)
	if err != nil {
		if format.IsNotFound(err) {
			return fmt.Errorf("permanode %s: %w", c, errNotFound)
		}
	}

	if err := cbornode.DecodeInto(blk.RawData(), p); err != nil {
		return fmt.Errorf("unable to decode permanode %s: %w", c, err)
	}

	return nil
}

func (s *SQLite) DeletePermanode(ctx context.Context, c cid.Cid) error {
	if err := s.bs.DeleteBlock(ctx, c); err != nil {
		return err
	}

	return nil
}

func (s *SQLite) BlockGetter() BlockGetter {
	return bstoreGetter{s.bs}
}

func (s *SQLite) lookupObjectID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	res, err := vcssql.IPFSBlocksLookupPK(conn, c.Hash())
	if err != nil {
		return 0, err
	}

	if res.IPFSBlocksID == 0 {
		return 0, fmt.Errorf("object not found: %w", errNotFound)
	}

	return res.IPFSBlocksID, nil
}

func (s *SQLite) lookupAccountID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	ohash := c.Hash()

	res, err := vcssql.AccountsLookupPK(conn, ohash)
	if err != nil {
		return 0, err
	}

	if res.AccountsID != 0 {
		return res.AccountsID, nil
	}

	insert, err := vcssql.AccountsInsertPK(conn, ohash)
	if err != nil {
		return 0, err
	}

	if insert.AccountsID == 0 {
		return 0, fmt.Errorf("failed to insert account")
	}

	return insert.AccountsID, nil
}

func (s *SQLite) lookupDeviceID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	dhash := c.Hash()

	res, err := vcssql.DevicesLookupPK(conn, dhash)
	if err != nil {
		return 0, err
	}

	if res.DevicesID != 0 {
		return res.DevicesID, nil
	}

	insert, err := vcssql.DevicesInsertPK(conn, dhash)
	if err != nil {
		return 0, err
	}

	if insert.DevicesID == 0 {
		return 0, fmt.Errorf("failed to insert account")
	}

	return insert.DevicesID, nil
}
