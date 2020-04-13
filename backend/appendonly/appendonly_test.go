package appendonly

import (
	"context"
	"encoding/json"
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

	var cases []struct {
		In               About
		WantSeq          int
		WantHash         string
		WantSignature    []byte
		WantSigningBytes []byte
	}

	isGolden := os.Getenv("MTT_TEST_GOLDEN") != ""

	// Load cases from file.
	{
		testdata, err := ioutil.ReadFile("testdata/" + t.Name() + ".json")
		require.NoError(t, err)
		require.NoError(t, json.Unmarshal(testdata, &cases))
	}

	var added []LogRecord

	// Append records and check expectations.
	for i, c := range cases {
		t.Run(fmt.Sprintf("test append records %d", i), func(t *testing.T) {
			lr, err := log.Append(c.In)
			require.NoError(t, err)
			added = append(added, lr)

			if isGolden {
				c.WantSeq = lr.Seq
				c.WantHash = lr.Rec.Hash()
				c.WantSignature = lr.Rec.Signature
				c.WantSigningBytes = lr.Rec.SigningBytes()
				cases[i] = c
			}

			require.NoError(t, lr.Rec.Verify(log.prof.PubKey))
			require.Equal(t, c.WantSeq, lr.Seq)
			require.Equal(t, c.WantHash, lr.Rec.Hash())
			require.Equal(t, c.WantSignature, lr.Rec.Signature)
			require.Equal(t, c.WantSigningBytes, lr.Rec.SigningBytes())

			var a About
			require.NoError(t, cbor.Unmarshal(lr.Rec.Record.Content, &a))
			require.Equal(t, c.In, a, "record content must match the inserted data")

			if lr.Seq > 0 {
				require.Equal(t, cases[lr.Seq-1].WantHash, lr.Rec.Record.Previous)
			}
		})
	}

	require.Equal(t, len(cases), len(added))

	// Overwrite golden files for test if needed.
	if isGolden {
		f, err := os.Create("testdata/" + t.Name() + ".json")
		require.NoError(t, err)
		enc := json.NewEncoder(f)
		enc.SetIndent("", "  ")
		err = enc.Encode(cases)
		require.NoError(t, err)
		require.NoError(t, f.Close())
	}

	// === Test Get ===

	for i, rec := range added {
		t.Run(fmt.Sprintf("test get records %d", i), func(t *testing.T) {
			lr, err := log.Get(rec.Seq)
			require.NoError(t, err)
			require.Equal(t, rec, lr)
			require.NoError(t, lr.Rec.Verify(log.prof.PubKey))
		})
	}

	// === Test List ===

	list, err := log.List(0, 0)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, list.Close())
	}()

	for {
		lr, more := list.Next(context.TODO())
		if !more {
			break
		}

		rec := added[lr.Seq]

		require.Equal(t, rec, lr)
		require.NoError(t, lr.Rec.Verify(log.prof.PubKey))
	}
}

func TestLogInit(t *testing.T) {
	log := makeLog(t)

	// Append some records.
	r1, err := log.Append(About{FirstName: "Alex"})
	require.NoError(t, err)
	require.Equal(t, 0, r1.Seq)
	r2, err := log.Append(About{LastName: "Burdiyan"})
	require.NoError(t, err)
	require.Equal(t, 1, r2.Seq)

	// Recreate log from the existing store.
	log, err = NewLog(log.name, log.prof, log.db)
	require.NoError(t, err)
	log.nowFunc = mockTime(time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC), time.Second)

	r3, err := log.Append(About{Bio: "Fake bio"})
	require.NoError(t, err)
	require.Equal(t, 2, r3.Seq)
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
