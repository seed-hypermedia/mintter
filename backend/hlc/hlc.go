// Package hlc provides a hybrid logical clock, as described in the corresponding [paper].
// The actual paper is a bit complicated, but this Martin Fowler's [article] summarizes it nicely.
//
// HLC combines human-friendly wall clock with Lamport-like logical clock, and its happens-before
// guarantees, i.e. every new timestamp is greater than any previously known one.
//
// [paper]: https://cse.buffalo.edu/tech-reports/2014-04.pdf.
// [article]: https://martinfowler.com/articles/patterns-of-distributed-systems/hybrid-clock.html
package hlc

import (
	"time"
)

// Bitmask to take or clear lowest 16 bits of an integer.
// Used to pack 48+16 bits into a single int64.
const mask = 0xFFFF

// Clock is an instance of a hybrid logical clock.
// Not safe for concurrent use.
type Clock struct {
	wallClock func() time.Time
	maxTime   Time
}

// NewClock creates a new HLC.
// The system clock is expected to have somewhat low skew among peers.
// But HLC handles any possible clock skews caused by synchronizing with NTP or similar.
func NewClock() *Clock {
	return NewClockWithWall(time.Now)
}

// NewClockAt creates a new clock set to the given time.
func NewClockAt(at Time) *Clock {
	c := NewClock()
	c.Track(at)
	return c
}

// NewClockWithWall creates a new clock with a given system wall clock function.
func NewClockWithWall(fn func() time.Time) *Clock {
	return &Clock{
		wallClock: fn,
	}
}

// Max returns the currently known maximum time.
func (hc *Clock) Max() Time {
	return hc.maxTime
}

// Now creates a new timestamp which is greater than any previously known timestamp.
func (hc *Clock) Now() Time {
	if hc.wallClock == nil {
		hc.wallClock = time.Now
	}

	return hc.Time(hc.wallClock())
}

// Time creates new timestamp using a given wall clock timestamp.
func (hc *Clock) Time(at time.Time) Time {
	if hc == nil {
		return Time{}
	}

	now := newTime(at.UnixMicro(), 0)
	if now.wall <= hc.maxTime.wall {
		hc.maxTime = hc.maxTime.Add(1)
	} else {
		hc.maxTime = now
	}
	return hc.maxTime
}

// Track a timestamp produced by some other clock, so next timestamp
// produces by this clock is guaranteed to be greater than the tracked one.
func (hc *Clock) Track(remoteTime Time) (ok bool) {
	if hc == nil {
		return false
	}

	if hc.maxTime.Before(remoteTime) {
		hc.maxTime = remoteTime
		return true
	}

	return false
}

// Time is an instance of a hybrid logical timestamp.
type Time struct {
	wall    int64
	counter uint16
}

// AsTime returns packed HLC timestamp as std time.
func AsTime(n int64) time.Time {
	return time.UnixMicro(n)
}

// FromTime unpacks std time into HLC time.
func FromTime(t time.Time) Time {
	return Unpack(t.UnixMicro())
}

// Unpack an integer representation of an HLC timestamp
// by splitting its physical and logical components.
func Unpack(n int64) Time {
	// only taking 16 lowest bits for the logical component.
	return newTime(n, uint16(n&mask))
}

// Before checks if this timestamp is less/before the other timestamp.
func (ht Time) Before(other Time) bool {
	if ht.wall == other.wall {
		return ht.counter < other.counter
	}

	return ht.wall < other.wall
}

// String implements fmt.Stringer.
func (ht Time) String() string {
	return ht.Time().UTC().Format(time.RFC3339Nano)
}

// Equal checks whether this timestamp is semantically equal to the other.
func (ht Time) Equal(other Time) bool {
	return ht.wall == other.wall && ht.counter == other.counter
}

// Add ticks to the logical component of the timestamp.
func (ht Time) Add(ticks uint16) Time {
	incr := ht.counter + ticks
	if incr <= ht.counter {
		panic("BUG: overflow of logical counter component")
	}

	ht.counter = incr
	return ht
}

// Time converts hybrid logical timestamp into a proper human-friendly timestamp.
// It still respects the happens-before property of the logical clock.
func (ht Time) Time() time.Time {
	return time.UnixMicro(ht.Pack())
}

// Pack the timestamp into its integer representation, which
// can be treated as a unix timestamps in microseconds.
func (ht Time) Pack() int64 {
	// Assuming wall timestamp is rounded to 48 bits, so just
	// packing the two components together into a single integer.
	return ht.wall | int64(ht.counter)
}

// IsZero checks if timestamp is zero value.
func (ht Time) IsZero() bool {
	return ht.wall == 0 && ht.counter == 0
}

// newTime produces a new timestamp.
func newTime(systemTimeMicro int64, ticks uint16) Time {
	return Time{
		// Clearing lowest 16 bits, i.e. rounding the timestamp
		// to 48 bits. This allows for "packing" (concatenating)
		// physical and logical components of the timestamp, which
		// produces a valid wall-clock timestamp, and is more compact
		// than storing the two components separately.
		wall:    systemTimeMicro &^ mask,
		counter: ticks,
	}
}
