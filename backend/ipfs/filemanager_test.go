package ipfs

import (
	"bytes"
	"context"
	"mintter/backend/logging"
	"strconv"
	"strings"
	"testing"

	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/sync"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	crypto "github.com/libp2p/go-libp2p/core/crypto"
	"github.com/multiformats/go-multiaddr"
	"github.com/stretchr/testify/require"
)

func TestAddFile(t *testing.T) {
	server := makeManager(t, akey)
	fileBytes, err := createFile0to100k()
	require.NoError(t, err)
	fileReader := bytes.NewReader(fileBytes)
	node, err := server.AddFile(fileReader)
	require.NoError(t, err)
	size, err := node.Size()
	require.NoError(t, err)
	require.Greater(t, int(size), len(fileBytes))
	cid := node.Cid().String()
	require.Equal(t, "bafybeiecq2irw4fl5vunnxo6cegoutv4de63h7n27tekkjtak3jrvrzzhe", cid)
}

func makeManager(t *testing.T, k crypto.PrivKey) *FileManager {
	fileManager := NewManager(context.Background(), logging.New("mintter/ipfs", "debug"))
	ds := sync.MutexWrap(datastore.NewMapDatastore())
	t.Cleanup(func() { require.NoError(t, ds.Close()) })

	n, err := NewLibp2pNode(k, ds, nil)
	require.NoError(t, err)

	ma, err := multiaddr.NewMultiaddr("/ip4/0.0.0.0/tcp/0")
	require.NoError(t, err)

	bs := blockstore.NewBlockstore(ds)

	bitswap, err := NewBitswap(n, n.Routing, bs)
	require.NoError(t, err)

	t.Cleanup(func() { require.NoError(t, bitswap.Close()) })

	require.NoError(t, n.Network().Listen(ma))

	t.Cleanup(func() { require.NoError(t, n.Close()) })

	require.NoError(t, fileManager.Start(bs, n.Host, n.Routing, n.Datastore(), bitswap))
	return fileManager
}

// createFile0to100k creates a file with the number 0 to 100k
func createFile0to100k() ([]byte, error) {
	b := strings.Builder{}
	for i := 0; i <= 100000; i++ {
		s := strconv.Itoa(i)
		_, err := b.WriteString(s)
		if err != nil {
			return nil, err
		}
	}
	return []byte(b.String()), nil
}
