package core

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPrincipalUnsafeString(t *testing.T) {
	// Hardcoded key generated offline.
	me, err := DecodePrincipal("z6Mkv1LjkRosErBhmqrkmb5sDxXNs6EzBDSD8ktywpYLLGuC")
	require.NoError(t, err)
	require.Equal(t, string(me), me.UnsafeString())
}
