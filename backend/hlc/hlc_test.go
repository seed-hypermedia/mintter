package hlc

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestPrecision(t *testing.T) {
	c1 := NewClock()
	c2 := NewClock()

	t1 := c1.MustNow()
	time.Sleep(time.Microsecond)
	t2 := c2.MustNow()

	require.Greater(t, t2, t1, "second timestamp must be greater than the first one even in unrelated clocks")
}

func TestClockCausality(t *testing.T) {
	clock := NewClock()

	// Number of iterations is arbitrary.
	var last Timestamp
	for i := 0; i < 50000; i++ {
		tt := clock.MustNow()
		if tt <= last {
			t.Fatalf("incorrect causality: prev=%d, current=%d %d", last, tt, i)
		}

		last = tt
	}
}

func TestSkew(t *testing.T) {
	clock := NewClock()

	t1 := clock.MustNow()

	clock.nowFunc = func() time.Time { return time.Now().Add(50 * time.Second * -1) }

	t2 := clock.MustNow()
	require.Greater(t, t2, t1, "second timestamp must be greater than the first one even if physical clock goes back")

	clock.nowFunc = func() time.Time { return time.Now().Add(time.Hour * -1) }

	_, err := clock.Now()
	require.Error(t, err, "now must fail if local clock is way behind the tracked time")
}

func TestTrack(t *testing.T) {
	clock := NewClock()

	t1 := clock.MustNow()
	t2 := t1 + (2 * Timestamp(time.Minute.Microseconds()))

	require.Error(t, clock.Track(t2), "tracking a timestamp from the future must fail if exceeds the tolerance threshold")

	t3 := t1 + 3
	require.NoError(t, clock.Track(t3))

	require.Equal(t, t3, clock.maxTime)
}

func TestCoverage(t *testing.T) {
	// This stupid test is here to achieve 100% test coverage.
	c := NewClock()
	c.MustNow()

	c.nowFunc = func() time.Time { return time.Now().Add(50 * time.Second * -1) }
	c.MustNow()

	c.nowFunc = func() time.Time { return time.Now().Add(time.Hour * -1) }
	require.Panics(t, func() { c.MustNow() })

	require.Equal(t, c.maxTime, c.Max())

	c.nowFunc = time.Now

	{
		want := time.Now()
		ts := FromTime(want)
		got := ts.Time()
		require.Equal(t, want.UnixMicro(), got.UnixMicro(), "timestamp must be convertible to time")
	}

	{
		ts := c.MustNow()
		tss := ts.String()
		tt, err := time.Parse(stringLayout, tss)
		require.NoError(t, err)
		require.Equal(t, ts, FromTime(tt))
	}
}
