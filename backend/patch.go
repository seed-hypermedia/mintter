package backend

import (
	"bytes"
	"time"

	"github.com/ipfs/go-cid"
)

const (
	PatchKindV1 PatchKind = "mintter/v1"
)

type PatchStore struct {
	data map[cid.Cid][]Patch
}

type PatchKind string

type Patch struct {
	// CID-encoded ID of the author of the patch.
	Author cid.Cid

	// CID-encoded object ID.
	ObjectID cid.Cid

	// A list of CIDs of patches that are required to apply this patch.
	// The dependent patches must refer to the same Object IDs.
	// Only direct dependencies must be specified, and only one
	// for each peer, e.g. for a sequence of patches A ← B ← C,
	// patch C must only specify B as its dependency.
	Deps []cid.Cid

	// A monotonically increasing counter that must have no gaps
	// within the same device and ObjectID.
	Seq uint64

	// A Lamport timestamp. Each peer keeps a logical clock
	// per object, and when creating a new patch the
	// author must assign a timestamp which is an increment of
	// the maximal timestamp among all other peers' timestamps
	// the author knows about.
	LamportTime uint64

	// Log timestamps as defined in the Chronofold paper.
	LogTime uint64

	// An arbitrary string that lets the client know
	// about what's inside the body of the patch.
	// This is important to make the system evolvable and future-proof.
	Kind PatchKind

	// An arbitrary byte buffer.
	// Could be serialized list of discrete operations,
	// or anything else that is relevant to the application.
	Body []byte

	// An optional human-readable message.
	Message string

	// A physical timestamp of creation of this patch, for convenience.
	CreateTime time.Time
}

func (p Patch) Less(pp Patch) bool {
	if p.LamportTime == pp.LamportTime {
		return bytes.Compare(p.Author.Bytes(), pp.Author.Bytes()) == -1
	}

	return p.LamportTime < pp.LamportTime
}
