package hyper

import (
	"context"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/crdt2"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/vcs/hlc"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
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

func (e *Entity) ID() EntityID { return e.id }

func (e *Entity) Get(path ...string) (value any, ok bool) {
	return e.state.Get(path...)
}

func (e *Entity) LastChangeTime() hlc.Time {
	return e.clock.Max()
}

// AppliedChanges returns the map of applied changes.
// This must be read-only. Not safe for concurrency.
func (e *Entity) AppliedChanges() map[cid.Cid]Change {
	return e.applied
}

// Heads returns the map of head changes.
// This must be read only. Not safe for concurrency.
func (e *Entity) Heads() map[cid.Cid]struct{} {
	return e.heads
}

// ApplyChange to the internal state.
func (e *Entity) ApplyChange(c cid.Cid, ch Change) error {
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

	e.state.ApplyPatch(ch.HLCTime.Pack(), ch.Signer.String(), ch.Patch)
	e.clock.Track(ch.HLCTime)
	e.applied[c] = ch
	e.heads[c] = struct{}{}

	return nil
}

func (e *Entity) NextTimestamp() hlc.Time {
	return e.clock.Now()
}

// CreateChange entity creating a change blob, and applying it to the internal state.
func (e *Entity) CreateChange(ts hlc.Time, signer core.KeyPair, delegation cid.Cid, patch map[string]any) (hb Blob, err error) {
	var heads []cid.Cid
	if len(e.heads) > 0 {
		heads := maps.Keys(e.heads)
		slices.SortFunc(heads, func(a, b cid.Cid) bool { return a.KeyString() < b.KeyString() })
	}

	ch := Change{
		Type:       TypeChange,
		Deps:       heads,
		Delegation: delegation,
		HLCTime:    ts,
		Entity:     e.id,
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

	if err := e.ApplyChange(hb.CID, ch); err != nil {
		return hb, err
	}

	return hb, nil
}

type loadOpts struct {
	includeDrafts int64
}

type LoadOption func(*loadOpts)

func WithLoadDrafts() LoadOption {
	return func(opts *loadOpts) {
		opts.includeDrafts = 1
	}
}

// LoadEntity from the database. If not found returns nil result and nil error.
func (bs *Storage) LoadEntity(ctx context.Context, eid EntityID, opts ...LoadOption) (e *Entity, err error) {
	var lopts loadOpts
	for _, o := range opts {
		o(&lopts)
	}

	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	res, err := hypersql.EntitiesLookupID(conn, string(eid))
	if err != nil {
		return nil, err
	}
	if res.HyperEntitiesID == 0 {
		return nil, nil
	}

	changes, err := hypersql.ChangesListForEntity(conn, res.HyperEntitiesID, lopts.includeDrafts)
	if err != nil {
		return nil, err
	}
	if len(changes) == 0 {
		return nil, nil
	}

	entity := NewEntity(eid)

	buf := make([]byte, 0, 1024*1024) // preallocating 1MB for decompression.
	for _, change := range changes {
		buf, err = bs.bs.decoder.DecodeAll(change.HyperChangesByEntityViewData, buf)
		if err != nil {
			return nil, err
		}

		chcid := cid.NewCidV1(uint64(change.HyperChangesByEntityViewCodec), change.HyperChangesByEntityViewMultihash)
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
