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
}

// Less compares if i is less than ii.
// It uses the common comparison scheme for CRDT IDs:
// first compare the clock, break ties (if any) by comparing site IDs.
func (i ID) Less(ii ID) bool {
	if i.Clock == ii.Clock {
		return i.Site < ii.Site
	}

	return i.Clock < ii.Clock
}

// VectorClock tracks IDs for each site and maximal
// lamport timestamp for the whole document.
type VectorClock struct {
	maxClock int
	lastSeen map[string]int
}

// NewVectorClock creates a new Frontier.
func NewVectorClock() *VectorClock {
	return &VectorClock{
		lastSeen: map[string]int{},
	}
}

// NewID produces a new ID for a given site, without tracking it.
func (f *VectorClock) NewID(site string) ID {
	return ID{Site: site, Clock: f.maxClock + 1}
}

// Track the ID of a new operation. Will fail for outdated IDs.
func (f *VectorClock) Track(id ID) error {
	if l := f.lastSeen[id.Site]; id.Clock <= l {
		return fmt.Errorf("out of date operation for site %s: incoming clock=%d, last=%d", id.Site, id.Clock, l)
	}

	f.lastSeen[id.Site] = id.Clock
	if f.maxClock < id.Clock {
		f.maxClock = id.Clock
	}

	return nil
}
