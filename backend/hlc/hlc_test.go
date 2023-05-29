package hlc

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestMocked(t *testing.T) {
	clock := NewClockWithWall(func() time.Time { return time.Time{} })

	tt := clock.Now()
	require.Equal(t, tt.wall, int64(0))
	require.Equal(t, tt.counter, uint16(1))

	tt = clock.Now()
	require.Equal(t, tt.wall, int64(0))
	require.Equal(t, tt.counter, uint16(2))
}

func TestTrack(t *testing.T) {
	c1 := NewClock()
	c2 := NewClock()

	t1 := c1.Now()

	c2.Track(t1)
	require.Equal(t, t1, c2.maxTime)

	t2 := c2.Now()

	require.True(t, t1.Before(t2), "t2 must be greater than t1")
}

func TestCompactTimestamp(t *testing.T) {
	in := newTime(time.Now().UnixMicro(), 356)
	out := Unpack(in.Pack())

	require.Equal(t, in, out)
}

func TestClockCausality(t *testing.T) {
	now := time.Now()

	in := []time.Time{
		now,
		now.Add(time.Hour * -1),
		now.Add(time.Hour),
		now.Add(time.Hour).Add(30 * time.Minute * -1),
	}
	clock := NewClock()

	var old Time
	for _, tt := range in {
		now := clock.Time(tt)
		require.True(t, old.Before(now), "new timestamp must be after any previous one even if physical clock goes back")
		require.True(t, old.Time().Before(now.Time()), "unix timestamp representation must respect happens-before property")

		old = now
	}
}

func TestClockCausality_Continuous(t *testing.T) {
	clock := NewClock()

	// Number of iterations is arbitrary.
	var last int64
	for i := 0; i < 50000; i++ {
		tt := clock.Now().Pack()
		if tt <= last {
			t.Fatalf("incorrect causality: prev=%d, current=%d", last, tt)
		}
		last = tt
	}
}

func TestWallClockAlwaysRounded(t *testing.T) {
	for i := 0; i < 100; i++ {
		tt := NewClock().Now()
		require.Equal(t, uint16(0), tt.counter, "counter must be 0 at clock start")
		require.Equal(t, uint16(0), uint16(tt.wall), "wall clock must be rounded to 48 bits, i.e. lower 16 bits are 0")
		require.Equal(t, tt.wall, tt.Time().UnixMicro(), "unix micro representation doesn't match wall clock part")
	}
}

func TestZero(t *testing.T) {
	require.True(t, Unpack(0).IsZero())
	require.Equal(t, int64(0), Unpack(0).Pack())
}

// TODO(burdiyan): check for clock drift, add relevant tests.
