package crdt

import (
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"testing"
	"unsafe"

	"github.com/stretchr/testify/require"
)

func TestIDSorting(t *testing.T) {
	require.False(t, opidLess(makeOpID("alice", 1), makeOpID("bob", 1)))
	require.False(t, opidLess(makeOpID("zalice", 1), makeOpID("bob", 1)))
	require.True(t, opidLess(makeOpID("zalice", 1), makeOpID("bob", 2)))
}

func makeOpID(site string, clock int) OpID {
	var b [8]byte
	if len(site) > 8 {
		panic("bad test site ID")
	}

	copy(b[:], site)

	n := *(*vcsdb.LocalID)(unsafe.Pointer(&b))

	return OpID{
		LamportTime: clock,
		Change:      n,
		Seq:         1,
	}
}

func opidLess(i, ii OpID) bool {
	if i.LamportTime == ii.LamportTime {
		if i.Change == ii.Change {
			return i.Seq < ii.Seq
		}
		return i.Change < ii.Change
	}
	return i.LamportTime < ii.LamportTime
}
