// Package crdt provides Mintter-specific CRDTs. These are not meant to be general-purpose CRDTs,
// but still are generic enough and could be extended for some other use cases. In case of tradeoffs,
// we favor Mintter-specific use cases.
package crdt

import "fmt"

// ID of a CRDT operation.
type ID struct {
	// Site is globally-unique client identifier.
	// Should be UUID, hash, public key, or something unique.
	Site string
	// Clock is Lamport Timestamp.
	Clock int
	// Idx discriminant for events at the same time.
	Idx int
}

// Less compares if i is less than ii.
// It uses the common comparison scheme for CRDT IDs:
// first compare the clock, break ties (if any) by comparing site IDs.
func (i ID) Less(ii ID) bool {
	if i.Clock < ii.Clock {
		return true
	}

	if i.Clock > ii.Clock {
		return false
	}

	if i.Site < ii.Site {
		return true
	}

	if i.Site > ii.Site {
		return false
	}

	return i.Idx < ii.Idx
}

// VectorClock tracks IDs for each site and maximal
// lamport timestamp for the whole document.
type VectorClock struct {
	maxClock int
	lastSeen map[string]ID
}

// NewVectorClock creates a new Frontier.
func NewVectorClock() *VectorClock {
	return &VectorClock{
		lastSeen: map[string]ID{},
	}
}

// NewID produces a new ID for a given site, without tracking it.
func (f *VectorClock) NewID(site string) ID {
	return ID{Site: site, Clock: f.maxClock + 1}
}

// Track the ID of a new operation. Will fail for outdated IDs.
func (f *VectorClock) Track(id ID) error {
	if l, ok := f.lastSeen[id.Site]; ok && id.Less(l) {
		return fmt.Errorf("out of date operation for site %s: incoming clock=%v, last=%v", id.Site, id.Clock, l)
	}

	f.lastSeen[id.Site] = id
	if f.maxClock < id.Clock {
		f.maxClock = id.Clock
	}

	return nil
}
