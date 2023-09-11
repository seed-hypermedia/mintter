package syncing

import (
	"bytes"
	"context"
	"fmt"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	"mintter/backend/daemon/storage"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/logging"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/must"
	"testing"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestSync(t *testing.T) {
	t.Parallel()

	type Node struct {
		*mttnet.Node

		Syncer *Service
	}

	newNode := func(name string) Node {
		var n Node

		db := storage.MakeTestDB(t)
		peer, stop := makeTestPeer(t, db, name)
		t.Cleanup(stop)
		n.Node = peer

		n.Syncer = NewService(must.Do2(zap.NewDevelopment()).Named(name), peer.ID(), db, peer.Blobs(), peer.Bitswap(), peer.Client, false)

		return n
	}

	alice := newNode("alice")
	bob := newNode("bob")
	ctx := context.Background()

	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()))

	entity := hyper.NewEntity("foo")
	blob, err := entity.CreateChange(entity.NextTimestamp(), alice.ID().DeviceKey(), getDelegation(ctx, alice.ID(), alice.Blobs()), map[string]any{
		"name": "alice",
	})
	require.NoError(t, err)
	require.NoError(t, alice.Blobs().SaveBlob(ctx, blob))

	res, err := bob.Syncer.Sync(ctx)
	require.NoError(t, err)
	require.Equalf(t, int64(0), res.NumSyncFailed, "unexpected number of sync failures: %v", res.Errs)
	require.Equal(t, int64(1), res.NumSyncOK, "unexpected number of successful syncs")

	{
		blk, err := bob.Blobs().IPFSBlockstoreReader().Get(ctx, blob.CID)
		require.NoError(t, err)

		require.Equal(t, blob.Data, blk.RawData(), "bob must sync alice's change intact")
	}
}

// TODO(burdiyan): fix the test
// func TestSyncWithList(t *testing.T) {
// 	t.Parallel()

// 	type Node struct {
// 		*mttnet.Node

// 		Syncer *Service
// 	}

// 	newNode := func(name string, inDisable bool) Node {
// 		var n Node

// 		peer, stop := makeTestPeer(t, name)
// 		t.Cleanup(stop)
// 		n.Node = peer

// 		n.Syncer = NewService(must.Do2(zap.NewDevelopment()).Named(name), peer.ID(), peer.VCS(), peer.Bitswap(), peer.Client, inDisable)

// 		return n
// 	}
// 	alice := newNode("alice", false)
// 	bob := newNode("bob", true)
// 	ctx := context.Background()

// 	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()))

// 	var alicePerma vcs.EncodedPermanode
// 	var wantDatoms []sqlitevcs.Datom
// 	var publicVersion string
// 	{
// 		conn, release, err := alice.VCS().Conn(ctx)
// 		require.NoError(t, err)

// 		err = conn.WithTx(true, func() error {
// 			clock := hlc.NewClock()
// 			perma, err := vcs.EncodePermanode(sqlitevcs.NewDocumentPermanode(alice.ID().AccountID(), clock.Now()))
// 			alicePerma = perma
// 			require.NoError(t, err)
// 			obj := conn.NewObject(perma)
// 			idLocal := conn.EnsureIdentity(alice.ID())
// 			change := conn.NewChange(obj, idLocal, nil, clock)

// 			wantDatoms = []sqlitevcs.Datom{
// 				vcs.NewDatom(vcs.RootNode, "title", "This is a title", clock.Now().Pack(), 123),
// 			}

// 			conn.AddDatoms(obj, change, wantDatoms...)
// 			conn.SaveVersion(obj, "main", idLocal, sqlitevcs.LocalVersion{change})
// 			conn.EncodeChange(change, alice.ID().DeviceKey())
// 			version := conn.GetVersion(obj, "main", idLocal)
// 			publicVersion = conn.LocalVersionToPublic(version).String()
// 			return nil
// 		})
// 		release()
// 		require.NoError(t, err)
// 	}

// 	require.NoError(t, bob.Syncer.SyncWithPeer(ctx, alice.ID().DeviceKey().CID(), alicePerma.ID...))

// 	{
// 		conn, release, err := bob.VCS().Conn(ctx)
// 		require.NoError(t, err)

// 		err = conn.WithTx(false, func() error {
// 			obj := conn.LookupPermanode(alicePerma.ID)
// 			idLocal := conn.LookupIdentity(bob.ID())
// 			version := conn.GetVersion(obj, "main", idLocal)
// 			cs := conn.ResolveChangeSet(obj, version)

// 			var i int
// 			it := conn.QueryObjectDatoms(obj, cs)
// 			for it.Next() {
// 				i++
// 			}
// 			require.Equal(t, len(wantDatoms), i, "must get the same number of datoms as in the original object")

// 			return nil
// 		})
// 		release()
// 		require.NoError(t, err)
// 	}
// }

func makeTestPeer(t *testing.T, db *sqlitex.Pool, name string) (*mttnet.Node, context.CancelFunc) {
	u := coretest.NewTester(name)

	blobs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	_, err := daemon.Register(context.Background(), blobs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.NoRelay = true
	cfg.BootstrapPeers = nil
	cfg.NoMetrics = true
	n, err := mttnet.New(cfg, db, blobs, u.Identity, must.Do2(zap.NewDevelopment()).Named(name))
	require.NoError(t, err)

	errc := make(chan error, 1)
	ctx, cancel := context.WithCancel(context.Background())
	f := future.New[*mttnet.Node]()

	require.NoError(t, f.Resolve(n))
	go func() {
		errc <- n.Start(ctx)
	}()

	t.Cleanup(func() {
		require.NoError(t, <-errc)
	})

	select {
	case <-n.Ready():
	case err := <-errc:
		require.NoError(t, err)
	}

	return n, cancel
}

func getDelegation(ctx context.Context, me core.Identity, blobs *hyper.Storage) cid.Cid {
	var out cid.Cid

	// TODO(burdiyan): need to cache this. Makes no sense to always do this.
	if err := blobs.Query(ctx, func(conn *sqlite.Conn) error {
		acc := me.Account().Principal()
		dev := me.DeviceKey().Principal()

		list, err := hypersql.KeyDelegationsList(conn, acc)
		if err != nil {
			panic(err)
		}

		for _, res := range list {
			if bytes.Equal(dev, res.KeyDelegationsViewDelegate) {
				out = cid.NewCidV1(uint64(res.KeyDelegationsViewBlobCodec), res.KeyDelegationsViewBlobMultihash)
				return nil
			}
		}

		return nil
	}); err != nil {
		panic(err)
	}

	if !out.Defined() {
		panic(fmt.Errorf("BUG: failed to find our own key delegation"))
	}

	return out
}
