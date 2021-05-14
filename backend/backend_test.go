package backend

import (
	"context"
	"testing"

	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"

	"mintter/backend/badgergraph"
	"mintter/backend/ipfsutil"
	"mintter/backend/testutil"
)

func makeTestBackend(t *testing.T, name string, ready bool) *backend {
	t.Helper()

	tester := makeTester(t, name)
	repo := makeTestRepo(t, tester)

	ds := testutil.MakeDatastore(t)
	bs := blockstore.NewBlockstore(ds)

	db, err := badgergraph.NewDB(testutil.MakeBadgerV3(t), "!mtttest")
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, db.Close())
	})

	patchStore, err := newPatchStore(bs, db)
	require.NoError(t, err)
	srv := newBackend(repo, patchStore, nil)

	if ready {
		require.NoError(t, repo.CommitAccount(tester.Account))
		acc, err := repo.Account()
		require.NoError(t, err)

		require.NoError(t, srv.register(context.Background(), newState(cid.Cid(acc.id), nil), tester.Binding))
	}

	return srv
}

type Tester struct {
	Account Account
	Device  Device
	Binding AccountBinding
}

func makeTester(t *testing.T, name string) Tester {
	t.Helper()

	prof := testutil.MakeProfile(t, name)

	pubBytes, err := prof.Account.PubKey.Raw()
	require.NoError(t, err)

	aid, err := ipfsutil.NewCID(codecAccountID, multihash.IDENTITY, pubBytes)
	require.NoError(t, err)

	tt := Tester{
		Account: Account{
			id:   AccountID(aid),
			priv: prof.Account.PrivKey.PrivKey,
			pub:  prof.Account.PubKey.PubKey,
		},
		Device: Device{
			id:   DeviceID(peer.ToCid(prof.Peer.ID)),
			priv: prof.Peer.PrivKey.PrivKey,
			pub:  prof.Peer.PubKey.PubKey,
		},
	}

	binding, err := InviteDevice(tt.Account, tt.Device)
	require.NoError(t, err)

	tt.Binding = binding

	return tt
}
