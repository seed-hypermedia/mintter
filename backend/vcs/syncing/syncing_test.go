package syncing

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/must"
	"mintter/backend/testutil"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"mintter/backend/vcs/sqlitevcs"
	"path/filepath"
	"testing"

	"crawshaw.io/sqlite/sqlitex"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestPermanodeFromMap(t *testing.T) {
	alice := coretest.NewTester("alice")

	tests := []struct {
		In vcs.Permanode
	}{
		{In: sqlitevcs.NewDocumentPermanode(alice.Identity.AccountID(), hlc.NewClock().Now())},
		{In: sqlitevcs.NewAccountPermanode(alice.Identity.AccountID())},
	}

	for _, tt := range tests {
		data, err := cbornode.DumpObject(tt.In)
		require.NoError(t, err)

		var v interface{}
		require.NoError(t, cbornode.DecodeInto(data, &v))

		p, err := permanodeFromMap(v)
		require.NoError(t, err)

		require.Equal(t, tt.In.PermanodeType(), p.PermanodeType())
		require.Equal(t, tt.In.PermanodeOwner(), p.PermanodeOwner())
		require.Equal(t, tt.In.PermanodeCreateTime(), p.PermanodeCreateTime())
	}

	_, err := permanodeFromMap(map[string]interface{}{})
	require.Error(t, err)

	_, err = permanodeFromMap(nil)
	require.Error(t, err)
}

func TestSync(t *testing.T) {
	t.Parallel()

	type Node struct {
		*mttnet.Node

		Syncer *Service
	}

	newNode := func(name string) Node {
		var n Node

		peer, stop := makeTestPeer(t, name)
		t.Cleanup(stop)
		n.Node = peer

		n.Syncer = NewService(must.Do2(zap.NewDevelopment()).Named(name), peer.ID(), peer.VCS(), peer.Bitswap(), peer.Client, false)

		return n
	}

	alice := newNode("alice")
	bob := newNode("bob")
	ctx := context.Background()

	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()))

	var alicePerma vcs.EncodedPermanode
	var aliceChange vcs.VerifiedChange
	{
		conn, release, err := alice.VCS().Conn(ctx)
		require.NoError(t, err)

		err = conn.WithTx(true, func() error {
			clock := hlc.NewClock()
			perma, err := vcs.EncodePermanode(sqlitevcs.NewDocumentPermanode(alice.ID().AccountID(), clock.Now()))
			alicePerma = perma
			require.NoError(t, err)

			conn.NewObject(perma)

			vc, err := vcs.NewChange(alice.ID(), alicePerma.ID, nil, sqlitevcs.KindOpaque, clock.Now(), []byte("opaque content")).Block()
			if err != nil {
				return err
			}

			aliceChange = vc

			conn.StoreChange(vc)

			return nil
		})
		release()
		require.NoError(t, err)
	}

	res, err := bob.Syncer.Sync(ctx)
	require.NoError(t, err)
	require.Equalf(t, int64(0), res.NumSyncFailed, "unexpected number of sync failures: %v", res.Errs)
	require.Equal(t, int64(1), res.NumSyncOK, "unexpected number of successful syncs")

	{
		conn, release, err := bob.VCS().Conn(ctx)
		require.NoError(t, err)

		err = conn.WithTx(false, func() error {
			blk, err := conn.GetBlock(ctx, alicePerma.ID)
			if err != nil {
				return err
			}
			require.Equal(t, alicePerma.Data, blk.RawData(), "bob must sync alice's permanode intact")

			blk, err = conn.GetBlock(ctx, aliceChange.Cid())
			if err != nil {
				return err
			}
			require.Equal(t, aliceChange.RawData(), blk.RawData(), "bob must sync alice's change intact")
			return nil
		})
		release()
		require.NoError(t, err)
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

func makeTestPeer(t *testing.T, name string) (*mttnet.Node, context.CancelFunc) {
	u := coretest.NewTester(name)

	db := makeTestSQLite(t)

	hvcs := sqlitevcs.New(db)

	conn, release, err := hvcs.Conn(context.Background())
	require.NoError(t, err)
	reg, err := sqlitevcs.Register(context.Background(), u.Account, u.Device, conn)
	release()
	require.NoError(t, err)

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.NoRelay = true
	cfg.BootstrapPeers = nil
	cfg.NoMetrics = true
	n, err := mttnet.New(cfg, hvcs, reg, u.Identity, must.Do2(zap.NewDevelopment()).Named(name))
	require.NoError(t, err)

	errc := make(chan error, 1)
	ctx, cancel := context.WithCancel(context.Background())
	f := future.New[*mttnet.Node]()
	_ = mttnet.NewServer(ctx, config.Default().Site, f.ReadOnly, nil, nil)
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

func makeTestSQLite(t *testing.T) *sqlitex.Pool {
	path := testutil.MakeRepoPath(t)

	pool, err := sqliteschema.Open(filepath.Join(path, "db.sqlite"), 0, 16)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, pool.Close())
	})

	conn := pool.Get(context.Background())
	defer pool.Put(conn)

	require.NoError(t, sqliteschema.Migrate(conn))

	return pool
}
