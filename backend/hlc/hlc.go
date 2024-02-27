// Package hlc provides a hybrid logical clock, as described in the corresponding [paper].
// The actual paper is a bit complicated, but this Martin Fowler's [article] summarizes it nicely.
//
// HLC combines human-friendly wall clock with Lamport-like logical clock, and its happens-before
// guarantees, i.e. every new timestamp is greater than any previously known one.
//
// We modify the original algorithm and always treat the HLC timestamp as a single int64 value,
// expressing a Unix timestamp in microseconds. This makes the implementation much simpler,
// while still offering the same benefits.
//
// So, instead of rounding the wall time to 48 bits and initializing the 16-bit counter to 0,
// we use the tail bits of the actual microsecond timestamp as the counter.
//
// I.e. we get the current time in microseconds, and if it so happens that this timestamp
// is lower than the previously tracked timestamp (within our tolerance threshold), we use the
// previously tracked timestamp and increment it by 1.
//
// As a nice side effect, we can observe more variance in the timestamps produced by different clock instances,
// because we take advantage of the actual wall clock time microsecond precision.
//
// [paper]: https://cse.buffalo.edu/tech-reports/2014-04.pdf.
// [article]: https://martinfowler.com/articles/patterns-of-distributed-systems/hybrid-clock.html
package hlc

import (
	"fmt"
	"time"
)

const (
	skewThreshold = time.Minute

	stringLayout = time.RFC3339Nano
)

// Timestamp is the HLC timestamp expressed as a 64-bit integer,
// representing the Unix time in microseconds.
type Timestamp int64

// Time converts the timestamp to a time.Time.
func (t Timestamp) Time() time.Time {
	return time.UnixMicro(int64(t))
}

// String implements stringer.
func (t Timestamp) String() string {
	return t.Time().Format(stringLayout)
}

// FromTime creates a new timestamp from a time.Time.
func FromTime(t time.Time) Timestamp {
	return Timestamp(t.UnixMicro())
}

// Clock is an instance of a hybrid logical clock.
// Unsafe for concurrent use.
type Clock struct {
	nowFunc func() time.Time
	maxTime Timestamp
}

// NewClock creates a new HLC.
// The system clock is expected to have somewhat low skew among peers.
// But HLC handles any possible clock skews caused by synchronizing with NTP or similar.
func NewClock() *Clock {
	return &Clock{
		nowFunc: time.Now,
	}
}

// Max returns the currently known maximum time.
func (hc *Clock) Max() Timestamp {
	return hc.maxTime
}

// Now creates a new timestamp which is greater than any previously known timestamp.
func (hc *Clock) Now() (Timestamp, error) {
	now := FromTime(hc.nowFunc())

	diff, err := validateSkew(hc.maxTime, now)
	if err != nil {
		return 0, err
	}

	if diff >= 0 {
		now += Timestamp(diff.Microseconds()) + 1
	}

	hc.track(now)
	return now, nil
}

// MustNow is like Now() but panics if it fails.
func (hc *Clock) MustNow() Timestamp {
	t, err := hc.Now()
	if err != nil {
		panic(err)
	}
	return t
}

// Track a timestamp produced by some other clock, so next timestamp
// produces by this clock is guaranteed to be greater than the tracked one.
func (hc *Clock) Track(t Timestamp) error {
	_, err := validateSkew(t, FromTime(time.Now()))
	if err != nil {
		return fmt.Errorf("tracked timestamp is way ahead of the local time: %w", err)
	}
	hc.track(t)
	return nil
}

func (hc *Clock) track(t Timestamp) {
	if t > hc.maxTime {
		hc.maxTime = t
	}
}

func validateSkew(base, t Timestamp) (diff time.Duration, err error) {
	diff = time.Duration(base-t) * time.Microsecond

	if diff >= skewThreshold {
		return 0, fmt.Errorf("base time %d is way ahead of the tracked time %d: %s", base, t, diff)
	}

	return diff, nil
}
