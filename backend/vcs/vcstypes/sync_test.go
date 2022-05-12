package vcstypes

import (
	"mintter/backend/core/coretest"
	"mintter/backend/vcs"
	"testing"

	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/stretchr/testify/require"
)

func TestPermanodeFromMap(t *testing.T) {
	alice := coretest.NewTester("alice")

	tests := []struct {
		In vcs.Permanode
	}{
		{In: NewDocumentPermanode(alice.AccountID)},
		{In: NewAccountPermanode(alice.AccountID)},
	}

	for _, tt := range tests {
		data, err := cbornode.DumpObject(tt.In)
		require.NoError(t, err)

		var v interface{}
		require.NoError(t, cbornode.DecodeInto(data, &v))

		p, err := permanodeFromMap(v)
		require.NoError(t, err)

		require.Equal(t, tt.In.PermanodeType(), p.PermanodeType())
		require.Equal(t, tt.In.PermanodeOwner(), p.PermanodeOwner())
		require.Equal(t, tt.In.PermanodeCreateTime(), p.PermanodeCreateTime())
	}

	_, err := permanodeFromMap(map[string]interface{}{})
	require.Error(t, err)

	_, err = permanodeFromMap(nil)
	require.Error(t, err)
}
