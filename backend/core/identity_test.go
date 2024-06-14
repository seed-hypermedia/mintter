package core

import (
	"encoding/hex"
	"seed/backend/pkg/slip10"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSLIP10Derivation(t *testing.T) {
	seed, err := hex.DecodeString("000102030405060708090a0b0c0d0e0f")
	require.NoError(t, err)

	k, err := slip10.DeriveForPath(keyDerivationPath, seed)
	require.NoError(t, err)

	require.Equal(t, "6dba7f7e7d2e1e51072c601e2e35cdd7025cea3978c4ecc54068b84f0f666a40", hex.EncodeToString(k.Seed()))
}
