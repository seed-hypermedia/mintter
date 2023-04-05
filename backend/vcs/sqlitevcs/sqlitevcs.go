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
	"mintter/backend/db/sqlitegen"
	"mintter/backend/db/sqlitegen/qb"
	"mintter/backend/db/sqliteschema"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"mintter/backend/vcs/vcssql"
	"sort"
	"strconv"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/leporo/sqlf"
	"github.com/multiformats/go-multihash"
	"go.uber.org/multierr"
	"google.golang.org/protobuf/proto"
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

// Attr ensures an internal ID for an attribute.

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

// IterateChanges for a given object.
func (conn *Conn) IterateChanges(obj cid.Cid, includePrivate bool, cs ChangeSet, fn func(vc vcs.VerifiedChange) error) {
	ohash := obj.Hash()

	must.Maybe(&conn.err, func() error {
		var (
			codec int
			hash  []byte
		)
		q := sqlf.
			Select(sqliteschema.C_ChangesDerefChangeCodec).To(&codec).
			Select(sqliteschema.C_ChangesDerefChangeHash).To(&hash).
			From(sqliteschema.T_ChangesDeref).
			Where(sqliteschema.C_ChangesDerefObjectHash+" = ?", ohash)
		defer q.Close()

		if !includePrivate {
			q = q.Where(sqliteschema.C_ChangesDerefIsDraft + ` = 0`)
		}

		if cs != nil {
			q = q.Where(sqliteschema.C_ChangesDerefChangeID+` IN (SELECT value FROM json_each(?))`, cs)
		}

		return sqlitex.Exec(conn.conn, q.String(), func(stmt *sqlite.Stmt) error {
			stmt.Scan(q.Dest()...)
			c := cid.NewCidV1(uint64(codec), hash)
			blk, err := conn.bs.get(conn.conn, c)
			if err != nil {
				return fmt.Errorf("failed to iterate change block %s: %w", c, err)
			}
			cc, err := vcs.DecodeChange(blk.RawData())
			if err != nil {
				return fmt.Errorf("failed to decode change %s: %w", c, err)
			}

			vc := vcs.VerifiedChange{
				Block:   blk,
				Decoded: cc,
			}

			return fn(vc)
		}, q.Args()...)
	})
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

// PublicChangeInfo is the public information about a Change.
type PublicChangeInfo struct {
	ID         cid.Cid
	Author     cid.Cid
	CreateTime time.Time
	Deps       []cid.Cid
}

// GetPublicChangeInfo returns the public information about a Change.
func (conn *Conn) GetPublicChangeInfo(c cid.Cid) (info PublicChangeInfo, err error) {
	pk, err := vcssql.IPFSBlocksLookupPK(conn.conn, c.Hash())
	if err != nil {
		return info, err
	}

	// Get dependencies for our change.
	{
		var (
			codec    int64
			ipfsHash []byte
		)
		q := sqlf.From(sqliteschema.ChangeDeps.String()).
			Select(sqliteschema.IPFSBlocksCodec.String()).To(&codec).
			Select(sqliteschema.IPFSBlocksMultihash.String()).To(&ipfsHash).
			Join(sqliteschema.IPFSBlocks.String(), string(sqliteschema.IPFSBlocksID)+" = "+sqliteschema.ChangeDepsParent.String()).
			Where(sqliteschema.ChangeDepsChild.String()+" = ?", pk.IPFSBlocksID)
		defer q.Close()

		if err := sqlitex.Exec(conn.conn, q.String(), func(stmt *sqlite.Stmt) error {
			stmt.Scan(q.Dest()...)
			info.Deps = append(info.Deps, cid.NewCidV1(uint64(codec), ipfsHash))
			return nil
		}, q.Args()...); err != nil {
			return info, err
		}
	}

	// Get other metadata about our change.
	var (
		accountHash []byte
		startTime   int64
	)
	q := sqlf.From(sqliteschema.Changes.String()).
		Select(sqliteschema.AccountsMultihash.String()).To(&accountHash).
		Select(sqliteschema.ChangesStartTime.String()).To(&startTime).
		Join(string(sqliteschema.Accounts), sqliteschema.AccountsID.String()+" = "+sqliteschema.ChangesAccountID.String()).
		Where(sqliteschema.ChangesID.String()+" = ?", pk.IPFSBlocksID).
		Limit(1)
	defer q.Close()

	if err := sqlitex.Exec(conn.conn, q.String(), func(stmt *sqlite.Stmt) error {
		stmt.Scan(q.Dest()...)

		acchash, err := multihash.Cast(accountHash)
		if err != nil {
			return err
		}

		info.ID = c
		info.Author = cid.NewCidV1(core.CodecAccountKey, acchash)
		info.CreateTime = hlc.Unpack(startTime).Time()

		return nil
	}, q.Args()...); err != nil {
		return info, err
	}

	return info, nil
}

// ListChanges for a given object.
func (conn *Conn) ListChanges(obj cid.Cid) ([]PublicChangeInfo, error) {
	o := conn.LookupPermanode(obj)
	if o == 0 {
		return nil, fmt.Errorf("can't list changes: object %s not found", obj)
	}

	var (
		changeID    int
		codec       int
		changeHash  []byte
		accountHash []byte
		startTime   int64
	)
	q := sqlf.From(string(sqliteschema.IPFSBlocks)).
		Select(sqliteschema.ChangesID.String()).To(&changeID).
		Select(sqliteschema.IPFSBlocksMultihash.String()).To(&changeHash).
		Select(sqliteschema.IPFSBlocksCodec.String()).To(&codec).
		Select(sqliteschema.AccountsMultihash.String()).To(&accountHash).
		Select(sqliteschema.ChangesStartTime.String()).To(&startTime).
		LeftJoin(string(sqliteschema.Changes), sqliteschema.ChangesID.String()+" = "+sqliteschema.IPFSBlocksID.String()).
		Join(string(sqliteschema.Accounts), sqliteschema.AccountsID.String()+" = "+sqliteschema.ChangesAccountID.String()).
		Where(sqliteschema.ChangesPermanodeID.String()+" = ?", o)
	defer q.Close()

	var out []PublicChangeInfo
	var ids []int

	if err := sqlitex.Exec(conn.conn, q.String(), func(stmt *sqlite.Stmt) error {
		stmt.Scan(q.Dest()...)
		ids = append(ids, changeID)

		info := PublicChangeInfo{
			ID:         cid.NewCidV1(uint64(codec), changeHash),
			Author:     cid.NewCidV1(core.CodecAccountKey, accountHash),
			CreateTime: hlc.Unpack(startTime).Time(),
		}
		out = append(out, info)

		return nil
	}, q.Args()...); err != nil {
		return nil, err
	}

	for i, id := range ids {
		// Get dependencies for our change.
		{
			var (
				codec    int64
				ipfsHash []byte
			)
			q := sqlf.From(sqliteschema.ChangeDeps.String()).
				Select(sqliteschema.IPFSBlocksCodec.String()).To(&codec).
				Select(sqliteschema.IPFSBlocksMultihash.String()).To(&ipfsHash).
				Join(sqliteschema.IPFSBlocks.String(), string(sqliteschema.IPFSBlocksID)+" = "+sqliteschema.ChangeDepsParent.String()).
				Where(sqliteschema.ChangeDepsChild.String()+" = ?", id)
			defer q.Close()

			if err := sqlitex.Exec(conn.conn, q.String(), func(stmt *sqlite.Stmt) error {
				stmt.Scan(q.Dest()...)
				out[i].Deps = append(out[i].Deps, cid.NewCidV1(uint64(codec), ipfsHash))
				return nil
			}, q.Args()...); err != nil {
				return nil, err
			}
		}
	}

	return out, nil
}

// GetChangeTimestamp returns the timestmap of a given change.
func (conn *Conn) GetChangeTimestamp(c cid.Cid) (int64, error) {
	const q = `
SELECT ` + sqliteschema.C_ChangesStartTime + `
FROM ` + sqliteschema.T_Changes + `
WHERE ` + sqliteschema.C_ChangesID + ` = (
	SELECT ` + sqliteschema.C_IPFSBlocksID + `
	FROM ` + sqliteschema.T_IPFSBlocks + `
	WHERE ` + sqliteschema.C_IPFSBlocksMultihash + ` = ?
	LIMIT 1
)
`

	chash := c.Hash()

	var ts int64
	if err := sqlitex.Exec(conn.conn, q, func(stmt *sqlite.Stmt) error {
		ts = stmt.ColumnInt64(0)
		return nil
	}, chash); err != nil {
		return 0, err
	}

	if ts == 0 {
		return 0, fmt.Errorf("no timestamp for change %s", c)
	}

	return ts, nil
}

// Change kinds.
const (
	KindRegistration = "mintter:Registration"
	KindProfile      = "mintter:Profile"
	KindDocument     = "mintter:Document"
	KindOpaque       = "mintter:Opaque" // opaque change; mostly used in tests.
)

// GetDraftChange for a given object.
func (conn *Conn) GetDraftChange(obj cid.Cid) (c cid.Cid, err error) {
	var (
		_ = sqliteschema.T_DraftChanges
		_ = sqliteschema.C_DraftChangesID
		_ = sqliteschema.C_DraftChangesPermanodeID
		_ = sqliteschema.T_IPFSBlocks
		_ = sqliteschema.C_IPFSBlocksMultihash
	)

	const q = `
SELECT
	codec,
	multihash
FROM ipfs_blocks
WHERE id = (SELECT id FROM draft_changes WHERE permanode_id = (
	SELECT id FROM ipfs_blocks
	WHERE codec = ?
	AND multihash = ?
	LIMIT 1
) LIMIT 1)
`

	ocodec, ohash := ipfs.DecodeCID(obj)

	var (
		codec int
		hash  []byte
	)
	if err := sqlitex.Exec(conn.conn, q, func(stmt *sqlite.Stmt) error {
		stmt.Scan(&codec, &hash)
		c = cid.NewCidV1(uint64(codec), hash)
		return nil
	}, ocodec, ohash); err != nil {
		return c, err
	}

	if !c.Defined() {
		return c, fmt.Errorf("no draft for object %s: %w", obj, errNotFound)
	}

	return c, nil
}

// MarkChangeAsDraft marks a change to be a draft one.
func (conn *Conn) MarkChangeAsDraft(obj, change cid.Cid) {
	// Making a rough query here.
	// Using the generated columns to detect issues when changing schema.
	var (
		_ = sqliteschema.T_DraftChanges
		_ = sqliteschema.C_DraftChangesID
		_ = sqliteschema.T_IPFSBlocks
		_ = sqliteschema.C_IPFSBlocksMultihash
	)

	const q = `
INSERT INTO draft_changes (id, permanode_id)
VALUES (
	(SELECT id FROM ipfs_blocks WHERE multihash = ? LIMIT 1),
	(SELECT id FROM ipfs_blocks WHERE multihash = ? LIMIT 1)
)`

	must.Maybe(&conn.err, func() error {
		return sqlitex.Exec(conn.conn, q, nil, change.Hash(), obj.Hash())
	})
}

// PublishDraft makes draft change for a given object public.
func (conn *Conn) PublishDraft(obj cid.Cid) {
	// Making a rough query here.
	// Using the generated columns to detect issues when changing schema.
	var (
		_ = sqliteschema.T_DraftChanges
		_ = sqliteschema.C_DraftChangesID
		_ = sqliteschema.T_IPFSBlocks
		_ = sqliteschema.C_IPFSBlocksCodec
		_ = sqliteschema.C_IPFSBlocksMultihash
	)

	const q = `
DELETE FROM draft_changes
WHERE permanode_id = (
	SELECT id FROM ipfs_blocks
	WHERE codec = ?
	AND multihash = ?
	LIMIT 1
)`

	codec, hash := ipfs.DecodeCID(obj)

	must.Maybe(&conn.err, func() error {
		return sqlitex.Exec(conn.conn, q, nil, codec, hash)
	})
}

// RewriteChange in place. Must only be done with draft changes.
func (conn *Conn) RewriteChange(old cid.Cid, vc vcs.VerifiedChange) {
	must.Maybe(&conn.err, func() error {
		oldid, err := conn.bs.deleteBlock(conn.conn, old)
		if err != nil {
			return err
		}
		conn.storeChangeWithID(vc, oldid)
		conn.MarkChangeAsDraft(vc.Decoded.Object, vc.Cid())
		return nil
	})
}

// StoreChange in the database. Assumes it's a correct and validated change.
// The permanode must already exist in the database. Also the parents of change.
func (conn *Conn) StoreChange(vc vcs.VerifiedChange) {
	conn.storeChangeWithID(vc, 0)
}

func (conn *Conn) storeChangeWithID(vc vcs.VerifiedChange, oldid int64) {
	must.Maybe(&conn.err, func() error {
		obj := conn.lookupObjectID(vc.Decoded.Object)
		if obj == 0 {
			return fmt.Errorf("failed to store change %s: missing permanode %s", vc.Cid(), vc.Decoded.Object)
		}

		for _, dep := range vc.Decoded.Parents {
			ok, err := conn.bs.has(conn.conn, dep)
			if err != nil {
				return fmt.Errorf("failed to check change parents in the database: %w", err)
			}
			if !ok {
				return fmt.Errorf("failed to store change %s: missing parent %s", vc.Cid(), dep)
			}
		}

		if err := conn.bs.putBlockWithID(conn.conn, LocalID(oldid), vc.Cid(), vc.RawData()); err != nil {
			return err
		}

		res, err := vcssql.IPFSBlocksLookupPK(conn.conn, vc.Cid().Hash())
		if err != nil || res.IPFSBlocksID == 0 {
			return fmt.Errorf("ipfs block for the remote change must exist before indexing: %w", err)
		}
		change := LocalID(res.IPFSBlocksID)
		ch := vc.Decoded

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

		switch ch.Kind {
		case KindRegistration:
			if err := vcssql.AccountDevicesUpdateDelegation(conn.conn, int64(change), int64(idLocal.Account), int64(idLocal.Device)); err != nil {
				return err
			}
		case KindProfile:
			// TODO(burdiyan): index profiles if needed.
		case KindDocument:
			// TODO(burdiyan): avoid having to deserialize again here.
			patch := &documents.UpdateDraftRequestV2{}
			if err := proto.Unmarshal(ch.Body, patch); err != nil {
				return fmt.Errorf("failed to parse body of document change %s: %w", vc.Cid(), err)
			}

			seen := make(map[string]struct{}, len(patch.Changes))

			// This obviously doesn't need to happen here.
			// ATM we'll have all the editing history stored in the change, i.e. every block update will be included.
			// But we only want to index links from the most recent version of a block. So, we iterate backwards here
			// and remember which blocks we've seen. In reality changes should be cleaned up by the author.
			for i := len(patch.Changes) - 1; i >= 0; i-- {
				pc := patch.Changes[i]
				switch op := pc.Op.(type) {
				case *documents.DocumentChange_ReplaceBlock:
					block := op.ReplaceBlock
					_, ok := seen[block.Id]
					if ok {
						continue
					}

					if err := indexBacklinks(conn, LocalID(obj), change, block); err != nil {
						return fmt.Errorf("failed to index backlinks: %w", err)
					}
				}
			}
		case KindOpaque:
			// No indexing.
		default:
			return fmt.Errorf("failed to store change %s: unknown kind %s", vc.Cid(), vc.Decoded.Kind)
		}

		return nil
	})
}

// GetBlock from the block store.
func (conn *Conn) GetBlock(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	return conn.bs.get(conn.conn, c)
}

// DeleteBlock from the block store.
func (conn *Conn) DeleteBlock(ctx context.Context, c cid.Cid) error {
	_, err := conn.bs.deleteBlock(conn.conn, c)
	return err
}

// GetHeads returns heads for a given object.
func (conn *Conn) GetHeads(obj cid.Cid, includeDrafts bool) (heads []cid.Cid, err error) {
	lid := conn.LookupPermanode(obj)

	var (
		headCodec int
		headHash  []byte
	)
	qq := sqlf.
		Select(sqliteschema.C_IPFSBlocksCodec).To(&headCodec).
		Select(sqliteschema.C_IPFSBlocksMultihash).To(&headHash).
		From(sqliteschema.T_ChangeHeads).
		Join(sqliteschema.T_IPFSBlocks, sqliteschema.C_IPFSBlocksID+" = "+sqliteschema.C_ChangeHeadsID).
		Where(sqliteschema.C_ChangeHeadsPermanodeID+" = ?", lid)
	defer qq.Close()

	draft, err := conn.GetDraftChange(obj)
	if err != nil && !errors.Is(err, errNotFound) {
		return nil, err
	}

	if err := sqlitex.Exec(conn.conn, qq.String(), func(stmt *sqlite.Stmt) error {
		stmt.Scan(qq.Dest()...)
		c := cid.NewCidV1(uint64(headCodec), headHash)
		if !includeDrafts && c.Equals(draft) {
			return nil
		}

		heads = append(heads, c)
		return nil
	}, qq.Args()...); err != nil {
		return nil, fmt.Errorf("failed to query change heads: %w", err)
	}

	return heads, nil
}

// PutBlock puts an IPFS block into the database.
func (conn *Conn) PutBlock(blk blocks.Block) {
	must.Maybe(&conn.err, func() error {
		return conn.bs.putBlock(conn.conn, blk.Cid(), blk.RawData())
	})
}

// LocalVersion is a set of leaf changes that becomes a version of an Object.
type LocalVersion []LocalID

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

var errNotFound = errors.New("not found")

// ChangeSet is a JSON-encoded array of LocalID,
// which represents a full list of changes for a given
// object at a given point in time.
type ChangeSet []byte

var qLoadChangeSet = qb.MakeQuery(sqliteschema.Schema, "loadChangeSet", sqlitegen.QueryKindMany,
	"WITH RECURSIVE changeset (change) AS", qb.SubQuery(
		"SELECT value",
		"FROM json_each(:heads)",
		"UNION",
		"SELECT", qb.Results(
			sqliteschema.ChangeDepsParent,
		),
		"FROM", sqliteschema.ChangeDeps,
		"JOIN changeset ON changeset.change", "=", sqliteschema.ChangeDepsChild,
	), '\n',
	"SELECT json_group_array(change)", '\n',
	"FROM changeset", '\n',
	"LIMIT 1",
)

// ResolveChangeSet recursively walks the DAG of Changes from the given leafs (heads)
// up to the first change and returns the list of resolved changes as a JSON array.
func (conn *Conn) ResolveChangeSet(object LocalID, heads LocalVersion) (cs ChangeSet) {
	must.Maybe(&conn.err, func() error {
		heads, err := json.Marshal(heads)
		if err != nil {
			return nil
		}

		return sqlitex.Exec(conn.conn, qLoadChangeSet.SQL, func(stmt *sqlite.Stmt) error {
			cs = stmt.ColumnBytes(0)
			return nil
		}, heads)
	})
	return cs
}

// ChangeInfo contains metadata about a given Change.
type ChangeInfo struct {
	LocalID LocalID
	CID     cid.Cid
}

// IsZero indicates whether it's a zero value.
func (ci ChangeInfo) IsZero() bool {
	return ci.LocalID == 0
}

// StringID returns ChangeID as a string. Including for in-progress changes.
func (ci ChangeInfo) StringID() string {
	if ci.IsZero() {
		return ""
	}

	if ci.CID.Defined() {
		return ci.CID.String()
	}

	return "$LOCAL$:" + strconv.Itoa(int(ci.LocalID))
}
