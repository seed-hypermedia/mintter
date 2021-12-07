package testutil

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"testing"

	"mintter/backend/badger3ds"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/sync"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/ipfs/go-log/v2"
	"github.com/multiformats/go-multihash"
	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

// MakeCID with specified data.
func MakeCID(t *testing.T, data string) cid.Cid {
	t.Helper()
	return MakeCIDWithCodec(t, cid.Raw, data)
}

// MakeCIDWithCodec makes CID with a given codec.
func MakeCIDWithCodec(t *testing.T, codec uint64, data string) cid.Cid {
	t.Helper()
	mh, err := multihash.Sum([]byte(data), multihash.IDENTITY, -1)
	require.NoError(t, err)

	return cid.NewCidV1(codec, mh)
}

// MakeBadgerV3 creates an in-memory instance of Badger v3.
func MakeBadgerV3(t *testing.T) *badger.DB {
	opts := badger3ds.DefaultOptions("")
	opts.InMemory = true
	log.SetLogLevel("badger", "ERROR")
	ds, err := badger3ds.NewDatastore(opts)
	require.NoError(t, err)

	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, ds.Close())
	})

	return ds.DB
}

// MakeRepoPath for testing..
func MakeRepoPath(t *testing.T) string {
	t.Helper()

	dir, err := ioutil.TempDir("", "mintter-repo-*")
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, os.RemoveAll(dir))
	})

	return dir
}

// MakeBlockStore creates a new in-memory block store for tests.
func MakeBlockStore(t *testing.T) blockstore.Blockstore {
	return blockstore.NewBlockstore(MakeDatastore(t))
}

// MakeDatastore creates a new in-memory datastore
func MakeDatastore(t *testing.T) *FakeTxnDatastore {
	t.Helper()
	return &FakeTxnDatastore{sync.MutexWrap(datastore.NewMapDatastore())}
}

// FakeTxnDatastore implements wraps a datastore with fake transactions.
type FakeTxnDatastore struct {
	datastore.Batching
}

// NewTransaction implements TxnDatastore.
func (ds *FakeTxnDatastore) NewTransaction(readOnly bool) (datastore.Txn, error) {
	return &fakeTxn{ds}, nil
}

type fakeTxn struct {
	datastore.Datastore
}

func (txn *fakeTxn) Commit(ctx context.Context) error {
	return nil
}

func (txn *fakeTxn) Discard(ctx context.Context) {}

// ProtoEqual will check if want and got are equal Protobuf messages.
// For some weird reason they made Messages uncomparable using normal mechanisms.
func ProtoEqual(t *testing.T, want, got proto.Message, msg string, format ...interface{}) {
	t.Helper()
	ok := proto.Equal(want, got)
	if !ok {
		fmt.Println("Want:")
		litter.Dump(want)
		fmt.Println("Got:")
		litter.Dump(got)

		if format != nil {
			t.Fatalf(msg, format...)
		} else {
			t.Fatal(msg)
		}
	}
}
