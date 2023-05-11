package hyper

import (
	"context"
	"encoding/json"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/crdt2"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/vcs/hlc"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/multiformats/go-multibase"
	"golang.org/x/exp/maps"
	"golang.org/x/exp/slices"
)

// EntityID is a type for IDs of mutable entities.
type EntityID string

// NewEntityID creates a new ID for an entity.
func NewEntityID(namespace string, id string) EntityID {
	return EntityID(namespace + ":" + id)
}

// Entity is our CRDT mutable object.
type Entity struct {
	id      EntityID
	applied map[cid.Cid]Change
	heads   map[cid.Cid]struct{}
	state   *crdt2.Map
	clock   hlc.Clock
}

// NewEntity creates a new entity with a given ID.
func NewEntity(id EntityID) *Entity {
	return &Entity{
		id:      id,
		applied: make(map[cid.Cid]Change),
		heads:   make(map[cid.Cid]struct{}),
		state:   crdt2.NewMap(),
	}
}

// ID returns the ID of the entity.
func (e *Entity) ID() EntityID { return e.id }

// Get a property under a given path.
func (e *Entity) Get(path ...string) (value any, ok bool) {
	return e.state.Get(path...)
}

// LastChangeTime is max time tracked in the HLC.
func (e *Entity) LastChangeTime() hlc.Time {
	return e.clock.Max()
}

// AppliedChanges returns the map of applied changes.
// This must be read-only. Not safe for concurrency.
func (e *Entity) AppliedChanges() map[cid.Cid]Change {
	return e.applied
}

func (e *Entity) ForEachChange(fn func(c cid.Cid, ch Change) error) error {
	type applied struct {
		c  cid.Cid
		ch Change
	}

	sorted := make([]applied, 0, len(e.applied))
	for k, v := range e.applied {
		sorted = append(sorted, applied{c: k, ch: v})
	}
	slices.SortFunc(sorted, func(a, b applied) bool {
		return a.ch.HLCTime.Before(b.ch.HLCTime)
	})

	for _, s := range sorted {
		if err := fn(s.c, s.ch); err != nil {
			return err
		}
	}

	return nil
}

func (e *Entity) State() *crdt2.Map {
	return e.state
}

// Heads returns the map of head changes.
// This must be read only. Not safe for concurrency.
func (e *Entity) Heads() map[cid.Cid]struct{} {
	return e.heads
}

// ApplyChange to the internal state.
func (e *Entity) ApplyChange(c cid.Cid, ch Change) error {
	if ch.Entity != e.id {
		return fmt.Errorf("won't apply change from a different entity: want=%q, got=%q", e.id, ch.Entity)
	}

	if _, ok := e.applied[c]; ok {
		return fmt.Errorf("change is already applied")
	}

	if ch.HLCTime.Before(e.clock.Max()) {
		return fmt.Errorf("applying change %s out of causal order", c)
	}

	for _, dep := range ch.Deps {
		if _, ok := e.applied[dep]; !ok {
			return fmt.Errorf("missing dependency %s of change %s", dep, c)
		}
		delete(e.heads, dep)
	}

	e.state.ApplyPatch(ch.HLCTime.Pack(), OriginFromCID(c), ch.Patch)
	e.clock.Track(ch.HLCTime)
	e.applied[c] = ch
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
func (e *Entity) NextTimestamp() hlc.Time {
	return e.clock.Now()
}

// CreateChange entity creating a change blob, and applying it to the internal state.
func (e *Entity) CreateChange(ts hlc.Time, signer core.KeyPair, delegation cid.Cid, patch map[string]any) (hb Blob, err error) {
	hb, err = NewChange(e.id, maps.Keys(e.heads), ts, signer, delegation, patch)
	if err != nil {
		return hb, err
	}

	if err := e.ApplyChange(hb.CID, hb.Decoded.(Change)); err != nil {
		return hb, err
	}

	return hb, nil
}

// ReplaceChange creates a new change instead of an existing one. The change to replace must be the current head.
func (e *Entity) ReplaceChange(old cid.Cid, ts hlc.Time, signer core.KeyPair, delegation cid.Cid, patch map[string]any) (hb Blob, err error) {
	if len(e.heads) != 1 {
		return hb, fmt.Errorf("must only have one head change to replace")
	}

	if _, ok := e.heads[old]; !ok {
		return hb, fmt.Errorf("change to replace must be the current head")
	}

	prev, ok := e.applied[old]
	if !ok {
		return hb, fmt.Errorf("change to be replaced must be applied")
	}

	e.state.ForgetState(prev.HLCTime.Pack(), OriginFromCID(old))
	delete(e.applied, old)
	delete(e.heads, old)

	hb, err = NewChange(e.id, prev.Deps, ts, signer, delegation, patch)
	if err != nil {
		return hb, err
	}

	if err := e.ApplyChange(hb.CID, hb.Decoded.(Change)); err != nil {
		return hb, err
	}

	return hb, nil
}

// NewChanges creates a new Change blob.
func NewChange(eid EntityID, deps []cid.Cid, ts hlc.Time, signer core.KeyPair, delegation cid.Cid, patch map[string]any) (hb Blob, err error) {
	// Make sure deps field is not present in the patch if there're no deps.
	if len(deps) == 0 {
		deps = nil
	}
	slices.SortFunc(deps, func(a, b cid.Cid) bool { return a.KeyString() < b.KeyString() })

	ch := Change{
		Type:       TypeChange,
		Entity:     eid,
		Deps:       deps,
		Delegation: delegation,
		HLCTime:    ts,
		Patch:      patch,
		Signer:     signer.Principal(),
	}

	sigdata, err := cbornode.DumpObject(ch)
	if err != nil {
		return hb, fmt.Errorf("failed to encode signing bytes for change %w", err)
	}

	ch.Sig, err = signer.Sign(sigdata)
	if err != nil {
		return hb, fmt.Errorf("failed to sign change: %w", err)
	}

	hb, err = EncodeBlob(ch.Type, ch)
	if err != nil {
		return hb, err
	}

	return hb, nil
}

// LoadEntity from the database. If not found returns nil result and nil error.
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
	if edb.HyperEntitiesID == 0 {
		return nil, fmt.Errorf("entity %q not found", eid)
	}

	heads, err := hypersql.ChangesGetPublicHeadsJSON(conn, edb.HyperEntitiesID)
	if err != nil {
		return nil, err
	}

	return bs.loadFromHeads(conn, eid, heads.Heads)
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
	if res.HyperDraftsViewBlobID == 0 {
		return cid.Undef, fmt.Errorf("no draft for entity %s", eid)
	}

	return cid.NewCidV1(uint64(res.HyperDraftsViewCodec), res.HyperDraftsViewMultihash), nil
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

	localHeads := make([]int64, 0, len(heads))
	for _, c := range heads {
		res, err := hypersql.BlobsGetSize(conn, c.Hash())
		if err != nil {
			return nil, err
		}
		if res.BlobsID == 0 || res.BlobsSize < 0 {
			return nil, fmt.Errorf("no such head %s for entity %s", c, eid)
		}
		localHeads = append(localHeads, res.BlobsID)
	}

	if len(localHeads) != len(heads) {
		return nil, fmt.Errorf("couldn't resolve all the heads %v for entity %s", heads, eid)
	}

	jsonheads, err := json.Marshal(localHeads)
	if err != nil {
		return nil, err
	}

	return bs.loadFromHeads(conn, eid, jsonheads)
}

// localHeads is a JSON-encoded array of integers corresponding to heads.
type localHeads []byte

func (bs *Storage) loadFromHeads(conn *sqlite.Conn, eid EntityID, heads localHeads) (e *Entity, err error) {
	cset, err := hypersql.ChangesResolveHeads(conn, heads)
	if err != nil {
		return nil, err
	}

	changes, err := hypersql.ChangesListFromChangeSet(conn, cset.ResolvedJSON)
	if err != nil {
		return nil, err
	}
	if len(changes) == 0 {
		return nil, nil
	}

	entity := NewEntity(eid)

	buf := make([]byte, 0, 1024*1024) // preallocating 1MB for decompression.
	for _, change := range changes {
		buf, err = bs.bs.decoder.DecodeAll(change.HyperChangesViewData, buf)
		if err != nil {
			return nil, err
		}

		chcid := cid.NewCidV1(uint64(change.HyperChangesViewCodec), change.HyperChangesViewMultihash)
		var ch Change
		if err := cbornode.DecodeInto(buf, &ch); err != nil {
			return nil, fmt.Errorf("failed to decode change %s for entity %s: %w", chcid, eid, err)
		}
		if err := entity.ApplyChange(chcid, ch); err != nil {
			return nil, err
		}
		buf = buf[:0] // reset the slice reusing the backing array
	}

	return entity, nil
}
