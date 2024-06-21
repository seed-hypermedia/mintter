// Package testutil defines some useful function for testing only.
package testutil

import (
	"context"
	"os"
	"strings"
	"testing"
	"unicode"
	"unicode/utf8"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
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

	dir, err := os.MkdirTemp("", "seed-repo-*")
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
//
// Deprecated: use StructsEqual instead.
func ProtoEqual(t *testing.T, want, got proto.Message, msg string, format ...interface{}) {
	t.Helper()

	diff := cmp.Diff(want, got, ExportedFieldsFilter())
	if diff != "" {
		t.Log(diff)
		t.Fatalf(msg, format...)
	}
}

// StructsEqualBuilder is a fluent interface for comparing structs.
type StructsEqualBuilder[T any] struct {
	a    T
	b    T
	opts []cmp.Option
}

// StructsEqual compares two structs of the same time for equality. It allows to specify field names to ignore.
func StructsEqual[T any](a, b T) *StructsEqualBuilder[T] {
	return &StructsEqualBuilder[T]{a: a, b: b, opts: []cmp.Option{ExportedFieldsFilter()}}
}

// IgnoreFields allows to ignore fields on a certain type.
// Type must be non-pointer value.
func (sb *StructsEqualBuilder[T]) IgnoreFields(_type any, fields ...string) *StructsEqualBuilder[T] {
	sb.opts = append(sb.opts, cmpopts.IgnoreFields(_type, fields...))
	return sb
}

// Compare executes the final comparison.
func (sb *StructsEqualBuilder[T]) Compare(t *testing.T, msg string, format ...any) {
	t.Helper()

	diff := cmp.Diff(sb.a, sb.b, sb.opts...)
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

// Manual marks the test to run only if it's triggered manually, either with -run flag or by IDE.
func Manual(t *testing.T) {
	tname := t.Name()
	for _, arg := range os.Args {
		if strings.Contains(arg, "__debug_bin") {
			return
		}
		runValue, ok := strings.CutPrefix(arg, "-test.run=")
		if !ok {
			continue
		}

		// VSCode uses the regexp format for the run flag.
		if runValue == tname || runValue == "^"+tname+"$" {
			return
		}
	}

	t.Skip("manual test is skipped")
}
