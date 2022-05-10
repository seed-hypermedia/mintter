package backend

import (
	"testing"

	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/stretchr/testify/require"
)

type foo struct {
	Name string
}

func init() {
	cbornode.RegisterCborType(foo{})
}

func TestSignedCBOR(t *testing.T) {
	key := makeTester(t, "alice").Device
	in := foo{"Alex"}
	signed, err := SignCBOR(in, key)
	require.NoError(t, err)

	var out foo
	require.NoError(t, cbornode.DecodeInto(signed.signingBytes, &out))

	require.Equal(t, in, out)
}
