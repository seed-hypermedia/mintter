package appendonly

import (
	"context"
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
			WantHash:         "1220305e00746c56f8cdf695ad03992cfb4918d0d7922ee2a750b94b3d2c811c2820",
			WantSignature:    []byte{8, 251, 227, 78, 151, 93, 223, 156, 233, 15, 158, 107, 190, 100, 171, 137, 226, 58, 23, 40, 160, 32, 103, 81, 127, 206, 107, 186, 246, 138, 250, 94, 125, 58, 251, 175, 198, 198, 38, 57, 174, 103, 106, 24, 102, 235, 240, 75, 121, 188, 141, 129, 149, 73, 192, 30, 239, 193, 158, 199, 242, 188, 235, 5},
			WantSigningBytes: []byte{18, 32, 194, 197, 166, 125, 171, 151, 47, 54, 138, 51, 106, 168, 196, 121, 231, 36, 192, 254, 186, 253, 124, 13, 169, 61, 64, 85, 254, 182, 43, 184, 196, 221},
		},
		{
			In:               About{LastName: "Burdiyan", Bio: "Fake bio"},
			WantSeq:          1,
			WantHash:         "1220a2691f5ef5461d777ef51724be8b043d0c7ca49aa2dc54bfbcf5eddfb004d3bc",
			WantSignature:    []byte{238, 16, 26, 200, 73, 48, 76, 58, 247, 46, 62, 6, 245, 177, 202, 52, 135, 107, 178, 204, 215, 195, 27, 76, 245, 8, 168, 150, 157, 59, 19, 31, 183, 235, 162, 129, 206, 216, 233, 58, 47, 207, 155, 126, 232, 95, 199, 136, 94, 106, 30, 14, 205, 105, 158, 56, 221, 231, 173, 217, 104, 210, 112, 2},
			WantSigningBytes: []byte{18, 32, 83, 194, 42, 199, 100, 109, 177, 168, 85, 61, 137, 151, 12, 141, 206, 225, 252, 111, 100, 90, 39, 3, 206, 184, 221, 145, 64, 130, 197, 229, 245, 120},
		},
	}

	var added []SignedRecord

	// Append records and check expectations.
	for _, c := range cases {
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
	}

	require.Equal(t, len(cases), len(added))

	// === Test Get ===

	for _, rec := range added {
		sr, err := log.Get(rec.Record.Seq)
		require.NoError(t, err)
		require.Equal(t, rec, sr)
		require.NoError(t, sr.Verify(log.prof.PubKey))
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

	log, err := NewLog("profile", prof, store)
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
