package hyper

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/crdt2"
	"mintter/backend/hlc"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/ipfs"
	"mintter/backend/pkg/dqb"
	"mintter/backend/pkg/strbytes"
	"sort"
	"strings"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/multiformats/go-multibase"
	"github.com/multiformats/go-multicodec"
	"github.com/multiformats/go-multihash"
	"golang.org/x/exp/maps"
	"golang.org/x/exp/slices"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// EntityID is a type for IDs of mutable entities.
type EntityID string

// EntityIDFromCID converts a previously CID-encoded Entity ID back into the initial form.
func EntityIDFromCID(c cid.Cid) (EntityID, error) {
	codec, hash := ipfs.DecodeCID(c)

	if multicodec.Code(codec) != multicodec.Raw {
		return "", fmt.Errorf("failed to convert CID %s into entity ID: unsupported codec %s", c, multicodec.Code(codec))
	}

	mh, err := multihash.Decode(hash)
	if err != nil {
		return "", fmt.Errorf("failed to decode multihash from CID %q: %w", c, err)
	}

	if multicodec.Code(mh.Code) != multicodec.Identity {
		return "", fmt.Errorf("failed to convert CID %s into entity ID: unsupported hash %s", c, multicodec.Code(mh.Code))
	}

	return EntityID(mh.Digest), nil
}

// CID representation of the entity ID. Used for announcing on the DHT.
func (eid EntityID) CID() (cid.Cid, error) {
	c, err := ipfs.NewCID(uint64(multicodec.Raw), uint64(multicodec.Identity), []byte(eid))
	if err != nil {
		return c, fmt.Errorf("failed to convert entity ID %s into CID: %w", eid, err)
	}
	return c, nil
}

// HasPrefix is a convenience function to avoid misplacing arguments
// for the corresponding function in package strings.
func (eid EntityID) HasPrefix(prefix string) bool {
	return strings.HasPrefix(string(eid), prefix)
}

// TrimPrefix is a convenience function to avoid misplacing arguments
// for the corresponding function in package strings.
func (eid EntityID) TrimPrefix(prefix string) string {
	return strings.TrimPrefix(string(eid), prefix)
}

// String representation of the entity ID.
func (eid EntityID) String() string { return string(eid) }

// Entity is our CRDT mutable object.
type Entity struct {
	id           EntityID
	changes      []ParsedBlob[Change]
	applied      map[cid.Cid]int
	heads        map[cid.Cid]struct{}
	state        *crdt2.Map
	maxClock     *hlc.Clock
	actorsIntern map[string]string
	vectorClock  map[string]hlc.Timestamp
}

// NewEntity creates a new entity with a given ID.
func NewEntity(id EntityID) *Entity {
	return &Entity{
		id:           id,
		applied:      make(map[cid.Cid]int),
		heads:        make(map[cid.Cid]struct{}),
		state:        crdt2.NewMap(),
		maxClock:     hlc.NewClock(),
		actorsIntern: make(map[string]string),
		vectorClock:  make(map[string]hlc.Timestamp),
	}
}

// NewEntityWithClock creates a new entity with a provided clock.
func NewEntityWithClock(id EntityID, clock *hlc.Clock) *Entity {
	e := NewEntity(id)
	e.maxClock = clock
	return e
}

// ID returns the ID of the entity.
func (e *Entity) ID() EntityID { return e.id }

// Get a property under a given path.
func (e *Entity) Get(path ...string) (value any, ok bool) {
	return e.state.Get(path...)
}

// LastChangeTime is max time tracked in the HLC.
func (e *Entity) LastChangeTime() hlc.Timestamp {
	return e.maxClock.Max()
}

// AppliedChanges returns the map of applied changes.
// This must be read-only. Not safe for concurrency.
func (e *Entity) AppliedChanges() []ParsedBlob[Change] {
	return e.changes
}

func (e *Entity) State() *crdt2.Map {
	return e.state
}

// Heads returns the map of head changes.
// This must be read only. Not safe for concurrency.
func (e *Entity) Heads() map[cid.Cid]struct{} {
	return e.heads
}

type Version string

func NewVersion(cids ...cid.Cid) Version {
	if len(cids) == 0 {
		return ""
	}

	out := make([]string, 0, len(cids))
	for _, k := range cids {
		out = append(out, k.String())
	}
	sort.Strings(out)

	return Version(strings.Join(out, "."))
}

func (v Version) String() string { return string(v) }

func (v Version) Parse() ([]cid.Cid, error) {
	if v == "" {
		return nil, nil
	}

	parts := strings.Split(string(v), ".")
	out := make([]cid.Cid, len(parts))

	for i, p := range parts {
		c, err := cid.Decode(p)
		if err != nil {
			return nil, fmt.Errorf("failed to parse version: %w", err)
		}
		out[i] = c
	}

	return out, nil
}

func (e *Entity) Version() Version {
	if len(e.heads) == 0 {
		return ""
	}

	return NewVersion(maps.Keys(e.heads)...)
}

// ApplyChange to the internal state.
func (e *Entity) ApplyChange(c cid.Cid, ch Change) error {
	if ch.Entity != e.id {
		return fmt.Errorf("won't apply change from a different entity: want=%q, got=%q", e.id, ch.Entity)
	}

	if _, ok := e.applied[c]; ok {
		return fmt.Errorf("change is already applied")
	}

	var actor string
	{
		au := ch.Signer.UnsafeString()
		a, ok := e.actorsIntern[au]
		if !ok {
			e.actorsIntern[au] = au
			a = au
		}
		actor = a
	}

	if ch.HLCTime < e.vectorClock[actor] {
		return fmt.Errorf("applying change '%s' violates causal order", c)
	}

	e.vectorClock[actor] = ch.HLCTime

	if ch.HLCTime < e.maxClock.Max() {
		return fmt.Errorf("applying change %s out of causal order", c)
	}

	for _, dep := range ch.Deps {
		if _, ok := e.applied[dep]; !ok {
			return fmt.Errorf("missing dependency %s of change %s", dep, c)
		}
		delete(e.heads, dep)
	}

	e.state.ApplyPatch(int64(ch.HLCTime), OriginFromCID(c), ch.Patch)
	if err := e.maxClock.Track(ch.HLCTime); err != nil {
		return err
	}
	e.changes = append(e.changes, ParsedBlob[Change]{c, ch})
	e.applied[c] = len(e.changes) - 1
	e.heads[c] = struct{}{}

	return nil
}

// OriginFromCID creates a CRDT origin from the last 8 chars of the hash.
// Most of the time it's not needed, because HLC is very unlikely to collide.
func OriginFromCID(c cid.Cid) string {
	if !c.Defined() {
		return ""
	}

	str, err := c.StringOfBase(multibase.Base58BTC)
	if err != nil {
		panic(err)
	}
	return str[len(str)-9:]
}

// NextTimestamp returns the next timestamp from the HLC.
func (e *Entity) NextTimestamp() hlc.Timestamp {
	return e.maxClock.MustNow()
}

// ChangeOption is a functional option for creating Changes.
type ChangeOption func(*Change)

// WithAction sets the action field of the change.
func WithAction(action string) ChangeOption {
	return func(c *Change) {
		c.Action = action
	}
}

// WithMessage sets the message field of the change.
func WithMessage(msg string) ChangeOption {
	return func(c *Change) {
		c.Message = msg
	}
}

// CreateChange entity creating a change blob, and applying it to the internal state.
func (e *Entity) CreateChange(ts hlc.Timestamp, signer core.KeyPair, delegation cid.Cid, patch map[string]any, opts ...ChangeOption) (hb Blob, err error) {
	hb, err = NewChange(e.id, maps.Keys(e.heads), ts, signer, delegation, patch, opts...)
	if err != nil {
		return hb, err
	}

	if err := e.ApplyChange(hb.CID, hb.Decoded.(Change)); err != nil {
		return hb, err
	}

	return hb, nil
}

// ReplaceChange creates a new change instead of an existing one. The change to replace must be the current head.
func (e *Entity) ReplaceChange(old cid.Cid, ts hlc.Timestamp, signer core.KeyPair, delegation cid.Cid, patch map[string]any, opts ...ChangeOption) (hb Blob, err error) {
	if len(e.heads) != 1 {
		return hb, fmt.Errorf("must only have one head change to replace")
	}

	if _, ok := e.heads[old]; !ok {
		return hb, fmt.Errorf("change to replace must be the current head")
	}

	var prev Change
	{
		idx, ok := e.applied[old]
		if !ok {
			return hb, fmt.Errorf("change to be replaced must be applied")
		}
		prev = e.changes[idx].Data
	}

	e.state.ForgetState(int64(prev.HLCTime), OriginFromCID(old))
	delete(e.applied, old)
	delete(e.heads, old)

	hb, err = NewChange(e.id, prev.Deps, ts, signer, delegation, patch, opts...)
	if err != nil {
		return hb, err
	}

	if err := e.ApplyChange(hb.CID, hb.Decoded.(Change)); err != nil {
		return hb, err
	}

	return hb, nil
}

// SortCIDs sorts the multiple CIDs when determinism is needed.
// The sorting is done in place, and the same slice is returned for convenience.
func SortCIDs(cids []cid.Cid) []cid.Cid {
	slices.SortFunc(cids, func(a, b cid.Cid) int { return strings.Compare(a.KeyString(), b.KeyString()) })
	return cids
}

func (bs *Storage) ForEachComment(ctx context.Context, target string, fn func(c cid.Cid, cmt Comment) error) (err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	rdb, err := hypersql.EntitiesLookupID(conn, target)
	if err != nil {
		return err
	}
	if rdb.ResourcesID == 0 {
		return fmt.Errorf("resource %s not found: make sure resource ID doesn't have any additional parameters", target)
	}

	buf := make([]byte, 0, 1024*1024) // preallocating 1MB for decompression.
	err = sqlitex.Exec(conn, qForEachComment(), func(stmt *sqlite.Stmt) error {
		var (
			codec = stmt.ColumnInt64(0)
			hash  = stmt.ColumnBytesUnsafe(1)
			data  = stmt.ColumnBytesUnsafe(2)
		)

		buf, err = bs.bs.decoder.DecodeAll(data, buf)
		if err != nil {
			return err
		}

		chcid := cid.NewCidV1(uint64(codec), hash)
		var cmt Comment
		if err := cbornode.DecodeInto(buf, &cmt); err != nil {
			return fmt.Errorf("forEachComment: failed to decode comment %s for target %s: %w", chcid, target, err)
		}

		if err := fn(chcid, cmt); err != nil {
			return err
		}

		buf = buf[:0] // reset the slice reusing the backing array

		return nil
	}, rdb.ResourcesID)
	if err != nil {
		return err
	}

	return nil
}

var qForEachComment = dqb.Str(`
	SELECT
		blobs.codec,
		blobs.multihash,
		blobs.data
	FROM resource_links
	JOIN blobs ON blobs.id = resource_links.source
	WHERE resource_links.target = :resource
	AND resource_links.type = 'comment/target';
`)

func (bs *Storage) ForEachChange(ctx context.Context, eid EntityID, fn func(c cid.Cid, ch Change) error) (err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	edb, err := hypersql.EntitiesLookupID(conn, string(eid))
	if err != nil {
		return err
	}
	if edb.ResourcesID == 0 {
		return status.Errorf(codes.NotFound, "entity %q not found", eid)
	}

	changes, err := hypersql.ChangesListForEntity(conn, string(eid))
	if err != nil {
		return err
	}

	buf := make([]byte, 0, 1024*1024) // preallocating 1MB for decompression.
	for _, change := range changes {
		buf, err = bs.bs.decoder.DecodeAll(change.BlobsData, buf)
		if err != nil {
			return err
		}

		chcid := cid.NewCidV1(uint64(change.BlobsCodec), change.BlobsMultihash)
		var ch Change
		if err := cbornode.DecodeInto(buf, &ch); err != nil {
			return fmt.Errorf("forEachChange: failed to decode change %s for entity %s: %w", chcid, eid, err)
		}

		if err := fn(chcid, ch); err != nil {
			return err
		}

		buf = buf[:0] // reset the slice reusing the backing array
	}

	return nil
}

// LoadEntityAll loads the entity with all the changes.
//
// TODO(burdiyan): DRY out all the loading methods.
func (bs *Storage) LoadEntityAll(ctx context.Context, eid EntityID) (e *Entity, err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	edb, err := hypersql.EntitiesLookupID(conn, string(eid))
	if err != nil {
		return nil, err
	}
	if edb.ResourcesID == 0 {
		return nil, status.Errorf(codes.NotFound, "entity %q not found", eid)
	}

	entity := NewEntity(eid)
	buf := make([]byte, 0, 1024*1024) // preallocating 1MB for decompression.
	if err := sqlitex.Exec(conn, qLoadEntityAll(), func(stmt *sqlite.Stmt) error {
		var (
			codec = stmt.ColumnInt64(0)
			hash  = stmt.ColumnBytesUnsafe(1)
			data  = stmt.ColumnBytesUnsafe(2)
		)

		buf, err = bs.bs.decoder.DecodeAll(data, buf)
		if err != nil {
			return err
		}

		c := cid.NewCidV1(uint64(codec), hash)
		var ch Change
		if err := cbornode.DecodeInto(buf, &ch); err != nil {
			return fmt.Errorf("loadEntity: failed to decode change %q for entity %q: %w", c, eid, err)
		}

		if err := entity.ApplyChange(c, ch); err != nil {
			return err
		}

		// Reset the slice to reuse the underlying array for the next decompression.
		buf = buf[:0]
		return nil
	}, edb.ResourcesID); err != nil {
		return nil, err
	}
	// TODO(burdiyan): this is not a great way to handle not found errors.
	// But in a lot of places we rely on that behavior, which was more of an accident.
	// Need to clean up at some point.
	if len(entity.changes) == 0 {
		return nil, nil
	}

	return entity, nil
}

var qLoadEntityAll = dqb.Str(`
	SELECT
		blobs.codec,
		blobs.multihash,
		blobs.data
	FROM structural_blobs
	JOIN blobs ON blobs.id = structural_blobs.id
	LEFT JOIN drafts ON drafts.resource = structural_blobs.resource AND drafts.blob = structural_blobs.id
	WHERE structural_blobs.type = 'Change'
	AND structural_blobs.resource = :entity
	AND drafts.blob IS NULL
	ORDER BY structural_blobs.ts;
`)

// LoadEntity from the database. If not found returns nil result and nil error.
// It returns the latest version as per the owner of the entity.
func (bs *Storage) LoadEntity(ctx context.Context, eid EntityID) (e *Entity, err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	edb, err := hypersql.EntitiesLookupID(conn, string(eid))
	if err != nil {
		return nil, err
	}
	if edb.ResourcesID == 0 {
		return nil, status.Errorf(codes.NotFound, "entity %q not found", eid)
	}

	entity := NewEntity(eid)
	buf := make([]byte, 0, 1024*1024) // preallocating 1MB for decompression.
	if err := sqlitex.Exec(conn, qLoadEntity(), func(stmt *sqlite.Stmt) error {
		var (
			codec = stmt.ColumnInt64(0)
			hash  = stmt.ColumnBytesUnsafe(1)
			data  = stmt.ColumnBytesUnsafe(2)
		)

		buf, err = bs.bs.decoder.DecodeAll(data, buf)
		if err != nil {
			return err
		}

		c := cid.NewCidV1(uint64(codec), hash)
		var ch Change
		if err := cbornode.DecodeInto(buf, &ch); err != nil {
			return fmt.Errorf("loadEntity: failed to decode change %q for entity %q: %w", c, eid, err)
		}

		if err := entity.ApplyChange(c, ch); err != nil {
			return err
		}

		// Reset the slice to reuse the underlying array for the next decompression.
		buf = buf[:0]
		return nil
	}, edb.ResourcesID); err != nil {
		return nil, err
	}
	// TODO(burdiyan): this is not a great way to handle not found errors.
	// But in a lot of places we rely on that behavior, which was more of an accident.
	// Need to clean up at some point.
	if len(entity.changes) == 0 {
		return nil, nil
	}

	return entity, nil
}

// In this query we first collect the blobs authored by the owner of the entity,
// then resolve their transitive dependencies,
// and then we finally join with the actual blob data.
var qLoadEntity = dqb.Str(`
	WITH RECURSIVE selected (id) AS (
		SELECT structural_blobs.id
		FROM structural_blobs
		JOIN resources ON structural_blobs.resource = resources.id
		LEFT JOIN drafts ON drafts.resource = structural_blobs.resource AND drafts.blob = structural_blobs.id
		WHERE structural_blobs.type = 'Change'
		AND structural_blobs.resource = :entity
		AND structural_blobs.author = resources.owner
		AND drafts.blob IS NULL
		UNION
		SELECT change_deps.parent
		FROM selected
		JOIN change_deps ON change_deps.child = selected.id
	)
	SELECT
		blobs.codec,
		blobs.multihash,
		blobs.data
	FROM selected
	-- Using cross join here to force the query planner to use the primary index on blobs.
	-- Otherwise, for some reason the query planner chooses to scan over all the blobs table
	-- probably because it assumes that the CTE is large and doesn't have indexes.
	-- But that's OK in this case, because it's a recursive query that we'll have to scan entirely anyway.
	CROSS JOIN blobs ON blobs.id = selected.id
	JOIN structural_blobs ON structural_blobs.id = selected.id
	ORDER BY structural_blobs.ts;
`)

type Draft struct {
	*Entity
	CID    cid.Cid
	Change Change
}

func (bs *Storage) LoadDraft(ctx context.Context, eid EntityID) (*Draft, error) {
	// load draft change
	c, err := bs.FindDraft(ctx, eid)
	if err != nil {
		return nil, err
	}

	var ch Change
	if err := bs.LoadBlob(ctx, c, &ch); err != nil {
		return nil, err
	}

	var entity *Entity
	if len(ch.Deps) == 0 {
		entity = NewEntity(eid)
	} else {
		e, err := bs.LoadEntityFromHeads(ctx, eid, ch.Deps...)
		if err != nil {
			return nil, err
		}
		entity = e
	}

	if entity == nil {
		return nil, nil
	}

	if err := entity.maxClock.Track(ch.HLCTime); err != nil {
		return nil, err
	}

	return &Draft{
		Entity: entity,
		CID:    c,
		Change: ch,
	}, nil
}

// LoadDraftEntity includes draft changes.
func (bs *Storage) LoadDraftEntity(ctx context.Context, eid EntityID) (*Entity, error) {
	draft, err := bs.FindDraft(ctx, eid)
	if err != nil {
		return nil, err
	}

	return bs.LoadEntityFromHeads(ctx, eid, draft)
}

// FindDraft for a given entity.
func (bs *Storage) FindDraft(ctx context.Context, eid EntityID) (cid.Cid, error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return cid.Undef, err
	}
	defer release()

	res, err := hypersql.DraftsGet(conn, string(eid))
	if err != nil {
		return cid.Undef, err
	}
	if res.DraftsViewBlobID == 0 {
		return cid.Undef, fmt.Errorf("no draft for entity %s", eid)
	}

	return cid.NewCidV1(uint64(res.DraftsViewCodec), res.DraftsViewMultihash), nil
}

// LoadEntityFromHeads returns the loaded entity at a given "version" corresponding to the provided HEAD changes.
func (bs *Storage) LoadEntityFromHeads(ctx context.Context, eid EntityID, heads ...cid.Cid) (e *Entity, err error) {
	if len(heads) == 0 {
		return nil, fmt.Errorf("must specify heads to load: %s", eid)
	}

	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	dbheads := make([]int64, 0, len(heads))
	for _, c := range heads {
		res, err := hypersql.BlobsGetSize(conn, c.Hash())
		if err != nil {
			return nil, err
		}
		if res.BlobsID == 0 || res.BlobsSize < 0 {
			return nil, status.Errorf(codes.NotFound, "no such head %s for entity %s", c, eid)
		}
		dbheads = append(dbheads, res.BlobsID)
	}

	if len(dbheads) != len(heads) {
		return nil, fmt.Errorf("couldn't resolve all the heads %v for entity %s", heads, eid)
	}

	jsonheads, err := json.Marshal(dbheads)
	if err != nil {
		return nil, err
	}

	return bs.loadFromHeads(conn, eid, localHeads(strbytes.String(jsonheads)))
}

// localHeads is a JSON-encoded array of integers corresponding to heads.
type localHeads string

func (bs *Storage) loadFromHeads(conn *sqlite.Conn, eid EntityID, heads localHeads) (e *Entity, err error) {
	if heads == "" || heads == "null" {
		heads = "[]"
	}

	cset, err := hypersql.ChangesResolveHeads(conn, string(heads))
	if err != nil {
		return nil, err
	}

	changes, err := hypersql.ChangesListFromChangeSet(conn, cset.ResolvedJSON, string(eid))
	if err != nil {
		return nil, err
	}
	if len(changes) == 0 {
		return nil, nil
	}

	entity := NewEntity(eid)
	buf := make([]byte, 0, 1024*1024) // preallocating 1MB for decompression.
	for _, change := range changes {
		buf, err = bs.bs.decoder.DecodeAll(change.StructuralBlobsViewData, buf)
		if err != nil {
			return nil, err
		}

		chcid := cid.NewCidV1(uint64(change.StructuralBlobsViewCodec), change.StructuralBlobsViewMultihash)
		var ch Change
		if err := cbornode.DecodeInto(buf, &ch); err != nil {
			return nil, fmt.Errorf("loadFromHeads: failed to decode change %s for entity %s: %w", chcid, eid, err)
		}

		if err := entity.ApplyChange(chcid, ch); err != nil {
			return nil, err
		}

		buf = buf[:0] // reset the slice reusing the backing array
	}

	return entity, nil
}

// ParsedBlob is a decoded IPLD blob.
type ParsedBlob[T any] struct {
	CID  cid.Cid
	Data T
}

// NewUnforgeableID creates a new random ID that is verifiable with the author's public key.
// It return the ID and the nonce. The nonce argument can be nil in which case a new nonce will be created.
// Otherwise the same nonce will be returned.
func NewUnforgeableID(prefix string, author core.Principal, nonce []byte, ts int64) (string, []byte) {
	const hashSize = 22

	if nonce == nil {
		nonce = make([]byte, 16)
		_, err := rand.Read(nonce)
		if err != nil {
			panic(err)
		}
	}

	h := sha256.New()
	if _, err := h.Write(author); err != nil {
		panic(err)
	}
	if _, err := h.Write(nonce); err != nil {
		panic(err)
	}

	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], uint64(ts))

	if _, err := h.Write(buf[:]); err != nil {
		panic(err)
	}

	dig := h.Sum(nil)
	base, err := multibase.Encode(multibase.Base58BTC, dig)
	if err != nil {
		panic(err)
	}

	// Using last [hashSize] characters to avoid multibase prefix,
	// and reduce the size of the resulting ID.
	// We don't use full hash digest here, to make our IDs shorter.
	// But it should have enough collision resistance for our purpose.
	return prefix + base[len(base)-hashSize:], nonce
}

func verifyUnforgeableID(id EntityID, prefix int, owner core.Principal, nonce []byte, ts int64) error {
	id2, _ := NewUnforgeableID(string(id[:prefix]), owner, nonce, ts)
	if id2 != string(id) {
		return fmt.Errorf("failed to verify unforgeable ID want=%q got=%q", id, id2)
	}

	return nil
}
