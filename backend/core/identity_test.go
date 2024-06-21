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

	require.Equal(t, "0dd692e7e203e73ef684b767e35396472c73c030593b6c1d05792c09331fb1fa", hex.EncodeToString(k.Seed()))
}
