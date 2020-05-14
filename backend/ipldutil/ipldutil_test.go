package ipldutil

import (
	"testing"

	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/stretchr/testify/require"

	cbornode "github.com/ipfs/go-ipld-cbor"
)

func init() {
	cbornode.RegisterCborType(testNode{})
}

func TestSign(t *testing.T) {
	k := testKey(t)

	inputNode := testNode{
		A: "A",
		B: "B",
	}
	n, err := MarshalSigned(inputNode, k)
	require.NoError(t, err)

	expected := []byte{162, 100, 100, 97, 116, 97, 73, 162, 97, 97, 97, 65, 97, 98, 97, 66, 105, 115, 105, 103, 110, 97, 116, 117, 114, 101, 88, 64, 171, 40, 179, 176, 124, 194, 230, 82, 182, 161, 204, 12, 180, 143, 139, 35, 157, 79, 97, 224, 206, 216, 14, 69, 74, 37, 182, 173, 120, 148, 77, 36, 127, 16, 62, 200, 130, 71, 154, 220, 130, 194, 188, 90, 212, 211, 126, 245, 234, 96, 237, 136, 49, 60, 194, 58, 74, 162, 153, 131, 25, 115, 179, 15}
	require.Equal(t, expected, n.RawData())

	var readNode testNode
	require.NoError(t, UnmarshalSigned(n.RawData(), &readNode, k.GetPublic()))
	require.Equal(t, inputNode, readNode)
}

type testNode struct {
	A string
	B string
}

func testKey(t *testing.T) crypto.PrivKey {
	t.Helper()

	k, err := crypto.UnmarshalPrivateKey(testPrivKey)
	require.NoError(t, err)
	return k
}

var testPrivKey = []byte{8, 1, 18, 64, 141, 217, 97, 161, 98, 177, 104, 6, 24, 168, 146, 228, 157, 124, 10, 193, 14, 172, 253, 73, 131, 84, 197, 6, 22, 185, 59, 142, 242, 108, 168, 223, 229, 167, 193, 87, 76, 227, 4, 245, 31, 230, 49, 188, 174, 25, 46, 216, 2, 41, 243, 148, 131, 10, 236, 112, 200, 53, 156, 108, 127, 231, 128, 123}
