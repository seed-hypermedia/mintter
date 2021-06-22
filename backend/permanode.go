package backend

import (
	"crypto/rand"
	"time"

	cbornode "github.com/ipfs/go-ipld-cbor"
)

func init() {
	cbornode.RegisterCborType(permanode{})
}

// permanode can be used as a mutable reference for immutable data.
// This is inspired by Perkeep: https://perkeep.org/doc/schema/permanode.
// Signed permanodes are stored on IPFS, and their CIDs can be used as
// globally unique IDs for Mintter Objects.
// The random part of the permanode doesn't need to be very large, because
// signing the permanode will introduce enough entropy to the resulting ID.
type permanode struct {
	Random     []byte
	CreateTime time.Time
}

func newPermanode() permanode {
	var buf [10]byte
	n, err := rand.Read(buf[:])

	if err != nil {
		panic(err)
	}

	if n != len(buf) {
		panic("failed to create randomness")
	}

	return permanode{
		Random:     buf[:],
		CreateTime: time.Now().UTC(),
	}
}
