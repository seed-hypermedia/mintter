package docmodel

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"seed/backend/core"
	"seed/backend/crdt2"
	"seed/backend/daemon/index"
	"seed/backend/hlc"
	"sort"
	"strings"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multibase"
	"golang.org/x/exp/maps"
	"golang.org/x/exp/slices"
)

// Entity is our CRDT mutable object.
type Entity struct {
	id           index.IRI
	cids         []cid.Cid
	changes      []*index.Change
	deps         [][]int // deps for each change.
	rdeps        [][]int // reverse deps for each change.
	applied      map[cid.Cid]int
	heads        map[cid.Cid]struct{}
	state        *crdt2.Map
	maxClock     *hlc.Clock
	actorsIntern map[string]string
	vectorClock  map[string]int64
}

// NewEntity creates a new entity with a given ID.
func NewEntity(id index.IRI) *Entity {
	return &Entity{
		id:           id,
		applied:      make(map[cid.Cid]int),
		heads:        make(map[cid.Cid]struct{}),
		state:        crdt2.NewMap(),
		maxClock:     hlc.NewClock(),
		actorsIntern: make(map[string]string),
		vectorClock:  make(map[string]int64),
	}
}

// NewEntityWithClock creates a new entity with a provided clock.
func NewEntityWithClock(id index.IRI, clock *hlc.Clock) *Entity {
	e := NewEntity(id)
	e.maxClock = clock
	return e
}

// ID returns the ID of the entity.
func (e *Entity) ID() index.IRI { return e.id }

// Get a property under a given path.
func (e *Entity) Get(path ...string) (value any, ok bool) {
	return e.state.Get(path...)
}

// LastChangeTime is max time tracked in the HLC.
func (e *Entity) LastChangeTime() hlc.Timestamp {
	return e.maxClock.Max()
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
func (e *Entity) ApplyChange(c cid.Cid, ch *index.Change) error {
	if _, ok := e.applied[c]; ok {
		return nil
	}

	var actor string
	{
		au := ch.Author.UnsafeString()
		a, ok := e.actorsIntern[au]
		if !ok {
			e.actorsIntern[au] = au
			a = au
		}
		actor = a
	}

	if ch.Ts < e.vectorClock[actor] {
		return fmt.Errorf("applying change '%s' violates causal order", c)
	}

	e.vectorClock[actor] = ch.Ts

	if ch.Ts < int64(e.maxClock.Max()) {
		return fmt.Errorf("applying change %s out of causal order", c)
	}

	deps := make([]int, len(ch.Deps))

	for i, dep := range ch.Deps {
		depIdx, ok := e.applied[dep]
		if !ok {
			return fmt.Errorf("missing dependency %s of change %s", dep, c)
		}

		deps[i] = depIdx
	}

	if err := e.maxClock.Track(hlc.Timestamp(ch.Ts)); err != nil {
		return err
	}

	e.state.ApplyPatch(int64(ch.Ts), OriginFromCID(c), ch.Payload)
	e.cids = append(e.cids, c)
	e.changes = append(e.changes, ch)
	e.deps = append(e.deps, nil)
	e.rdeps = append(e.rdeps, nil)
	e.heads[c] = struct{}{}
	curIdx := len(e.changes) - 1
	e.applied[c] = curIdx

	// One more pass through the deps to update the internal DAG structure,
	// and update the heads of the current version.
	// To avoid corrupting the entity state we shouldn't do this in the first loop we did.
	for i, dep := range ch.Deps {
		// If any of the deps was a head, then it's no longer the case.
		delete(e.heads, dep)

		// Keeping the DAG edges between deps in both directions.
		e.deps[curIdx] = addUnique(e.deps[curIdx], deps[i])
		e.rdeps[deps[i]] = addUnique(e.rdeps[deps[i]], curIdx)
	}

	return nil
}

// Deps returns the set of dependencies for the current heads.
// This is a bit more complex than just returning the deps of the head changes as is,
// because they may be redundant in some cases, when they have links between each other.
// This method returns the minimal set of deps by reducing the redundant edges.
//
// Given the following DAG (d, e) are the heads, while (c, b) are the direct deps,
// although only (c) needs to be returned, as b is already assumed by c.
//
//	a ← b ← c ← d
//	     ↖
//	       e
func (e *Entity) Deps() []cid.Cid {
	if len(e.heads) == 0 {
		return nil
	}

	// Special case when there's only one head,
	// because there's no need to do any reductions.
	if len(e.heads) == 1 {
		var head cid.Cid
		for head = range e.heads {
			break
		}

		return slices.Clone(e.changes[e.applied[head]].Deps)
	}

	// These two sets initially will contain all deps of the heads
	// but later the redundant deps will be removed from the reduced set.
	// We still need to keep the full deps in order to perform the reduction correctly.
	fullDeps := make(map[int]struct{})
	reducedDeps := make(map[int]struct{})

	for head := range e.heads {
		ihead, ok := e.applied[head]
		if !ok {
			panic("BUG: head change not applied")
		}

		for _, dep := range e.deps[ihead] {
			fullDeps[dep] = struct{}{}
			reducedDeps[dep] = struct{}{}
		}
	}

	// For each collected dep we want to traverse back to the leaves,
	// and if we find a node along the way that is already a collected dep,
	// then this current dep is redundant and doesn't need to be returned.
	var (
		stack   []int
		visited = make(map[int]struct{})
	)

	// Initialize the traversal stack with all the full deps.
	for dep := range fullDeps {
		stack = append(stack, dep)
	}

	// Then for each node in the stack traverse back to the leaves,
	// breaking early if any of the rdeps is already in the full deps set.
	for len(stack) > 0 {
		node := stack[len(stack)-1]
		stack = stack[:len(stack)-1]

		if _, ok := visited[node]; ok {
			continue
		}

		visited[node] = struct{}{}
		for _, rdep := range e.rdeps[node] {
			if _, ok := visited[rdep]; !ok {
				stack = append(stack, rdep)
			}

			if _, ok := fullDeps[rdep]; ok {
				delete(reducedDeps, node)
				break
			}
		}
	}

	out := make([]cid.Cid, 0, len(reducedDeps))
	for dep := range reducedDeps {
		out = append(out, e.cids[dep])
	}

	return out
}

func addUnique(in []int, v int) []int {
	// Slice in is very small most of the time,
	// and is assumed to be sorted.
	// Our assumption here is that linear search would be faster than binary search,
	// because most changes have only a few dependencies.
	var targetIndex int
	for i, x := range in {
		if x == v {
			return in
		}

		if x > v {
			targetIndex = i
			break
		}
	}

	return slices.Insert(in, targetIndex, v)
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

// CreateChange entity creating a change blob, and applying it to the internal state.
func (e *Entity) CreateChange(action string, ts hlc.Timestamp, signer core.KeyPair, payload map[string]any) (hb index.EncodedBlob[*index.Change], err error) {
	hb, err = index.NewChange(signer, maps.Keys(e.heads), action, payload, int64(ts))
	if err != nil {
		return hb, err
	}

	if err := e.ApplyChange(hb.CID, hb.Decoded); err != nil {
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

func verifyUnforgeableID(id index.IRI, prefix int, owner core.Principal, nonce []byte, ts int64) error {
	id2, _ := NewUnforgeableID(string(id[:prefix]), owner, nonce, ts)
	if id2 != string(id) {
		return fmt.Errorf("failed to verify unforgeable ID want=%q got=%q", id, id2)
	}

	return nil
}
