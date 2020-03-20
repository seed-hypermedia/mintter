package identity_test

import (
	"testing"

	"mintter/backend/identity"

	"github.com/textileio/go-threads/core/thread"
)

func TestFromSeed(t *testing.T) {
	seed := []byte{41, 32, 223, 130, 129, 34, 30, 227, 125, 39, 207, 223, 119, 5, 116, 159}

	prof, err := identity.FromSeed(seed, 0)
	if err != nil {
		t.Fatal(err)
	}

	wantTID, err := thread.Decode("bafk7h2ggwtjmiimbotlhipyrhep5m3a2dtgkxw7gjf5gxznldzkekiy")
	if err != nil {
		t.Fatal(err)
	}

	tid := prof.ThreadID

	if tid != wantTID {
		t.Errorf("got = %s, want = %s", tid, wantTID)
	}
}
