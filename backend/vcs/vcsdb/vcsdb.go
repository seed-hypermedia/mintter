package vcsdb

import (
	"context"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/ipfs"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"
	"sort"
	"strings"
	"text/template"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"go.uber.org/multierr"
)

const changeKindV1 = "mintter.vcsdb.v1"

// DB is a database of Mintter Objects.
type DB struct {
	pool *sqlitex.Pool

	bs *blockStore
}

// Permanode is a common interface for different Permanode structs.
type Permanode = vcs.Permanode

// EncodedPermanode is a Permanode encoded in a canonical form.
// The ID of the Permanode is the ID of a Mintter Object.
type EncodedPermanode struct {
	ID   cid.Cid
	Data []byte

	Permanode
}

// NewPermanode creates a new permanode in the encoded form.
func NewPermanode(p Permanode) (ep EncodedPermanode, err error) {
	blk, err := vcs.EncodeBlock(p)
	if err != nil {
		return ep, err
	}

	ep.ID = blk.Cid()
	ep.Data = blk.RawData()
	ep.Permanode = p

	return ep, nil
}

// New creates a new DB.
func New(pool *sqlitex.Pool) *DB {
	return &DB{pool: pool, bs: newBlockstore(pool)}
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

	lastLamport int
}

// Attribute is a type for predicate attributes.
type Attribute string

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
func (conn *Conn) NewObject(p EncodedPermanode) (lid LocalID) {
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

		if err := vcssql.PermanodesInsertOrIgnore(conn.conn, string(p.PermanodeType()), res.IPFSBlocksID, int(p.PermanodeCreateTime().Unix())); err != nil {
			return err
		}

		if err := vcssql.PermanodeOwnersInsertOrIgnore(conn.conn, aid, res.IPFSBlocksID); err != nil {
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
		res, err := vcssql.PermanodeOwnersGetOne(conn.conn, int(id))
		if err != nil {
			return err
		}

		c = cid.NewCidV1(core.CodecAccountKey, res.AccountsMultihash)
		return nil
	})
	return c
}

// EnsurePermanode ensures a permanode exist and returns it's local ID.
func (conn *Conn) EnsurePermanode(p EncodedPermanode) (lid LocalID) {
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
	if conn.err != nil {
		return li
	}

	li.Account = LocalID(conn.ensureAccountID(id.AccountID()))
	li.Device = LocalID(conn.ensureDeviceID(id.DeviceKey().CID()))

	return li
}

// NewChange creates a new change to modify a given Mintter Object.
func (conn *Conn) NewChange(obj LocalID, id LocalIdentity, base []LocalID, createTime time.Time) LocalID {
	if conn.err != nil {
		return 0
	}

	lamportTime := 1

	if base != nil {
		data, err := json.Marshal(base)
		if err != nil {
			conn.err = err
			return 0
		}

		baseRes, err := vcssql.ChangesGetBase(conn.conn, string(data), int(obj))
		if err != nil {
			conn.err = err
			return 0
		}
		if baseRes.Count != len(base) {
			conn.err = fmt.Errorf("invalid base length")
			return 0
		}

		lamportTime = baseRes.MaxClock + 1
	}

	conn.lastLamport = lamportTime

	res, err := vcssql.ChangesAllocateID(conn.conn)
	if err != nil {
		conn.err = err
		return 0
	}
	changeID := res.Seq

	now := createTime.Unix()

	if err := vcssql.ChangesInsertOrIgnore(conn.conn, changeID, int(obj), changeKindV1, lamportTime, int(now)); err != nil {
		conn.err = err
		return 0
	}

	if err := vcssql.ChangeAuthorsInsertOrIgnore(conn.conn, changeID, int(id.Account), int(id.Device)); err != nil {
		conn.err = err
		return 0
	}

	for _, dep := range base {
		if err := vcssql.ChangesInsertParent(conn.conn, changeID, int(dep)); err != nil {
			conn.err = err
			return 0
		}
	}

	return LocalID(changeID)
}

// GetChangeLamportTime returns lamport time for a given change.
func (conn *Conn) GetChangeLamportTime(id LocalID) int {
	if conn.err != nil {
		return 0
	}

	var out int

	onStmt := func(stmt *sqlite.Stmt) error {
		out = stmt.ColumnInt(0)
		return nil
	}

	// TODO: convert to codegen query.

	if err := sqlitex.Exec(conn.conn, "SELECT lamport_time FROM changes WHERE id = ? LIMIT 1", onStmt, id); err != nil {
		conn.err = err
		return 0
	}

	if out == 0 {
		conn.err = fmt.Errorf("not found lamport time for change %d", id)
		return 0
	}

	return out
}

// LastLamportTime returns the lamport time of the most recently created change.
func (conn *Conn) LastLamportTime() int { return conn.lastLamport }

var (
	qIterateChangeDatoms = qb.MakeQuery(sqliteschema.Schema, "iterateChangeDatoms", sqlitegen.QueryKindMany,
		"SELECT", qb.Results(
			qb.ResultCol(sqliteschema.DatomsChange),
			qb.ResultCol(sqliteschema.DatomsSeq),
			qb.ResultCol(sqliteschema.DatomsEntity),
			qb.ResultCol(sqliteschema.DatomAttrsAttr),
			qb.ResultCol(sqliteschema.DatomsValueType),
			qb.ResultCol(sqliteschema.DatomsValue),
		), '\n',
		"FROM", sqliteschema.Datoms, '\n',
		"JOIN", sqliteschema.DatomAttrs, "ON", sqliteschema.DatomAttrsID, "=", sqliteschema.DatomsAttr, '\n',
		"WHERE", sqliteschema.DatomsChange, "=", qb.VarCol(sqliteschema.DatomsChange),
	)

	qIterateObjectDatoms = qb.MakeQuery(sqliteschema.Schema, "iterateObjectDatoms", sqlitegen.QueryKindMany,
		"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
			"SELECT value",
			"FROM json_each(:heads)",
			"UNION",
			"SELECT", qb.Results(
				sqliteschema.ChangeDepsParent,
			),
			"FROM", sqliteschema.ChangeDeps,
			"JOIN changeset ON changeset.change", "=", sqliteschema.ChangeDepsChild,
		),
		"SELECT", qb.Results(
			qb.ResultCol(sqliteschema.DatomsChange),
			qb.ResultCol(sqliteschema.DatomsSeq),
			qb.ResultCol(sqliteschema.DatomsEntity),
			qb.ResultCol(sqliteschema.DatomAttrsAttr),
			qb.ResultCol(sqliteschema.DatomsValueType),
			qb.ResultCol(sqliteschema.DatomsValue),
			qb.ResultCol(sqliteschema.ChangesLamportTime),
		), '\n',
		"FROM", sqliteschema.Datoms, '\n',
		"JOIN changeset ON changeset.change", "=", sqliteschema.DatomsChange, '\n',
		"JOIN", sqliteschema.DatomAttrs, "ON", sqliteschema.DatomAttrsID, "=", sqliteschema.DatomsAttr, '\n',
		"JOIN", sqliteschema.Changes, "ON", sqliteschema.ChangesID, "=", sqliteschema.DatomsChange, '\n',
		"ORDER BY", qb.Enumeration(
			sqliteschema.ChangesLamportTime,
			sqliteschema.DatomsChange,
			sqliteschema.DatomsSeq,
		),
	)
)

const (
	colChange      = 0
	colSeq         = 1
	colEntity      = 2
	colAttr        = 3
	colValueType   = 4
	colValue       = 5
	colLamportTime = 6
)

type changeBody struct {
	Entities []NodeID    `refmt:"e,omitempty"`
	Strings  []string    `refmt:"s,omitempty"`
	Bytes    [][]byte    `refmt:"b,omitempty"`
	Attrs    []Attribute `refmt:"a,omitempty"`
	CIDs     []cid.Cid   `refmt:"c,omitempty"`
	Datoms   [][5]int    `refmt:"d"` // seq, entity, attrIdx, valueType, stringIdx | entityIdx | bool | int
}

func init() {
	cbornode.RegisterCborType(changeBody{})
}

// EncodeChange encodes a change into its canonical representation as an IPFS block,
// and stores it in the internal block store.
func (conn *Conn) EncodeChange(change LocalID, sig core.KeyPair) blocks.Block {
	if conn.err != nil {
		return nil
	}

	var (
		body         changeBody
		attrLookup   lookup[Attribute, Attribute]
		stringLookup lookup[string, string]
		entityLookup lookup[NodeID, NodeID]
		bytesLookup  lookup[[20]byte, []byte] // using SHA1 as a key because []byte can't be key of the map
		cidsLookup   lookup[cid.Cid, cid.Cid]
	)

	var prevSeq int
	onStmt := func(stmt *sqlite.Stmt) error {
		dr := DatomRow{stmt: stmt}

		seq := dr.Seq()
		if seq <= prevSeq {
			return fmt.Errorf("BUG: unexpected seq order")
		}
		prevSeq = seq

		entity := dr.Entity()
		attr := dr.Attr()
		if attr == "" {
			return fmt.Errorf("BUG: bad attr")
		}

		vtype, v := dr.Value()

		var val int

		switch vtype {
		case ValueTypeRef:
			data := v.(NodeID)
			val = entityLookup.Put(data, data)
		case ValueTypeString:
			data := v.(string)
			val = stringLookup.Put(data, data)
		case ValueTypeInt:
			val = v.(int)
		case ValueTypeBool:
			vb := v.(bool)
			if vb {
				val = 1
			} else {
				val = 0
			}
		case ValueTypeBytes:
			data := v.([]byte)
			sum := sha1.Sum(data) //nolint:gosec
			val = bytesLookup.Put(sum, data)
		case ValueTypeCID:
			val = cidsLookup.Put(v.(cid.Cid), v.(cid.Cid))
		default:
			return fmt.Errorf("BUG: invalid value type to encode")
		}

		body.Datoms = append(body.Datoms, [5]int{
			seq,
			entityLookup.Put(entity, entity),
			attrLookup.Put(attr, attr),
			int(vtype),
			val,
		})

		return nil
	}

	if err := sqlitex.Exec(conn.conn, qIterateChangeDatoms.SQL, onStmt, change); err != nil {
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

	authors, err := vcssql.ChangesGetWithAuthors(conn.conn, int(change))
	if err != nil {
		conn.err = err
		return nil
	}

	if len(authors) != 1 {
		panic("BUG: unimplemented changes with more than one author")
	}

	parents, err := vcssql.ChangesGetParents(conn.conn, int(change))
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

	obj := cid.NewCidV1(uint64(authors[0].IPFSBlocksCodec), authors[0].IPFSBlocksMultihash)
	author := cid.NewCidV1(core.CodecAccountKey, authors[0].AccountsMultihash)

	c := vcs.Change{
		Type:        vcs.ChangeType,
		Object:      obj,
		Author:      author,
		Parents:     deps,
		LamportTime: uint64(authors[0].ChangesLamportTime),
		Kind:        authors[0].ChangesKind,
		Body:        data,
		Message:     "",
		CreateTime:  time.Unix(int64(authors[0].ChangesCreateTime), 0),
	}

	sc, err := vcs.NewSignedCBOR(c, sig)
	if err != nil {
		conn.err = err
		return nil
	}

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

// NextChangeSeq returns the next seq that should be used for a change.
// It assumes that nodes are never created without attributes, hence
// it only looks for max seq inside the datoms table, ignoring the nodes table.
func (conn *Conn) NextChangeSeq(obj, change LocalID) int {
	if conn.err != nil {
		return 0
	}

	res, err := vcssql.DatomsMaxSeq(conn.conn, int(obj), int(change))
	if err != nil {
		conn.err = err
		return 0
	}

	return res.Max + 1
}

const nodeIDSize = 8

// NodeID is an ID of a Graph Node within a Mintter Object.
type NodeID [nodeIDSize]byte

// NewNodeID creates a new random NodeID.
func NewNodeID() (nid NodeID) {
retry:
	n, err := rand.Read(nid[:])
	if err != nil {
		panic(err)
	}
	if n != nodeIDSize {
		panic("bad randomness for node ID")
	}

	if nid.IsZero() || nid.IsReserved() {
		goto retry
	}

	return nid
}

// String implements fmt.Stringer.
func (nid NodeID) String() string {
	var notASCII bool
	const maxASCII = 127

	out := make([]byte, 0, len(nid))

	for _, b := range nid {
		if b == 0 {
			continue
		}

		if b > maxASCII {
			notASCII = true
		}

		out = append(out, b)
	}

	if notASCII {
		return base64.RawStdEncoding.EncodeToString(out)
	}

	return string(out)
}

// NodeIDFromString converts a string into a NodeID.
func NodeIDFromString(s string) NodeID {
	if s == "" {
		panic("BUG: empty string for node ID")
	}

	l := len(s)
	if l > nodeIDSize {
		panic("BUG: string length is larger than NodeID size")
	}

	var nid NodeID
	if copy(nid[:], s) != l {
		panic("BUG: couldn't copy all the string bytes into a NodeID")
	}

	return nid
}

// IsZero returns true if NodeID is zero.
func (nid NodeID) IsZero() bool {
	return nid == zeroNode
}

// IsReserved returns true if NodeID is a reserved ID.
func (nid NodeID) IsReserved() bool {
	return nid == RootNode || nid == TrashNode
}

// Bytes returns byte representation of the NodeID.
func (nid NodeID) Bytes() []byte {
	return nid[:]
}

var (
	zeroNode = NodeID{}

	// RootNode is a reserved node ID for root of the Object.
	RootNode = NodeID{'$', 'R', 'O', 'O', 'T'}

	// TrashNode is a reserved node ID for deleting other nodes.
	TrashNode = NodeID{'$', 'T', 'R', 'A', 'S', 'H'}
)

// NewEntity creates a new NodeID.
func (conn *Conn) NewEntity() (nid NodeID) {
	if conn.err != nil {
		return
	}

	return NewNodeID()
}

var addDatomQuery = qb.MakeQuery(sqliteschema.Schema, "insertDatom", sqlitegen.QueryKindExec,
	"INSERT INTO", sqliteschema.Datoms, qb.ListColShort(
		sqliteschema.DatomsPermanode,
		sqliteschema.DatomsChange,
		sqliteschema.DatomsSeq,
		sqliteschema.DatomsEntity,
		sqliteschema.DatomsAttr,
		sqliteschema.DatomsValueType,
		sqliteschema.DatomsValue,
	), '\n',
	"VALUES", qb.List(
		qb.VarCol(sqliteschema.DatomsPermanode),
		qb.VarCol(sqliteschema.DatomsChange),
		qb.VarCol(sqliteschema.DatomsSeq),
		qb.VarCol(sqliteschema.DatomsEntity),
		qb.VarCol(sqliteschema.DatomsAttr),
		qb.VarCol(sqliteschema.DatomsValueType),
		qb.VarCol(sqliteschema.DatomsValue),
	),
)

// ValueType is a type for Datom's value type.
type ValueType byte

// Supported value types.
const (
	ValueTypeRef    ValueType = 0
	ValueTypeString ValueType = 1
	ValueTypeInt    ValueType = 2
	ValueTypeBool   ValueType = 3
	ValueTypeBytes  ValueType = 4
	ValueTypeCID    ValueType = 5
)

// GetValueType returns value type for v.
func GetValueType(v any) ValueType {
	switch v.(type) {
	case NodeID:
		return ValueTypeRef
	case string:
		return ValueTypeString
	case int:
		return ValueTypeInt
	case bool:
		return ValueTypeBool
	case []byte:
		return ValueTypeBytes
	case cid.Cid:
		return ValueTypeCID
	default:
		panic("BUG: unknown value type")
	}
}

// NewDatom creates a new Datom.
func NewDatom(change LocalID, seq int, entity NodeID, a Attribute, value any, lamportTime int) Datom {
	return Datom{
		OpID: OpID{
			Change:      change,
			Seq:         seq,
			LamportTime: lamportTime,
		},
		Entity:    entity,
		Attr:      a,
		ValueType: GetValueType(value),
		Value:     value,
	}
}

// AddDatom adds a triple into the database.
func (conn *Conn) AddDatom(object LocalID, d Datom) (nextSeq int) {
	if conn.err != nil {
		return 0
	}

	// sqlitex.Exec doesn't support array bind parameters.
	// We convert array into slice here. Need to do better.
	value := d.Value
	if d.ValueType == ValueTypeRef {
		nid := d.Value.(NodeID)
		value = nid.Bytes()
	}
	if d.ValueType == ValueTypeCID {
		value = d.Value.(cid.Cid).Bytes()
	}

	e := d.Entity.Bytes()

	if err := sqlitex.Exec(conn.conn, addDatomQuery.SQL, nil, object, d.Change, d.Seq, e, conn.Attr(d.Attr), d.ValueType, value); err != nil {
		conn.err = err
		return 0
	}

	return d.Seq + 1
}

// DeleteDatoms removes all datoms with a given entity and attribute belonging to the given change.
// Should only be used for changes that are being prepared and not yet published.
func (conn *Conn) DeleteDatoms(object, change LocalID, entity NodeID, attribute LocalID) (deleted bool) {
	if conn.err != nil {
		return
	}

	if err := vcssql.DatomsDelete(conn.conn, int(object), entity.Bytes(), int(change), int(attribute)); err != nil {
		conn.err = err
		return
	}

	return conn.conn.Changes() > 0
}

// DeleteDatomByID deletes one datom given its ID.
func (conn *Conn) DeleteDatomByID(change LocalID, seq int) (deleted bool) {
	const q = "DELETE FROM datoms WHERE change = ? AND seq = ?"

	if err := sqlitex.Exec(conn.conn, q, nil, change, seq); err != nil {
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

// Datom is a fact about some entity within a Mintter Object.
type Datom struct {
	OpID
	Entity    NodeID
	Attr      Attribute
	ValueType ValueType
	Value     any
}

// DatomFactory is a function which returns new datoms
// incrementing the seq internally.
type DatomFactory func(entity NodeID, a Attribute, value any) Datom

// MakeDatomFactory creates a new DatomFactory for a given change, its
// lamport timestamp, and initial seq. Seq gets incremented *before*
// the new datom is created, i.e. pass seq = 0 for the very first datom.
func MakeDatomFactory(change LocalID, lamportTime, seq int) DatomFactory {
	return func(entity NodeID, a Attribute, value any) Datom {
		seq++
		return NewDatom(change, seq, entity, a, value, lamportTime)
	}
}

// DatomRow is an accessor for Datom data using a database row.
type DatomRow struct {
	stmt *sqlite.Stmt
}

// Datom collects the Datom from the database row.
func (dr DatomRow) Datom() Datom {
	vt, v := dr.Value()

	return Datom{
		OpID: OpID{
			Change:      dr.Change(),
			Seq:         dr.Seq(),
			LamportTime: dr.LamportTime(),
		},
		Entity:    dr.Entity(),
		Attr:      dr.Attr(),
		ValueType: vt,
		Value:     v,
	}
}

// Change returns change column value.
func (dr DatomRow) Change() LocalID {
	return LocalID(dr.stmt.ColumnInt(colChange))
}

// Seq returns seq column value.
func (dr DatomRow) Seq() int {
	return dr.stmt.ColumnInt(colSeq)
}

// Entity returns entity column value.
func (dr DatomRow) Entity() NodeID {
	var entity NodeID
	if dr.stmt.ColumnBytesCopy(colEntity, entity[:]) != nodeIDSize {
		panic("BUG: unexpected node ID size")
	}
	return entity
}

// Attr returns attr column value.
func (dr DatomRow) Attr() Attribute {
	return Attribute(dr.stmt.ColumnText(colAttr))
}

// ValueType returns value type column value.
func (dr DatomRow) ValueType() ValueType {
	return ValueType(dr.stmt.ColumnInt(colValueType))
}

// Value returns value column value.
func (dr DatomRow) Value() (ValueType, any) {
	vt := dr.ValueType()

	switch vt {
	case ValueTypeRef:
		var ref NodeID
		if dr.stmt.ColumnBytesCopy(colValue, ref[:]) != nodeIDSize {
			panic("BUG: bad node ID size for ref")
		}
		return vt, ref
	case ValueTypeString:
		v := dr.stmt.ColumnText(colValue)
		return vt, v
	case ValueTypeInt:
		return vt, dr.stmt.ColumnInt(colValue)
	case ValueTypeBool:
		v := dr.stmt.ColumnInt(colValue)
		switch v {
		case 0:
			return vt, false
		case 1:
			return vt, true
		default:
			panic("BUG: invalid bool value type value")
		}
	case ValueTypeBytes:
		return vt, dr.stmt.ColumnBytes(colValue)
	case ValueTypeCID:
		c, err := cid.Cast(dr.stmt.ColumnBytes(colValue))
		if err != nil {
			panic("BUG: bad CID " + err.Error())
		}
		return vt, c
	default:
		panic("BUG: invalid value type")
	}
}

// LamportTime returns lamport timestamp of the datom's change.
func (dr DatomRow) LamportTime() int {
	return dr.stmt.ColumnInt(colLamportTime)
}

// This is a query template which gets replaces by the actual string inside an init function bellow.
var forEachDatomRecursiveQuery = `WITH RECURSIVE 
x (
	{{.ChangeCol}},
	{{.SeqCol}},
	{{.EntityCol}},
	{{.AttrCol}},
	{{.ValueTypeCol}},
	{{.ValueCol}}
) AS (
	SELECT
		{{.ChangeCol}},
		{{.SeqCol}},
		{{.EntityCol}},
		{{.AttrCol}},
		{{.ValueTypeCol}},
		{{.ValueCol}}
	FROM {{.DatomsTable}}
	WHERE {{.ObjCol}} = :obj
	AND {{.EntityCol}} = :entity

	UNION

	SELECT
		{{.DatomsTable}}.{{.ChangeCol}},
		{{.DatomsTable}}.{{.SeqCol}},
		{{.DatomsTable}}.{{.EntityCol}},
		{{.DatomsTable}}.{{.AttrCol}},
		{{.DatomsTable}}.{{.ValueTypeCol}},
		{{.DatomsTable}}.{{.ValueCol}}
	FROM {{.DatomsTable}}, x
	WHERE {{.DatomsTable}}.{{.ObjCol}} = :obj
	AND x.{{.ValueTypeCol}} = 0
	AND x.{{.ValueCol}} = {{.DatomsTable}}.{{.EntityCol}}
)
SELECT
	x.{{.ChangeCol}},
	x.{{.SeqCol}},
	x.{{.EntityCol}},
	{{.AttrsTable}}.{{.AttrsAttrCol}},
	x.{{.ValueTypeCol}},
	x.{{.ValueCol}}
FROM x
JOIN {{.AttrsTable}} ON {{.AttrsTable}}.{{.AttrsIDCol}} = x.{{.AttrCol}}
`

func init() {
	tpl, err := template.New("").Parse(forEachDatomRecursiveQuery)
	if err != nil {
		panic(err)
	}

	var buf strings.Builder
	if err := tpl.Execute(&buf, datomTemplate); err != nil {
		panic(err)
	}

	forEachDatomRecursiveQuery = buf.String()
}

var datomTemplate = struct {
	AttrsTable   string
	AttrsIDCol   string
	AttrsAttrCol string

	DatomsTable  string
	ObjCol       string
	ChangeCol    string
	SeqCol       string
	EntityCol    string
	AttrCol      string
	ValueTypeCol string
	ValueCol     string
}{
	AttrsTable:   string(sqliteschema.DatomAttrs),
	AttrsIDCol:   sqliteschema.DatomAttrsID.ShortName(),
	AttrsAttrCol: sqliteschema.DatomAttrsAttr.ShortName(),

	DatomsTable:  string(sqliteschema.Datoms),
	ObjCol:       sqliteschema.DatomsPermanode.ShortName(),
	ChangeCol:    sqliteschema.DatomsChange.ShortName(),
	SeqCol:       sqliteschema.DatomsSeq.ShortName(),
	EntityCol:    sqliteschema.DatomsEntity.ShortName(),
	AttrCol:      sqliteschema.DatomsAttr.ShortName(),
	ValueTypeCol: sqliteschema.DatomsValueType.ShortName(),
	ValueCol:     sqliteschema.DatomsValue.ShortName(),
}

// ForEachDatomRecursive recursively iterates over all datoms starting from a given entity.
func (conn *Conn) ForEachDatomRecursive(obj LocalID, entity NodeID, fn func(DatomRow) error) {
	if conn.err != nil {
		return
	}

	if err := sqlitex.Exec(conn.conn, forEachDatomRecursiveQuery, handleDatoms(fn), obj, entity[:]); err != nil {
		conn.err = err
		return
	}
}

// IterateObjectDatoms loads all the datoms for an object at a given version.
func (conn *Conn) IterateObjectDatoms(obj LocalID, at LocalVersion, fn func(DatomRow) error) {
	if conn.err != nil {
		return
	}

	if len(at) == 0 {
		return
	}

	heads, err := json.Marshal(at)
	if err != nil {
		conn.err = err
		return
	}

	if err := sqlitex.Exec(conn.conn, qIterateObjectDatoms.SQL, handleDatoms(fn), heads); err != nil {
		conn.err = err
		return
	}
}

// LoadObjectDatoms is the same as IterateObjectDatoms but returns the resulting slice.
func (conn *Conn) LoadObjectDatoms(obj LocalID, at LocalVersion) []Datom {
	var out []Datom
	conn.IterateObjectDatoms(obj, at, func(dr DatomRow) error {
		out = append(out, dr.Datom())
		return nil
	})
	return out
}

func handleDatoms(fn func(DatomRow) error) func(*sqlite.Stmt) error {
	return func(stmt *sqlite.Stmt) error {
		return fn(DatomRow{stmt: stmt})
	}
}

// LocalVersion is a set of leaf changes that becomes a version of an Object.
type LocalVersion []LocalID

// SaveVersion saves a named version for a given peer identity.
func (conn *Conn) SaveVersion(object LocalID, name string, id LocalIdentity, heads LocalVersion) {
	if conn.err != nil {
		return
	}

	data, err := json.Marshal(heads)
	if err != nil {
		conn.err = err
		return
	}

	if err := vcssql.NamedVersionsReplace(conn.conn, int(object), int(id.Account), int(id.Device), name, string(data)); err != nil {
		conn.err = err
		return
	}
}

// GetVersion loads a named version.
func (conn *Conn) GetVersion(object LocalID, name string, id LocalIdentity) LocalVersion {
	if conn.err != nil {
		return nil
	}

	res, err := vcssql.NamedVersionsGet(conn.conn, int(object), int(id.Account), int(id.Device), name)
	if err != nil {
		conn.err = err
		return nil
	}

	if res.NamedVersionsVersion == "" {
		return nil
	}

	var out []LocalID
	if err := json.Unmarshal([]byte(res.NamedVersionsVersion), &out); err != nil {
		conn.err = err
		return nil
	}

	return out
}

// DeleteVersion removes a given named version.
func (conn *Conn) DeleteVersion(object LocalID, name string, id LocalIdentity) {
	if conn.err != nil {
		return
	}

	if err := vcssql.NamedVersionsDelete(conn.conn, int(object), int(id.Account), int(id.Device), name); err != nil {
		conn.err = err
		return
	}
}

// LocalVersionToPublic converts a local version into the public one.
func (conn *Conn) LocalVersionToPublic(v LocalVersion) vcs.Version {
	cids := make([]cid.Cid, len(v))
	must.Maybe(&conn.err, func() error {
		for i, vv := range v {
			res, err := vcssql.IPFSBlocksGetHash(conn.conn, int(vv))
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

	return vcs.NewVersion(uint64(len(cids)), cids...)
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

	conn.err = vcssql.IPFSBlocksDeleteByID(conn.conn, int(object))
}

// DeleteChange from the database.
func (conn *Conn) DeleteChange(change LocalID) {
	if conn.err != nil {
		return
	}

	conn.err = vcssql.ChangesDeleteByID(conn.conn, int(change))
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
		t = time.Unix(stmt.ColumnInt64(0), 0)
		return nil
	}

	if err := sqlitex.Exec(conn.conn, q, onStmt, obj); err != nil {
		conn.err = err
		return t
	}

	return t
}

// GetChangeCreateTime returns create time of a change.
func (conn *Conn) GetChangeCreateTime(change LocalID) (t time.Time) {
	if conn.err != nil {
		return t
	}

	const q = "SELECT create_time FROM changes WHERE id = ?"

	onStmt := func(stmt *sqlite.Stmt) error {
		t = time.Unix(stmt.ColumnInt64(0), 0)
		return nil
	}

	if err := sqlitex.Exec(conn.conn, q, onStmt, change); err != nil {
		conn.err = err
		return t
	}

	return t
}

// TouchChange updates the create time for a given change.
func (conn *Conn) TouchChange(change LocalID, now time.Time) {
	if conn.err != nil {
		return
	}

	const q = "UPDATE changes SET create_time = ? WHERE id = ?"

	if err := sqlitex.Exec(conn.conn, q, nil, now.Unix(), change); err != nil {
		conn.err = err
		return
	}
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
		res, err := vcssql.IPFSBlocksLookupCID(conn.conn, int(obj))
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

func (conn *Conn) lookupObjectID(c cid.Cid) int {
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

func (conn *Conn) ensureAccountID(c cid.Cid) int {
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

func (conn *Conn) ensureDeviceID(c cid.Cid) int {
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
