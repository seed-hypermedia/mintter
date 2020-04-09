package appendonly

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"testing"
	"time"

	"mintter/backend/identity"

	"github.com/fxamacker/cbor/v2"
	"github.com/ipfs/go-datastore"
	badger "github.com/ipfs/go-ds-badger"
	"github.com/stretchr/testify/require"
)

type About struct {
	FirstName string `cbor:"firstName"`
	LastName  string `cbor:"lastName"`
	Bio       string `cbor:"bio"`
}

func TestLogAppend(t *testing.T) {
	log := makeLog(t)

	cases := []struct {
		In               interface{}
		WantSeq          int
		WantHash         string
		WantSignature    []byte
		WantSigningBytes []byte
	}{
		{
			In:               About{FirstName: "Alex"},
			WantSeq:          0,
			WantHash:         "12204837b92e4f827f8b73b163b6f83b59cb7fa2624d7393c448cf33802662058190",
			WantSignature:    []byte{0x55, 0x66, 0x68, 0x40, 0xc7, 0x21, 0x73, 0x26, 0xba, 0x99, 0x1c, 0x54, 0xd6, 0x66, 0xdb, 0x57, 0x90, 0xe2, 0x45, 0x20, 0x79, 0x6f, 0x3d, 0x49, 0xa4, 0x6b, 0x26, 0xbf, 0x1c, 0x7a, 0xfb, 0xab, 0xfc, 0x15, 0xf2, 0x11, 0x40, 0x84, 0x5c, 0x5, 0x84, 0x75, 0x53, 0x8b, 0xc2, 0xf0, 0x69, 0x48, 0xd9, 0x3c, 0xce, 0x44, 0x17, 0x91, 0xd0, 0x40, 0x29, 0x69, 0x2, 0x7c, 0xc3, 0x89, 0xe8, 0xc},
			WantSigningBytes: []byte{0x12, 0x20, 0xac, 0xf1, 0x8e, 0xb6, 0x77, 0xd3, 0x42, 0xf7, 0xaf, 0x9b, 0x83, 0x3b, 0x73, 0x4, 0x3d, 0x71, 0xbf, 0xa7, 0x1, 0x3d, 0x57, 0x2d, 0xd, 0xe4, 0x1a, 0x9b, 0xd5, 0x7e, 0x18, 0x47, 0xf8, 0x4a},
		},
		{
			In:               About{LastName: "Burdiyan", Bio: "Fake bio"},
			WantSeq:          1,
			WantHash:         "122087761d772b3c197a43ed7707ed550f3166f04a298a8ab20731551c950a151f68",
			WantSignature:    []byte{0xf, 0x17, 0xa0, 0xfd, 0x61, 0xc8, 0xd4, 0x99, 0xe5, 0xb5, 0x31, 0x5b, 0xcb, 0xd7, 0x73, 0xe, 0xe0, 0xe1, 0x72, 0xf6, 0xcc, 0x62, 0xf5, 0x48, 0x80, 0x21, 0xd8, 0x26, 0x4, 0xa0, 0x15, 0xf0, 0xca, 0xec, 0x9e, 0x23, 0x28, 0x50, 0xed, 0x6f, 0xd5, 0xbc, 0x1c, 0x31, 0xb8, 0x10, 0x32, 0x85, 0xd0, 0xf8, 0x25, 0xd3, 0x6d, 0x1c, 0xad, 0x6, 0xbe, 0x93, 0xc2, 0x10, 0xc2, 0xf3, 0x68, 0x4},
			WantSigningBytes: []byte{0x12, 0x20, 0x13, 0x31, 0x23, 0x2b, 0x1b, 0x3b, 0x9d, 0x99, 0xf6, 0x4, 0x75, 0x72, 0xc0, 0xf2, 0x17, 0x9d, 0x2b, 0xe5, 0x5a, 0xa3, 0x68, 0xf1, 0x49, 0x1f, 0x9c, 0x71, 0x64, 0x45, 0x53, 0xdd, 0x71, 0x9d},
		},
	}

	var added []SignedRecord

	// Append records and check expectations.
	for i, c := range cases {
		t.Run(fmt.Sprintf("test append records %d", i), func(t *testing.T) {
			rec, err := log.Append(c.In)
			require.NoError(t, err)

			added = append(added, rec)

			require.NoError(t, rec.Verify(log.prof.PubKey))
			require.Equal(t, c.WantSeq, rec.Record.Seq)
			require.Equal(t, c.WantHash, rec.Hash())
			require.Equal(t, c.WantSignature, rec.Signature)
			require.Equal(t, c.WantSigningBytes, rec.SigningBytes())

			var a About
			require.NoError(t, cbor.Unmarshal(rec.Record.Content, &a))
			require.Equal(t, c.In, a, "record content must match the inserted data")

			if rec.Record.Seq > 0 {
				require.Equal(t, cases[rec.Record.Seq-1].WantHash, rec.Record.Previous)
			}
		})
	}

	require.Equal(t, len(cases), len(added))

	// === Test Get ===

	for i, rec := range added {
		t.Run(fmt.Sprintf("test get records %d", i), func(t *testing.T) {
			sr, err := log.Get(rec.Record.Seq)
			require.NoError(t, err)
			require.Equal(t, rec, sr)
			require.NoError(t, sr.Verify(log.prof.PubKey))
		})
	}

	// === Test List ===

	list, err := log.List(0, 0)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, list.Close())
	}()

	for {
		sr, more := list.Next(context.TODO())
		if !more {
			break
		}

		rec := added[sr.Record.Seq]

		require.Equal(t, rec, sr)
		require.NoError(t, sr.Verify(log.prof.PubKey))
	}
}

func TestLogInit(t *testing.T) {
	log := makeLog(t)

	// Append some records.
	r1, err := log.Append(About{FirstName: "Alex"})
	require.NoError(t, err)
	require.Equal(t, 0, r1.Record.Seq)
	r2, err := log.Append(About{LastName: "Burdiyan"})
	require.NoError(t, err)
	require.Equal(t, 1, r2.Record.Seq)

	// Recreate log from the existing store.
	log, err = NewLog(log.name, log.prof, log.db)
	require.NoError(t, err)
	log.nowFunc = mockTime(time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC), time.Second)

	r3, err := log.Append(About{Bio: "Fake bio"})
	require.NoError(t, err)
	require.Equal(t, 2, r3.Record.Seq)
}

func mockTime(start time.Time, interval time.Duration) func() time.Time {
	var calls int

	return func() time.Time {
		calls++
		return start.Add(time.Duration(calls) * interval)
	}
}

func makeLog(t *testing.T) *Log {
	t.Helper()

	seed := []byte{41, 32, 223, 130, 129, 34, 30, 227, 125, 39, 207, 223, 119, 5, 116, 159}

	prof, err := identity.FromSeed(seed, 0)
	require.NoError(t, err)

	store := badgerStore(t)

	log, err := NewLog("profile", prof.Account, store)
	require.NoError(t, err)
	log.nowFunc = mockTime(time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC), time.Second)

	return log
}

func badgerStore(t *testing.T) datastore.TxnDatastore {
	t.Helper()

	dataPath, err := ioutil.TempDir(os.TempDir(), "badger")
	require.NoError(t, err)

	store, err := badger.NewDatastore(dataPath, nil)
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, store.Close())
		require.NoError(t, os.RemoveAll(dataPath))
	})

	return store
}
