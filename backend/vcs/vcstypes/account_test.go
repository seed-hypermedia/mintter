package vcstypes

import (
	"mintter/backend/core/coretest"
	"mintter/backend/vcs"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAccount_RegisterDevice(t *testing.T) {
	alice := coretest.NewTester("alice")

	perma := NewAccountPermanode(alice.AccountID)
	blk, err := vcs.EncodeBlock[vcs.Permanode](perma)
	require.NoError(t, err)

	acc := NewAccount(blk.Cid(), alice.AccountID)

	require.NoError(t, acc.RegisterDevice(alice.Device.PublicKey, alice.Account))

	require.Len(t, acc.events, 1)
}

func TestRegistrationProof(t *testing.T) {
	alice := coretest.NewTester("alice")

	proof, err := NewRegistrationProof(alice.Account, alice.DeviceID)
	require.NoError(t, err)

	require.NoError(t, proof.Verify(alice.Account.PublicKey, alice.DeviceID))
}
