package syncing

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core/coretest"
	"mintter/backend/db/sqliteschema"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/must"
	"mintter/backend/testutil"
	"mintter/backend/vcs"
	"mintter/backend/vcs/mttacc"
	"mintter/backend/vcs/mttdoc"
	"mintter/backend/vcs/vcsdb"
	"path/filepath"
	"testing"
	"time"

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
		{In: mttdoc.NewDocumentPermanode(alice.AccountID)},
		{In: mttacc.NewAccountPermanode(alice.AccountID)},
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

		n.Syncer = NewService(must.Do2(zap.NewDevelopment()).Named(name), peer.ID(), peer.VCS(), peer.Bitswap().NewSession, peer.Client)

		return n
	}

	alice := newNode("alice")
	bob := newNode("bob")
	ctx := context.Background()

	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()))

	var alicePerma vcsdb.EncodedPermanode
	var wantDatoms []vcsdb.Datom
	{
		conn, release, err := alice.VCS().Conn(ctx)
		require.NoError(t, err)

		err = conn.WithTx(true, func() error {
			perma, err := vcsdb.NewPermanode(mttdoc.NewDocumentPermanode(alice.ID().AccountID()))
			alicePerma = perma
			require.NoError(t, err)
			obj := conn.NewObject(perma)
			idLocal := conn.EnsureIdentity(alice.ID())
			change := conn.NewChange(obj, idLocal, nil, time.Time{})
			newDatom := vcsdb.MakeDatomFactory(change, 1, 0)

			wantDatoms = []vcsdb.Datom{
				newDatom(vcsdb.RootNode, "title", "This is a title"),
			}

			for _, d := range wantDatoms {
				conn.AddDatom(obj, d)
			}

			conn.SaveVersion(obj, "main", idLocal, vcsdb.LocalVersion{change})
			conn.EncodeChange(change, alice.ID().DeviceKey())

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
			obj := conn.LookupPermanode(alicePerma.ID)
			idLocal := conn.LookupIdentity(bob.ID())
			version := conn.GetVersion(obj, "main", idLocal)

			var i int
			it := conn.QueryObjectDatoms(obj, version)
			for it.Next() {
				i++
			}
			require.Equal(t, len(wantDatoms), i, "must get the same number of datoms as in the original object")

			return nil
		})
		release()
		require.NoError(t, err)
	}
}

func makeTestPeer(t *testing.T, name string) (*mttnet.Node, context.CancelFunc) {
	u := coretest.NewTester(name)

	db := makeTestSQLite(t)

	hvcs := vcsdb.New(db)

	conn, release, err := hvcs.Conn(context.Background())
	require.NoError(t, err)
	reg, err := mttacc.Register(context.Background(), u.Account, u.Device, conn)
	release()
	require.NoError(t, err)

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.NoRelay = true
	cfg.NoBootstrap = true
	cfg.NoMetrics = true

	n, err := mttnet.New(cfg, hvcs, reg, u.Identity, must.Do2(zap.NewDevelopment()).Named(name))
	require.NoError(t, err)

	errc := make(chan error, 1)
	ctx, cancel := context.WithCancel(context.Background())
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
