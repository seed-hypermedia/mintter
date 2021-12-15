package backend

import (
	"encoding/hex"
	"testing"

	"mintter/backend/ipfs"
	"mintter/backend/slip10"

	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
)

func TestSLIP10Derivation(t *testing.T) {
	seed, err := hex.DecodeString("000102030405060708090a0b0c0d0e0f")
	require.NoError(t, err)

	k, err := slip10.DeriveForPath(mttSLIP10Path, seed)
	require.NoError(t, err)

	require.Equal(t, "6dba7f7e7d2e1e51072c601e2e35cdd7025cea3978c4ecc54068b84f0f666a40", hex.EncodeToString(k.Seed()))
}

func TestInviteDevice(t *testing.T) {
	tester := makeTester(t, "alice")

	binding, err := InviteDevice(tester.Account, tester.Device)
	require.NoError(t, err)

	require.NoError(t, binding.Verify(tester.Device.pub, tester.Account.pub))
}

func TestNewAccount(t *testing.T) {
	tester := makeTester(t, "alice")

	acc, err := NewAccount(tester.Account.priv)
	require.NoError(t, err)

	codec, ahash := ipfs.DecodeCID(cid.Cid(acc.id))
	require.Equal(t, codecAccountID, codec)
	require.Equal(t, "0020eacf5a07bef50d1c0cea8bee269a5236efb99b0c9033418fac30a5c722fe1960", ahash.String())
	require.True(t, tester.Account.id.Equals(acc.id))
}
