package identity_test

import (
	"encoding/json"
	"testing"

	"mintter/backend/identity"

	"github.com/stretchr/testify/require"
	"github.com/textileio/go-threads/core/thread"
)

func TestProfile(t *testing.T) {
	seed := []byte{41, 32, 223, 130, 129, 34, 30, 227, 125, 39, 207, 223, 119, 5, 116, 159}

	prof, err := identity.FromSeed(seed, 0)
	require.NoError(t, err)

	wantTID, err := thread.Decode("bafk7h2ggwtjmiimbotlhipyrhep5m3a2dtgkxw7gjf5gxznldzkekiy")
	require.NoError(t, err)

	tid := prof.ThreadID
	require.Equal(t, wantTID, tid)

	// === Test JSON encoding ===

	data, err := json.Marshal(prof)
	require.NoError(t, err)

	var readProf identity.Profile
	err = json.Unmarshal(data, &readProf)
	require.NoError(t, err)

	require.Equal(t, prof, readProf)
}
