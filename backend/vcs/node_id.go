package vcs

import (
	"crypto/rand"
	"encoding/base64"
	"math"
	"sync/atomic"
	"time"
	"unsafe"
)

// Reserved node IDs.
const (
	RootNode  NodeID = 1
	TrashNode NodeID = 2
)

// String values for reserved nodes.
const (
	RootNodeString  = "$ROOT"
	TrashNodeString = "$TRASH"
)

// NodeID is an ID of a node inside the Mintter Object graph.
type NodeID uint64

// IsZero checks if Node ID is zero value.
func (nid NodeID) IsZero() bool {
	return nid == 0
}

// String implements fmt.Stringer.
func (nid NodeID) String() string {
	if nid.IsZero() {
		return "<invalid-zero>"
	}

	if nid == RootNode {
		return RootNodeString
	}

	if nid == TrashNode {
		return TrashNodeString
	}

	var notASCII bool
	const maxASCII = 127

	out := make([]byte, 0, 8)

	b := *(*[8]byte)(unsafe.Pointer(&nid))
	for _, b := range b {
		if b == 0 {
			continue
		}

		if b > maxASCII {
			notASCII = true
		}

		out = append(out, b)
	}

	if notASCII {
		return base64.RawStdEncoding.EncodeToString(out)
	}

	return string(out)
}

// NodeIDFromString creates a NodeID from a string.
func NodeIDFromString(s string) NodeID {
	if s == RootNodeString {
		return RootNode
	}

	if s == TrashNodeString {
		return TrashNode
	}

	// uint64 is max 8 bytes.
	if len(s) > 8 {
		panic("BUG: string -> NodeID overflow")
	}

	var b [8]byte
	copy(b[:], s)

	return *(*NodeID)(unsafe.Pointer(&b))
}

const (
	maxUint14       uint64 = 1<<14 - 1
	uint14ClearMask uint64 = math.MaxUint64 >> 14 << 14
)

var (
	nidSession = randomUint14()

	// This should only be accessed atomically.
	// This counter gets incremented every time we generate a new ID.
	nidCounter = randomUint14()
)

func nidCounterInc() uint64 {
	c := atomic.AddUint64(&nidCounter, 1)
	return uint14(c)
}

// NewNodeIDv1 generates a new unique-enough NodeID.
// It consists of:
// - A 36-bit Unix timestamp in seconds.
// - A 14-bit random value generated once per process.
// - A 14-bit incrementing counter, initialized to a random value.
//
// LIMITATIONS:
// 1. It can only store timestamps up to "4147-08-20T07:32:15Z", but it's more than enough.
// 2. It can only generate up to 16384 IDs per second.
// 3. It expects machine clock not going backwards, at least not by seconds.
// 4. It expects the generated IDs to be unique within the scope of a Mintter Object, not globally.
func NewNodeIDv1(ts time.Time) NodeID {
	return newNodeIDv1(ts, nidSession, atomic.LoadUint64(&nidCounter))
}

func randomUint14() uint64 {
	var buf [2]byte
	if _, err := rand.Read(buf[:]); err != nil {
		panic("failed to read randomness for uint14")
	}

	cnt := *(*uint16)(unsafe.Pointer(&buf))
	return uint14(uint64(cnt))
}

func uint14(v uint64) uint64 {
	return v &^ uint14ClearMask
}

func newNodeIDv1(ts time.Time, sessionID, counter uint64) NodeID {
	id := uint64(ts.Unix()) << (64 - 36) // out of 64 bits using only lowest 36.
	id = id | sessionID<<14              // using lowest 14 bits from sessionID.
	id = id | counter
	return NodeID(id)
}
