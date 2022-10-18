package mttacc

import (
	"mintter/backend/core/coretest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRegistrationProof(t *testing.T) {
	alice := coretest.NewTester("alice")

	proof, err := NewRegistrationProof(alice.Account, alice.DeviceID)
	require.NoError(t, err)

	require.NoError(t, proof.Verify(alice.Account.PublicKey, alice.DeviceID))
}
