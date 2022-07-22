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
	"mintter/backend/vcs/vcstypes"
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
		{In: vcstypes.NewDocumentPermanode(alice.AccountID)},
		{In: vcstypes.NewAccountPermanode(alice.AccountID)},
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

		n.Syncer = NewService(must.Two(zap.NewDevelopment()).Named(name), peer.ID(), peer.VCS().DB(), peer.VCS(), peer.Bitswap().NewSession, peer.Client)

		return n
	}

	alice := newNode("alice")
	bob := newNode("bob")
	ctx := context.Background()

	require.NoError(t, alice.Connect(ctx, bob.AddrInfo()))

	doc, err := alice.Repo().CreateDocument(ctx)
	require.NoError(t, err)

	doc.ChangeTitle("Hello world")
	require.NoError(t, doc.MoveBlock("b1", "", ""))
	require.NoError(t, doc.ReplaceBlock(vcstypes.Block{
		ID:   "b1",
		Text: "Hello world",
	}))

	_, err = alice.Repo().CommitPublication(ctx, doc, vcs.Version{})
	require.NoError(t, err)

	res, err := bob.Syncer.Sync(ctx)
	require.NoError(t, err)
	require.Equal(t, int64(0), res.NumSyncFailed)
	require.Equal(t, int64(1), res.NumSyncOK)

	bobdoc, err := bob.Repo().LoadPublication(ctx, doc.State().ID, vcs.Version{})
	require.NoError(t, err)

	require.Equal(t, doc.State(), bobdoc.State())

	bobalice, err := bob.Repo().LoadAccount(ctx, alice.ID().AccountID(), vcs.Version{})
	require.NoError(t, err)
	require.NotNil(t, bobalice)
}

func makeTestPeer(t *testing.T, name string) (*mttnet.Node, context.CancelFunc) {
	u := coretest.NewTester(name)

	db := makeTestSQLite(t)

	hvcs := vcs.New(db)

	reg, err := vcstypes.Register(context.Background(), u.Account, u.Device, hvcs)
	require.NoError(t, err)

	cfg := config.Default().P2P
	cfg.Port = 0
	cfg.ReportPrivateAddrs = true
	cfg.NoRelay = true
	cfg.NoBootstrap = true
	cfg.NoMetrics = true

	n, err := mttnet.New(cfg, hvcs, reg, u.Identity, must.Two(zap.NewDevelopment()).Named(name))
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
