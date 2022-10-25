// Package sqlitevcs provides version-control-system-related functionality.
// It's mostly a wrapper around SQLite with specific functions around
// our graph/triple-store mode for Mintter Objects.
package sqlitevcs

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"mintter/backend/vcs/crdt"
	"mintter/backend/vcs/hlc"
	"mintter/backend/vcs/vcssql"
	"sort"
	"time"
	"unsafe"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/leporo/sqlf"
	"go.uber.org/multierr"
)

const changeKindV1 = vcs.ChangeKindV1

// DB is a database of Mintter Objects.
type DB struct {
	pool *sqlitex.Pool

	bs *blockStore
}

// New creates a new DB.
func New(pool *sqlitex.Pool) *DB {
	return &DB{pool: pool, bs: newBlockstore(pool)}
}

// Blockstore returns the blockstore interface wrapped by this database.
func (db *DB) Blockstore() blockstore.Blockstore {
	return db.bs
}

// DB returns the underlying SQLite connection pool.
// This is used for compatibility with the old code, but it should not be exposed.
//
// TODO(burdiyan): get rid of this. Should not be exposed. Search for other places with build11.
func (db *DB) DB() *sqlitex.Pool {
	return db.pool
}

// Conn provides a new database connection.
func (db *DB) Conn(ctx context.Context) (conn *Conn, release func(), err error) {
	dbconn, release, err := db.pool.Conn(ctx)
	return &Conn{conn: dbconn, bs: db.bs}, release, err
}

// LocalID is a type for an internal shorthand integer ID for many things in the database.
type LocalID int

// Conn is a wrapper for a database connection which provides VCS-related functionality.
type Conn struct {
	conn *sqlite.Conn
	bs   *blockStore

	err error
}

// InternalConn should not exist. It returns the underlying
// SQLite connection. It's here for compatibility with the old
// code. It will be removed in Build 11 when we implement more
// granular block CRDT.
//
// TODO(burdiyan): remove this. Search for other places with build11.
func (conn *Conn) InternalConn() *sqlite.Conn {
	return conn.conn
}

// Attribute is here during the refactoring.
type Attribute = vcs.Attribute

// Attr ensures an internal ID for an attribute.
func (conn *Conn) Attr(s Attribute) LocalID {
	if conn.err != nil {
		return 0
	}

	res, err := vcssql.DatomsAttrLookup(conn.conn, string(s))
	if err != nil {
		conn.err = err
		return 0
	}

	if res.DatomAttrsID > 0 {
		return LocalID(res.DatomAttrsID)
	}

	ins, err := vcssql.DatomsAttrInsert(conn.conn, string(s))
	if err != nil {
		conn.err = err
		return 0
	}

	if ins.DatomAttrsID == 0 {
		conn.err = fmt.Errorf("failed to insert datom attr %s", s)
		return 0
	}

	return LocalID(ins.DatomAttrsID)
}

// NewObject creates a new object and returns it internal ID.
func (conn *Conn) NewObject(p vcs.EncodedPermanode) (lid LocalID) {
	must.Maybe(&conn.err, func() error {
		defer sqlitex.Save(conn.conn)(&conn.err)

		aid := conn.ensureAccountID(p.PermanodeOwner())

		if err := conn.bs.putBlock(conn.conn, p.ID, p.Data); err != nil {
			return err
		}

		ohash := p.ID.Hash()

		res, err := vcssql.IPFSBlocksLookupPK(conn.conn, ohash)
		if err != nil {
			return err
		}

		if err := vcssql.PermanodesInsertOrIgnore(conn.conn, string(p.PermanodeType()), res.IPFSBlocksID, int64(p.PermanodeCreateTime().Pack()), aid); err != nil {
			return err
		}

		lid = LocalID(res.IPFSBlocksID)

		return nil
	})
	return lid
}

// LookupPermanode find an internal ID for a given permanode CID.
func (conn *Conn) LookupPermanode(c cid.Cid) LocalID {
	if conn.err != nil {
		return 0
	}

	return LocalID(conn.lookupObjectID(c))
}

// GetObjectOwner returns the owner for the Mintter Object.
func (conn *Conn) GetObjectOwner(id LocalID) (c cid.Cid) {
	must.Maybe(&conn.err, func() error {
		res, err := vcssql.PermanodeOwnersGetOne(conn.conn, int64(id))
		if err != nil {
			return err
		}

		c = cid.NewCidV1(core.CodecAccountKey, res.AccountsMultihash)
		return nil
	})
	return c
}

// EnsurePermanode ensures a permanode exist and returns it's local ID.
func (conn *Conn) EnsurePermanode(p vcs.EncodedPermanode) (lid LocalID) {
	must.Maybe(&conn.err, func() error {
		lid = conn.LookupPermanode(p.ID)
		if lid == 0 {
			lid = conn.NewObject(p)
		}
		return nil
	})
	return lid
}

// LocalIdentity is a database-internal identity of a Mintter peer.
type LocalIdentity struct {
	Account LocalID
	Device  LocalID
}

// Err returns the underlying connection error if one happened.
func (conn *Conn) Err() error {
	return conn.err
}

// BeginTx starts a new database transaction. Only one write transaction can be open.
func (conn *Conn) BeginTx(immediate bool) error {
	if conn.err != nil {
		return conn.err
	}

	if immediate {
		return sqlitex.Exec(conn.conn, "BEGIN IMMEDIATE TRANSACTION", nil)
	}

	return sqlitex.Exec(conn.conn, "BEGIN TRANSACTION", nil)
}

// Commit the database transaction. If connection had an internal error
// the transaction will be rolled back automatically instead committing.
// Both commit and rollback can fail themselves, so it's important to check
// the returned error.
func (conn *Conn) Commit() error {
	if conn.err == nil {
		return sqlitex.Exec(conn.conn, "COMMIT", nil)
	}

	if err := sqlitex.Exec(conn.conn, "ROLLBACK", nil); err != nil {
		return multierr.Combine(
			fmt.Errorf("rollback error: %w", err),
			fmt.Errorf("connection error: %w", err),
		)
	}

	return conn.err
}

// WithTx is a convenience method to use a function closure for a database transaction.
// It will start and commit transaction respecting the returned error from the function.
// If WithTx returns a non-nil error the connection must not be used anymore.
func (conn *Conn) WithTx(immediate bool, fn func() error) error {
	if conn.err != nil {
		return fmt.Errorf("connection is in error state: %w", conn.err)
	}

	if err := conn.BeginTx(immediate); err != nil {
		return err
	}

	if err := fn(); err != nil {
		conn.err = err
	}

	return conn.Commit()
}

// EnsureIdentity ensures LocalID for the identity.
func (conn *Conn) EnsureIdentity(id core.Identity) (li LocalIdentity) {
	return conn.EnsureAccountDevice(id.AccountID(), id.DeviceKey().CID())
}

// EnsureAccountDevice is the same as EnsureIdentity but uses plain CIDs.
//
// TODO(burdiyan): probably only one way should exist to do that.
func (conn *Conn) EnsureAccountDevice(acc, device cid.Cid) (li LocalIdentity) {
	must.Maybe(&conn.err, func() error {
		li.Account = LocalID(conn.ensureAccountID(acc))
		li.Device = LocalID(conn.ensureDeviceID(device))

		return vcssql.AccountDevicesInsertOrIgnore(conn.conn, int64(li.Account), int64(li.Device))
	})
	return li
}

// NewChange creates a new change to modify a given Mintter Object.
func (conn *Conn) NewChange(obj LocalID, id LocalIdentity, base []LocalID, clock *hlc.Clock) LocalID {
	if conn.err != nil {
		return 0
	}

	if base != nil {
		data, err := json.Marshal(base)
		if err != nil {
			conn.err = err
			return 0
		}

		baseRes, err := vcssql.ChangesGetBase(conn.conn, int64(obj), string(data))
		if err != nil {
			conn.err = err
			return 0
		}
		if int(baseRes.Count) != len(base) {
			conn.err = fmt.Errorf("invalid base length")
			return 0
		}

		clock.Track(hlc.Unpack(int64(baseRes.MaxClock)))
	}

	hlcTime := clock.Now().Pack()

	res, err := vcssql.ChangesAllocateID(conn.conn)
	if err != nil {
		conn.err = err
		return 0
	}
	changeID := res.Seq

	if err := vcssql.ChangesInsertOrIgnore(conn.conn, changeID, int64(obj), int64(id.Account), int64(id.Device), changeKindV1, int64(hlcTime)); err != nil {
		conn.err = err
		return 0
	}

	for _, dep := range base {
		if err := vcssql.ChangesInsertParent(conn.conn, changeID, int64(dep)); err != nil {
			conn.err = err
			return 0
		}
	}

	return LocalID(changeID)
}

// GetChangeClock returns the clock instance with maximum timestamp for a given change.
func (conn *Conn) GetChangeClock(object, change LocalID) (c *hlc.Clock) {
	must.Maybe(&conn.err, func() error {
		c = hlc.NewClockAt(hlc.Unpack(conn.GetChangeMaxTime(object, change)))
		return nil
	})

	return c
}

// GetChangeMaxTime returns maximum Hybrid Logical Timestamp for a given change.
func (conn *Conn) GetChangeMaxTime(object, change LocalID) int64 {
	if conn.err != nil {
		return 0
	}

	var out int64

	onStmt := func(stmt *sqlite.Stmt) error {
		out = stmt.ColumnInt64(0)
		return nil
	}

	q := sqlf.From(string(sqliteschema.Datoms)).
		Select("MAX("+sqliteschema.DatomsTime.ShortName()+")").
		Where(sqliteschema.DatomsPermanode.ShortName()+" = ?", object).
		Where(sqliteschema.DatomsChange.ShortName()+" = ?", change).
		Limit(1)
	defer q.Close()

	if err := sqlitex.Exec(conn.conn, q.String(), onStmt, q.Args()...); err != nil {
		conn.err = err
		return 0
	}

	if out == 0 {
		conn.err = fmt.Errorf("not found lamport time for change %d", change)
		return 0
	}

	return out
}

// StoreRemoteChange stores the changes fetched from the remote peer,
// and indexes its datoms. It assumes that the change signature was already
// validated elsewhere. It also assumes that change parents already exist in the database.
// It also expects that IPFS block of the incoming change is already in the blockstore, placed there
// by the BitSwap session.
func (conn *Conn) StoreRemoteChange(obj LocalID, vc vcs.VerifiedChange, onDatom func(conn *Conn, obj, change LocalID, d Datom) error) (change LocalID) {
	must.Maybe(&conn.err, func() error {
		ch := vc.Decoded

		if ch.Kind != changeKindV1 {
			panic("BUG: change kind is invalid: " + ch.Kind)
		}

		// TODO(burdiyan): validate lamport timestamp of the incoming change here, or elsewhere?

		if err := conn.bs.putBlock(conn.conn, vc.Cid(), vc.RawData()); err != nil {
			return err
		}

		res, err := vcssql.IPFSBlocksLookupPK(conn.conn, vc.Cid().Hash())
		if err != nil || res.IPFSBlocksID == 0 {
			return fmt.Errorf("ipfs block for the remote change must exist before indexing: %w", err)
		}
		change = LocalID(res.IPFSBlocksID)

		idLocal := conn.EnsureAccountDevice(ch.Author, ch.Signer)

		if err := vcssql.ChangesInsertOrIgnore(conn.conn, int64(change), int64(obj), int64(idLocal.Account), int64(idLocal.Device), ch.Kind, int64(ch.Time.Pack())); err != nil {
			return err
		}

		for _, dep := range ch.Parents {
			res, err := vcssql.IPFSBlocksLookupPK(conn.conn, dep.Hash())
			if err != nil {
				return err
			}

			if err := vcssql.ChangesInsertParent(conn.conn, int64(change), res.IPFSBlocksID); err != nil {
				return err
			}
		}

		datoms, err := ch.Datoms()
		if err != nil {
			return err
		}

		for _, d := range datoms {
			conn.AddDatom(obj, change, d)
			if onDatom != nil {
				if err := onDatom(conn, obj, change, d); err != nil {
					return err
				}
			}
		}

		return nil
	})
	return change
}

// EncodeChange encodes a change into its canonical representation as an IPFS block,
// and stores it in the internal block store.
func (conn *Conn) EncodeChange(change LocalID, sig core.KeyPair) blocks.Block {
	if conn.err != nil {
		return nil
	}

	var (
		body         vcs.ChangeBody
		attrLookup   lookup[Attribute, Attribute]
		stringLookup lookup[string, string]
		entityLookup lookup[NodeID, NodeID]
		bytesLookup  lookup[string, []byte]
		cidsLookup   lookup[cid.Cid, cid.Cid]
	)

	var prevHLC int64
	onStmt := func(stmt *sqlite.Stmt) error {
		dr := DatomRow{stmt: stmt}

		hlcTime := dr.Time()
		if hlcTime <= prevHLC {
			return fmt.Errorf("BUG: unexpected seq order: prev=%d cur=%d", prevHLC, hlcTime)
		}
		prevHLC = hlcTime

		entity := dr.Entity()
		attr := dr.Attr()
		if attr == "" {
			return fmt.Errorf("BUG: bad attr")
		}

		vtype, v := dr.Value()

		var val int

		switch vtype {
		case vcs.ValueTypeRef:
			data := v.(NodeID)
			val = entityLookup.Put(data, data)
		case vcs.ValueTypeString:
			data := v.(string)
			val = stringLookup.Put(data, data)
		case vcs.ValueTypeInt:
			val = v.(int)
		case vcs.ValueTypeBool:
			vb := v.(bool)
			if vb {
				val = 1
			} else {
				val = 0
			}
		case vcs.ValueTypeBytes:
			data := v.([]byte)
			// Can't use []byte as map's key, so doing zero-copy
			// conversion to string to be used as a map key.
			val = bytesLookup.Put(*(*string)(unsafe.Pointer(&data)), data)
		case vcs.ValueTypeCID:
			val = cidsLookup.Put(v.(cid.Cid), v.(cid.Cid))
		default:
			return fmt.Errorf("BUG: invalid value type to encode")
		}

		body.Datoms = append(body.Datoms, [5]int{
			int(hlcTime),
			entityLookup.Put(entity, entity),
			attrLookup.Put(attr, attr),
			int(vtype),
			val,
		})

		return nil
	}

	q := baseDatomQuery(false)
	q.Where(sqliteschema.DatomsChange.String()+" = ?", change)
	defer q.Close()

	if err := sqlitex.Exec(conn.conn, q.String(), onStmt, change); err != nil {
		conn.err = err
		return nil
	}

	body.Attrs = attrLookup.cache
	body.Entities = entityLookup.cache
	body.Strings = stringLookup.cache
	body.Bytes = bytesLookup.cache
	body.CIDs = cidsLookup.cache

	data, err := cbornode.DumpObject(body)
	if err != nil {
		conn.err = err
		return nil
	}

	changeInfo, err := vcssql.ChangesGetOne(conn.conn, int64(change))
	if err != nil {
		conn.err = err
		return nil
	}

	parents, err := vcssql.ChangesGetParents(conn.conn, int64(change))
	if err != nil {
		conn.err = err
		return nil
	}

	var deps []cid.Cid
	if len(parents) > 0 {
		deps = make([]cid.Cid, len(parents))
		for i, p := range parents {
			if p.IPFSBlocksMultihash == nil || len(p.IPFSBlocksMultihash) == 0 {
				conn.err = fmt.Errorf("change %d depends on unencoded change %d", change, p.ChangeDepsParent)
				return nil
			}

			deps[i] = cid.NewCidV1(uint64(p.IPFSBlocksCodec), p.IPFSBlocksMultihash)
		}
	}

	obj := cid.NewCidV1(uint64(changeInfo.IPFSBlocksCodec), changeInfo.IPFSBlocksMultihash)
	author := cid.NewCidV1(core.CodecAccountKey, changeInfo.AccountsMultihash)

	c := vcs.Change{
		ChangeInfo: vcs.ChangeInfo{
			Object:  obj,
			Author:  author,
			Parents: deps,
			Kind:    changeInfo.ChangesKind,
			Message: "",
			Time:    hlc.Unpack(int64(changeInfo.ChangesStartTime)),
		},
		Type: vcs.ChangeType,
		Body: data,
	}

	sc := c.Sign(sig)

	signed, err := cbornode.DumpObject(sc)
	if err != nil {
		conn.err = err
		return nil
	}

	blk := ipfs.NewBlock(cid.DagCBOR, signed)

	if err := conn.bs.putBlockWithID(conn.conn, change, blk.Cid(), blk.RawData()); err != nil {
		conn.err = err
		return nil
	}

	return blk
}

// PutBlock puts an IPFS block into the database.
func (conn *Conn) PutBlock(blk blocks.Block) {
	if conn.err != nil {
		return
	}

	conn.err = conn.bs.putBlock(conn.conn, blk.Cid(), blk.RawData())
}

// NewEntity creates a new NodeID.
func (conn *Conn) NewEntity() (nid vcs.NodeID) {
	if conn.err != nil {
		return
	}

	return vcs.NewNodeIDv1(time.Now())
}

// AddDatoms is like add datom but allows adding more than one.
func (conn *Conn) AddDatoms(object, change LocalID, dd ...Datom) {
	must.Maybe(&conn.err, func() error {
		for _, d := range dd {
			conn.AddDatom(object, change, d)
		}
		return nil
	})
}

// AddDatom adds a triple into the database.
func (conn *Conn) AddDatom(object, change LocalID, d Datom) {
	must.Maybe(&conn.err, func() error {
		value := d.Value

		// sqlitex.Exec doesn't support CIDs bind parameters.
		if d.ValueType == vcs.ValueTypeCID {
			value = d.Value.(cid.Cid).Bytes()
		}

		q := sqlf.InsertInto(string(sqliteschema.Datoms)).
			Set(sqliteschema.DatomsPermanode.ShortName(), object).
			Set(sqliteschema.DatomsEntity.ShortName(), d.Entity).
			Set(sqliteschema.DatomsAttr.ShortName(), conn.Attr(d.Attr)).
			Set(sqliteschema.DatomsValueType.ShortName(), d.ValueType).
			Set(sqliteschema.DatomsValue.ShortName(), value).
			Set(sqliteschema.DatomsChange.ShortName(), change).
			Set(sqliteschema.DatomsTime.ShortName(), d.Time).
			Set(sqliteschema.DatomsOrigin.ShortName(), d.Origin)
		defer q.Close()

		if err := sqlitex.Exec(conn.conn, q.String(), nil, q.Args()...); err != nil {
			return err
		}

		return nil
	})
}

// DeleteDatoms removes all datoms with a given entity and attribute belonging to the given change.
// Should only be used for changes that are being prepared and not yet published.
func (conn *Conn) DeleteDatoms(object, change LocalID, entity NodeID, attribute LocalID) (deleted bool) {
	if conn.err != nil {
		return
	}

	if err := vcssql.DatomsDelete(conn.conn, int64(object), int64(entity), int64(change), int64(attribute)); err != nil {
		conn.err = err
		return
	}

	return conn.conn.Changes() > 0
}

// DeleteDatomByID deletes one datom given its ID.
func (conn *Conn) DeleteDatomByID(object, change LocalID, id crdt.OpID) (deleted bool) {
	q := sqlf.DeleteFrom(string(sqliteschema.Datoms)).
		Where(sqliteschema.DatomsPermanode.ShortName()+" = ?", object).
		Where(sqliteschema.DatomsChange.ShortName()+" = ?", change).
		Where(sqliteschema.DatomsTime.ShortName()+" = ?", id.Time()).
		Where(sqliteschema.DatomsOrigin.ShortName()+" = ?", id.Origin())
	defer q.Close()

	if err := sqlitex.Exec(conn.conn, q.String(), nil, q.Args()...); err != nil {
		conn.err = err
		return false
	}

	return conn.conn.Changes() > 0
}

// OpID is an ID used to perform CRDT-style conflict resolution.
// First we compare lamport timestamp, then change, then seq.
// Notice that LocalID is not enough to compare the changes,
// because each peer will have different local IDs. This needs to
// be resolve to the full multihash ID. But this is only necessary
// in case of concurrency, which is rare, so it's OK to lookup
// the multihash only when necessary.
type OpID struct {
	LamportTime int
	Change      LocalID
	Seq         int
}

// IsZero checks if OpID is a zero value.
func (o OpID) IsZero() bool {
	return o.Change == 0
}

// NodeID is here during the refactoring.
type NodeID = vcs.NodeID

// Datom is here during the refactoring.
type Datom = vcs.Datom

// LocalVersion is a set of leaf changes that becomes a version of an Object.
type LocalVersion []LocalID

// SaveVersion saves a named version for a given peer identity.
func (conn *Conn) SaveVersion(object LocalID, name string, id LocalIdentity, heads LocalVersion) {
	must.Maybe(&conn.err, func() error {
		if len(heads) == 0 {
			return fmt.Errorf("version to save must have changes")
		}

		for _, h := range heads {
			if h == 0 {
				return fmt.Errorf("version to save must have non-zero changes")
			}
		}

		data, err := json.Marshal(heads)
		if err != nil {
			return err
		}

		if err := vcssql.NamedVersionsReplace(conn.conn, int64(object), int64(id.Account), int64(id.Device), name, string(data)); err != nil {
			return err
		}

		return nil
	})
}

// GetVersion loads a named version.
func (conn *Conn) GetVersion(object LocalID, name string, id LocalIdentity) (out LocalVersion) {
	must.Maybe(&conn.err, func() error {
		res, err := vcssql.NamedVersionsGet(conn.conn, int64(object), int64(id.Account), int64(id.Device), name)
		if err != nil {
			return err
		}

		if res.NamedVersionsVersion == "" {
			return fmt.Errorf("no version (obj: %d, name: %s, account: %d, device: %d)", object, name, id.Account, id.Device)
		}

		if err := json.Unmarshal([]byte(res.NamedVersionsVersion), &out); err != nil {
			return err
		}

		return nil
	})

	return out
}

// DeleteVersion removes a given named version.
func (conn *Conn) DeleteVersion(object LocalID, name string, id LocalIdentity) {
	if conn.err != nil {
		return
	}

	if err := vcssql.NamedVersionsDelete(conn.conn, int64(object), int64(id.Account), int64(id.Device), name); err != nil {
		conn.err = err
		return
	}
}

// LocalVersionToPublic converts a local version into the public one.
func (conn *Conn) LocalVersionToPublic(v LocalVersion) vcs.Version {
	cids := make([]cid.Cid, len(v))
	must.Maybe(&conn.err, func() error {
		for i, vv := range v {
			res, err := vcssql.IPFSBlocksGetHash(conn.conn, int64(vv))
			if err != nil {
				return err
			}

			cids[i] = cid.NewCidV1(uint64(res.IPFSBlocksCodec), res.IPFSBlocksMultihash)
		}
		return nil
	})

	sort.Slice(cids, func(i, j int) bool {
		return cids[i].String() < cids[j].String()
	})

	return vcs.NewVersion(cids...)
}

// PublicVersionToLocal converts a public version into a local one. All changes
// of the public version must already be in the database.
func (conn *Conn) PublicVersionToLocal(v vcs.Version) (out LocalVersion) {
	must.Maybe(&conn.err, func() error {
		if v.IsZero() {
			return nil
		}

		cids := v.CIDs()
		out = make(LocalVersion, len(cids))
		for i, c := range cids {
			res, err := vcssql.IPFSBlocksLookupPK(conn.conn, c.Hash())
			if err != nil {
				return err
			}

			if res.IPFSBlocksID == 0 {
				return fmt.Errorf("version not found: %s", c.String())
			}

			out[i] = LocalID(res.IPFSBlocksID)
		}
		return nil
	})
	return out
}

// CountVersions of a given object.
func (conn *Conn) CountVersions(object LocalID) (out int) {
	const q = "SELECT COUNT() FROM named_versions WHERE object_id = ?"

	if err := sqlitex.Exec(conn.conn, q, func(stmt *sqlite.Stmt) error {
		out = stmt.ColumnInt(0)
		return nil
	}, object); err != nil {
		conn.err = err
		return 0
	}

	return out
}

// DeleteObject from the database.
func (conn *Conn) DeleteObject(object LocalID) {
	if conn.err != nil {
		return
	}

	conn.err = vcssql.IPFSBlocksDeleteByID(conn.conn, int64(object))
}

// DeleteChange from the database.
func (conn *Conn) DeleteChange(change LocalID) {
	if conn.err != nil {
		return
	}

	conn.err = vcssql.ChangesDeleteByID(conn.conn, int64(change))
}

// LookupIdentity looks up local IDs for a given identity.
func (conn *Conn) LookupIdentity(id core.Identity) (lid LocalIdentity) {
	if conn.err != nil {
		return lid
	}

	lid.Account = conn.lookupAccount(id.AccountID())
	lid.Device = conn.lookupDevice(id.DeviceKey().CID())

	return lid
}

// GetPermanodeCreateTime returns create time of a permanode.
func (conn *Conn) GetPermanodeCreateTime(obj LocalID) (t time.Time) {
	if conn.err != nil {
		return t
	}

	const q = "SELECT create_time FROM permanodes WHERE id = ?"

	onStmt := func(stmt *sqlite.Stmt) error {
		t = hlc.AsTime(stmt.ColumnInt64(0))
		return nil
	}

	if err := sqlitex.Exec(conn.conn, q, onStmt, obj); err != nil {
		conn.err = err
		return t
	}

	return t
}

// ListObjectsByType returns a list of all the known objects of a given type.
func (conn *Conn) ListObjectsByType(otype vcs.ObjectType) (out []LocalID) {
	must.Maybe(&conn.err, func() error {
		res, err := vcssql.PermanodesListByType(conn.conn, string(otype))
		if err != nil {
			return err
		}

		out = make([]LocalID, len(res))

		for i, r := range res {
			out[i] = LocalID(r.PermanodesID)
		}

		return nil
	})

	return out
}

// GetObjectCID returns the CID of a Mintter Object given its local ID.
func (conn *Conn) GetObjectCID(obj LocalID) (c cid.Cid) {
	must.Maybe(&conn.err, func() error {
		res, err := vcssql.IPFSBlocksLookupCID(conn.conn, int64(obj))
		if err != nil {
			return err
		}

		c = cid.NewCidV1(uint64(res.IPFSBlocksCodec), res.IPFSBlocksMultihash)
		return nil
	})

	return c
}

func (conn *Conn) lookupAccount(c cid.Cid) LocalID {
	if conn.err != nil {
		return 0
	}

	ohash := c.Hash()

	res, err := vcssql.AccountsLookupPK(conn.conn, ohash)
	if err != nil {
		conn.err = err
		return 0
	}

	if res.AccountsID == 0 {
		conn.err = fmt.Errorf("account not found: %w", errNotFound)
		return 0
	}

	return LocalID(res.AccountsID)
}

func (conn *Conn) lookupDevice(c cid.Cid) LocalID {
	if conn.err != nil {
		return 0
	}

	hash := c.Hash()

	res, err := vcssql.DevicesLookupPK(conn.conn, hash)
	if err != nil {
		conn.err = err
		return 0
	}

	if res.DevicesID == 0 {
		conn.err = fmt.Errorf("device not found: %w", err)
		return 0
	}

	return LocalID(res.DevicesID)
}

func (conn *Conn) lookupObjectID(c cid.Cid) int64 {
	if conn.err != nil {
		return 0
	}

	res, err := vcssql.IPFSBlocksLookupPK(conn.conn, c.Hash())
	if err != nil {
		conn.err = err
		return 0
	}

	if res.IPFSBlocksID == 0 {
		conn.err = fmt.Errorf("object not found: %w", errNotFound)
		return 0
	}

	return res.IPFSBlocksID
}

func (conn *Conn) ensureAccountID(c cid.Cid) int64 {
	if conn.err != nil {
		return 0
	}

	ohash := c.Hash()

	res, err := vcssql.AccountsLookupPK(conn.conn, ohash)
	if err != nil {
		conn.err = err
		return 0
	}

	if res.AccountsID != 0 {
		return res.AccountsID
	}

	insert, err := vcssql.AccountsInsertPK(conn.conn, ohash)
	if err != nil {
		conn.err = err
		return 0
	}

	if insert.AccountsID == 0 {
		conn.err = fmt.Errorf("failed to insert account")
		return 0
	}

	return insert.AccountsID
}

func (conn *Conn) ensureDeviceID(c cid.Cid) int64 {
	if conn.err != nil {
		return 0
	}

	dhash := c.Hash()

	res, err := vcssql.DevicesLookupPK(conn.conn, dhash)
	if err != nil {
		conn.err = err
		return 0
	}

	if res.DevicesID != 0 {
		return res.DevicesID
	}

	insert, err := vcssql.DevicesInsertPK(conn.conn, dhash)
	if err != nil {
		conn.err = err
		return 0
	}

	if insert.DevicesID == 0 {
		conn.err = fmt.Errorf("failed to insert account")
		return 0
	}

	return insert.DevicesID
}

// Ref is a named reference/version.
type Ref struct {
	Account cid.Cid
	Device  cid.Cid
	Version vcs.Version
}

// ListAllVersions collects all the known objects with all their versions,
// and returns all the public information about them.
//
// TODO(burdiyan): this is for compatibility with the old code. It's not a good solution.
func (conn *Conn) ListAllVersions(nameFilter string) (refs map[cid.Cid][]Ref) {
	must.Maybe(&conn.err, func() error {
		versions, err := vcssql.NamedVersionsListAll(conn.conn)
		if err != nil {
			return err
		}

		refs = make(map[cid.Cid][]Ref, len(versions))

		for _, ver := range versions {
			if nameFilter != "" && nameFilter != ver.NamedVersionsName {
				continue
			}

			oid := cid.NewCidV1(uint64(ver.PermanodeCodec), ver.PermanodeMultihash)
			aid := cid.NewCidV1(core.CodecAccountKey, ver.AccountsMultihash)
			did := cid.NewCidV1(core.CodecDeviceKey, ver.DevicesMultihash)

			var lv LocalVersion
			if err := json.Unmarshal([]byte(ver.NamedVersionsVersion), &lv); err != nil {
				return err
			}

			v := conn.LocalVersionToPublic(lv)

			refs[oid] = append(refs[oid], Ref{
				Account: aid,
				Device:  did,
				Version: v,
			})
		}

		return nil
	})

	return refs
}

var errNotFound = errors.New("not found")

// OpComparator is a comparison function which compares two, possibly concurrent, operations.
// It must return -1 if a < b; +1 if a > b; 0 if a == b.
type OpComparator func(a OpID, b OpID) int

// BasicOpCompare is a comparison function which panics in case of concurrent
// operations from different changes.
func BasicOpCompare(a, b OpID) int {
	if a.LamportTime < b.LamportTime {
		return -1
	}

	if a.LamportTime > b.LamportTime {
		return +1
	}

	if a.Change != b.Change {
		panic("TODO: implement comparison of concurrent ops from different changes")
	}

	if a.Seq < b.Seq {
		return -1
	}

	if a.Seq > b.Seq {
		return +1
	}

	panic("BUG: comparing equal operations")
}
