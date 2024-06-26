package rbsr

import (
	"encoding/hex"
	"fmt"
	"os"
	p2p "seed/backend/genproto/p2p/v1alpha"
	"seed/backend/pkg/must"
	"strconv"
	"testing"

	"github.com/jedib0t/go-pretty/v6/table"
	"github.com/stretchr/testify/require"
)

func TestReplication(t *testing.T) {
	dataset := make([]Item, 10000)
	{
		var ts int64 = 1
		const itemsPerTimestamp = 20
		for i := range dataset {
			if i%itemsPerTimestamp == 0 {
				ts++
			}

			dataset[i] = Item{
				Timestamp: ts,
				Value:     []byte("Hello " + strconv.Itoa(i)),
			}
		}
	}

	testReplicate := func(t *testing.T, client, server *peer, wantRounds int) {
		t.Helper()

		must.Do(client.store.Seal())
		must.Do(server.store.Seal())

		msg, err := client.ne.Initiate()
		require.NoError(t, err)

		var allWants [][]byte

		var rounds int
		for msg != nil {
			rounds++
			if rounds > 1000 {
				panic("BUG: too many round spinning")
			}

			msg, err = server.ne.Reconcile(msg)
			require.NoError(t, err)

			var haves, wants [][]byte
			msg, err = client.ne.ReconcileWithIDs(msg, &haves, &wants)
			require.NoError(t, err)
			allWants = append(allWants, wants...)
		}

		require.Equal(t, wantRounds, rounds, "round-trip don't match")

		ds := make(map[string]struct{}, len(dataset))
		for _, item := range dataset {
			ds[string(item.Value[:])] = struct{}{}
		}

		clientData := make(map[string]struct{}, len(dataset))
		if err := client.store.ForEach(0, client.store.Size(), func(i int, item Item) bool {
			clientData[string(item.Value)] = struct{}{}
			return true
		}); err != nil {
			t.Fatal(err)
		}

		for _, w := range allWants {
			clientData[string(w)] = struct{}{}
		}

		require.Equal(t, ds, clientData)
	}

	t.Run("ClientHasAll", func(t *testing.T) {
		client := newPeer()
		server := newPeer()
		for _, x := range dataset {
			must.Do(client.store.Insert(x.Timestamp, x.Value))
		}
		testReplicate(t, client, server, 1)
	})

	t.Run("ServerHasAll", func(t *testing.T) {
		client := newPeer()
		server := newPeer()
		for _, x := range dataset {
			must.Do(server.store.Insert(x.Timestamp, x.Value))
		}
		testReplicate(t, client, server, 2)
	})

	t.Run("BothHaveAll", func(t *testing.T) {
		client := newPeer()
		server := newPeer()
		for _, x := range dataset {
			must.Do(client.store.Insert(x.Timestamp, x.Value))
			must.Do(server.store.Insert(x.Timestamp, x.Value))
		}
		testReplicate(t, client, server, 1)
	})

	t.Run("BothHaveDisjoint", func(t *testing.T) {
		client := newPeer()
		server := newPeer()

		for _, x := range dataset[0 : len(dataset)/2] {
			must.Do(client.store.Insert(x.Timestamp, x.Value[:]))
		}

		for _, x := range dataset[len(dataset)/2:] {
			must.Do(server.store.Insert(x.Timestamp, x.Value[:]))
		}

		testReplicate(t, client, server, 3)
	})

	t.Run("BothHaveInterleaved", func(t *testing.T) {
		client := newPeer()
		server := newPeer()
		for i, x := range dataset {
			if i%2 == 0 {
				must.Do(client.store.Insert(x.Timestamp, x.Value[:]))
			} else {
				must.Do(server.store.Insert(x.Timestamp, x.Value[:]))
			}
		}
		testReplicate(t, client, server, 3)
	})
}

func TestSmoke(t *testing.T) {
	p1 := newPeer()
	p2 := newPeer()

	var ts int64 = 1
	for i := 0; i < 10000; i++ {
		if i%20 == 0 {
			ts++
		}

		must.Do(p2.store.Insert(ts, []byte("Hello "+strconv.Itoa(i))))
	}

	must.Do(p2.store.Seal())

	must.Do(p1.store.Seal())
	msg := must.Do2(p1.ne.Initiate())

	var err error
	var count int
	for msg != nil {
		count++

		p2.printSummary2(msg)

		msg, err = p2.ne.Reconcile(msg)
		if err != nil {
			panic(err)
		}

		fmt.Println("==== Server message =====")
		p2.printSummary2(msg)

		var haves, wants [][]byte
		msg, err = p1.ne.ReconcileWithIDs(msg, &haves, &wants)
		if err != nil {
			panic(err)
		}

		fmt.Println("Round", count, "Haves:", len(haves), "Wants:", len(wants))
	}
}

type peer struct {
	store Store
	ne    *Session
}

func newPeer() *peer {
	s := NewSliceStore()
	ne, err := NewSession(s, 50000)
	if err != nil {
		panic(err)
	}
	return &peer{store: s, ne: ne}
}

func (p *peer) printSummary2(msg []*p2p.SetReconciliationRange) {
	tw := table.NewWriter()
	tw.SetOutputMirror(os.Stdout)
	tw.SetStyle(table.StyleLight)
	tw.AppendHeader(table.Row{"Mode", "Ts", "Prefix", "Fingerprint", "NumIDs"})

	for _, rng := range msg {
		tw.AppendRow(table.Row{
			strconv.Itoa(int(rng.Mode)),
			strconv.FormatInt(rng.BoundTimestamp, 10),
			hex.EncodeToString(rng.BoundValue),
			hex.EncodeToString(rng.Fingerprint),
			strconv.Itoa(len(rng.Values)),
		})
	}
	tw.Render()
}
