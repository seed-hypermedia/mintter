package backend

import (
	"errors"
	"io/ioutil"
	"mintter/backend/ipfsutil"
	"mintter/backend/testutil"
	"os"
	"path/filepath"
	"testing"

	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestMigrateRepo_OldLayout(t *testing.T) {
	dir := testutil.MakeRepoPath(t)

	require.NoError(t, ioutil.WriteFile(filepath.Join(dir, "profile.json"), []byte("{}"), 0666))

	_, err := newRepo(dir, zap.NewNop())

	require.Error(t, err)
	require.True(t, errors.Is(err, errRepoMigrate))
}

func TestMigrateRepo_WrongVersion(t *testing.T) {
	dir := testutil.MakeRepoPath(t)

	require.NoError(t, ioutil.WriteFile(filepath.Join(dir, "VERSION"), []byte("fake-version"), 0666))

	_, err := newRepo(dir, zap.NewNop())

	require.Error(t, err)
	require.True(t, errors.Is(err, errRepoMigrate))
}

func makeTestRepo(t *testing.T, tt Tester) *repo {
	t.Helper()

	dir := testutil.MakeRepoPath(t)

	log, err := zap.NewDevelopment(zap.WithCaller(false))
	require.NoError(t, err)

	repo, err := newRepoWithDeviceKey(dir, log, tt.Device.priv)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, os.RemoveAll(dir))
		log.Sync()
	})

	return repo
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
