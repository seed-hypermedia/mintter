package hlc

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestTrack(t *testing.T) {
	c1 := NewClock(time.Now)
	c2 := NewClock(time.Now)

	t1 := c1.Now()

	c2.Track(t1)
	require.Equal(t, t1, c2.maxTime)

	t2 := c2.Now()

	require.True(t, t1.Before(t2), "t2 must be greater than t1")
}

func TestCompactTimestamp(t *testing.T) {
	now := time.Now()

	hlc := newTime(now.UnixMicro(), 356)

	require.Equal(t, hlc, Unpack(hlc.Time().UnixMicro()), "must pack and unpack hlc timestamp into a unix timestamp")
}

func TestClock(t *testing.T) {
	now := time.Now()

	times := []time.Time{
		now,
		now.Add(time.Hour * -1),
		now.Add(time.Hour),
		now.Add(time.Hour).Add(30 * time.Minute * -1),
	}

	var c int
	mockedTime := func() time.Time {
		defer func() { c++ }()
		if c < len(times) {
			return times[c]
		}
		return time.Now()
	}

	clock := NewClock(mockedTime)

	var old Time
	for i := 0; i < 5; i++ {
		now := clock.Now()

		require.True(t, old.Before(now), "new timestamp must be after any previous one even if physical clock goes back")
		require.True(t, old.Time().Before(now.Time()), "unix timestamp representation must respect happens-before property")

		old = now
	}
}
