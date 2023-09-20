// Package testutil defines some useful function for testing only.
package testutil

import (
	"context"
	"os"
	"testing"
	"unicode"
	"unicode/utf8"

	"github.com/google/go-cmp/cmp"
	blockstore "github.com/ipfs/boxo/blockstore"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/sync"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
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

// MakeRepoPath for testing..
func MakeRepoPath(t testing.TB) string {
	t.Helper()

	dir, err := os.MkdirTemp("", "mintter-repo-*")
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

// MakeDatastore creates a new in-memory datastore.
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

	diff := cmp.Diff(want, got, ExportedFieldsFilter())
	if diff != "" {
		t.Log(diff)
		t.Fatalf(msg, format...)
	}
}

// ExportedFieldsFilter is a go-cmp Option which ignores recursively unexported fields.
func ExportedFieldsFilter() cmp.Option {
	return cmp.FilterPath(func(p cmp.Path) bool {
		sf, ok := p.Index(-1).(cmp.StructField)
		if !ok {
			return false
		}
		r, _ := utf8.DecodeRuneInString(sf.Name())
		return !unicode.IsUpper(r)
	}, cmp.Ignore())
}

// MockedGRPCServerStream is a mocked gRPC server stream for testing server-side streaming gRPC methods.
type MockedGRPCServerStream[T proto.Message] struct {
	C chan T
	grpc.ServerStream
}

// Send implements a gRPC stream.
func (m *MockedGRPCServerStream[T]) Send(msg T) error {
	if m.C == nil {
		m.C = make(chan T, 10)
	}
	m.C <- msg
	return nil
}
