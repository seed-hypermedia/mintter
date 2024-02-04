package syncing

import (
	"strconv"
	"testing"
	"time"

	"github.com/libp2p/go-libp2p/core/peer"
)

func TestIntervalOffset(t *testing.T) {
	interval := time.Minute

	offsets := make([]time.Duration, 10000)

	// Calculate offsets for 10000 different targets.
	for i := range offsets {
		offsets[i] = offsetInterval(peer.ID("test-peer-"+strconv.Itoa(i)), interval)
	}

	// Put the offsets into buckets and validate that they are all
	// within bounds.
	bucketSize := 5 * time.Second
	buckets := make([]int, interval/bucketSize)

	for _, offset := range offsets {
		if offset < 0 || offset >= interval {
			t.Fatalf("Offset %v out of bounds", offset)
		}

		bucket := offset / bucketSize
		buckets[bucket]++
	}

	t.Log(buckets)

	// Calculate whether the number of targets per bucket
	// does not differ more than a given tolerance.
	avg := len(offsets) / len(buckets)
	tolerance := 0.15

	for _, bucket := range buckets {
		diff := bucket - avg
		if diff < 0 {
			diff = -diff
		}

		if float64(diff)/float64(avg) > tolerance {
			t.Fatalf("Bucket out of tolerance bounds")
		}
	}
}
