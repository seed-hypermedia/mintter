package backend

import (
	"encoding/hex"
	"mintter/backend/slip10"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFoo(t *testing.T) {
	seed, err := hex.DecodeString("000102030405060708090a0b0c0d0e0f")
	require.NoError(t, err)

	k, err := slip10.DeriveForPath(mttSLIP10Path, seed)
	require.NoError(t, err)
	_ = k
}
