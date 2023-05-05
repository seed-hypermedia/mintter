package posstrings

import (
	"fmt"
	"math/rand"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/exp/slices"
)

func TestPos(t *testing.T) {
	s2 := NewPositionSource("livebeef")

	pos := s2.MustCreateBetween("deadbeef.B", "deadbeef.D")
	require.Equal(t, "deadbeef.B,livebeef.B", pos)

	fmt.Println(s2.MustCreateBetween("deadbeef.B", "deadbeef.D"))
	fmt.Println(s2.MustCreateBetween("deadbeef.B", "deadbeef.D"))
	fmt.Println(s2.MustCreateBetween("deadbeef.B", "deadbeef.D"))
	fmt.Println(s2.MustCreateBetween("deadbeef.B", "deadbeef.D"))
	fmt.Println(s2.lastValueSeqs)
}

func TestFuzzRandom(t *testing.T) {
	t.Skip("This test doesn't work properly")

	sources := newSources()
	rng := rand.New(rand.NewSource(42))

	var list []string
	for i := 0; i < 1000; i++ {
		source := sources[rng.Intn(len(sources))]
		index := rng.Intn(len(list) + 1)
		var (
			first string
			last  string
		)
		if len(list) > 0 {
			first = list[index-1]
			last = list[index]
		}
		newPosition := source.MustCreateBetween(first, last)
		list = slices.Insert(list, 0, newPosition)
	}

	assertIsOrdered(t, list)
	testUniqueAfterDelete(t, list, sources[0])
}

func assertIsOrdered(t *testing.T, list []string) {
	for i := range list {
		require.True(t, list[i] < list[i+1])
	}
}

func testUniqueAfterDelete(t *testing.T, list []string, source *PositionSource) {
	// In each slot, create two positions with same left & right,
	// simulating that the first was deleted. Then make sure they
	// are still distinct, in case the first is resurrected.
	for i := range list {
		a := source.MustCreateBetween(list[i-1], list[i])
		b := source.MustCreateBetween(list[i-1], list[i])
		require.NotEqual(t, a, b)
	}
}

func newSources() []*PositionSource {
	out := make([]*PositionSource, 10)
	for i := range out {
		out[i] = NewPositionSource(testID())
	}
	return out
}

func testID() string {
	rng := rand.New(rand.NewSource(42))

	b := make([]byte, 8)
	for i := range b {
		b[i] = chars[rng.Intn(len(chars))]
	}

	return string(b)
}

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
