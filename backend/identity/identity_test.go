package identity_test

import (
	"encoding/json"
	"strconv"
	"strings"
	"testing"

	"mintter/backend/identity"

	"github.com/stretchr/testify/require"
)

func TestFromSeed(t *testing.T) {
	cases := []struct {
		Idx uint32

		WantPeerID      string
		WantPeerPubKey  string
		WantPeerPrivKey string

		WantAccountID      string
		WantAccountPubKey  string
		WantAccountPrivKey string
	}{
		{
			Idx:             0,
			WantPeerPubKey:  "CAESILp1y6IeWNyxGoYasA6MLaKG+FUuZWFntS3o7Ftn55SF",
			WantPeerPrivKey: "CAESQI4RbZ/+v4si0zudLvPDn8GU9zaJDg2rnvz4i9bOofvMunXLoh5Y3LEahhqwDowtoob4VS5lYWe1LejsW2fnlIU=",
			WantPeerID:      "12D3KooWNNEBN2SZGDRpQUAG4b4uJyxWjsDBqYaetkKu8SzudpHA",

			WantAccountID:      "12D3KooWCX9pUgP2CsGYJ8xnYv97XUoh6zq1M6dtgRTCUXcH1hN6",
			WantAccountPubKey:  "CAESICgqOTalyIG2/CoQS4aOZQYVIOXRh3O6WQuaa5CIP2ZH",
			WantAccountPrivKey: "CAESQGs2pC5kJZwjzx7DO3TS/mfCpjJi2kIGcSqz+EZjZZfhKCo5NqXIgbb8KhBLho5lBhUg5dGHc7pZC5prkIg/Zkc=",
		},
		{
			Idx:             1,
			WantPeerPubKey:  "CAESIL8mHHKD75RGGH65xsEzBkRdgYzgdQdAKMYzW49j8vA3",
			WantPeerPrivKey: "CAESQKV8n/xVCBlORwB2Kq4ZBqo001EBnzk0ke+NjG8UGz05vyYccoPvlEYYfrnGwTMGRF2BjOB1B0AoxjNbj2Py8Dc=",
			WantPeerID:      "12D3KooWNgXk9bpXMFUaWAwoBYFeAKXD2Scb6f88m4Y5tcpkXsvn",

			// Same account data as in first case.
			WantAccountID:      "12D3KooWCX9pUgP2CsGYJ8xnYv97XUoh6zq1M6dtgRTCUXcH1hN6",
			WantAccountPubKey:  "CAESICgqOTalyIG2/CoQS4aOZQYVIOXRh3O6WQuaa5CIP2ZH",
			WantAccountPrivKey: "CAESQGs2pC5kJZwjzx7DO3TS/mfCpjJi2kIGcSqz+EZjZZfhKCo5NqXIgbb8KhBLho5lBhUg5dGHc7pZC5prkIg/Zkc=",
		},
	}

	for _, c := range cases {
		t.Run(strconv.Itoa(int(c.Idx)), func(t *testing.T) {
			prof := testProfile(t, c.Idx)

			{
				pubkey, err := prof.Peer.PubKey.MarshalJSON()
				require.NoError(t, err)

				privkey, err := prof.Peer.PrivKey.MarshalJSON()
				require.NoError(t, err)

				require.Equal(t, c.WantPeerID, prof.Peer.ID.String())
				require.Equal(t, c.WantPeerPubKey, strings.Trim(string(pubkey), "\""))
				require.Equal(t, c.WantPeerPrivKey, strings.Trim(string(privkey), "\""))
			}
			{
				pubkey, err := prof.Account.PubKey.MarshalJSON()
				require.NoError(t, err)

				privkey, err := prof.Account.PrivKey.MarshalJSON()
				require.NoError(t, err)

				require.Equal(t, c.WantAccountID, prof.Account.ID.String())
				require.Equal(t, c.WantAccountPubKey, strings.Trim(string(pubkey), "\""))
				require.Equal(t, c.WantAccountPrivKey, strings.Trim(string(privkey), "\""))
			}

		})
	}
}

func TestJSONEncoding(t *testing.T) {
	prof := testProfile(t, 0)

	data, err := json.Marshal(prof)
	require.NoError(t, err)

	var readProf identity.Profile
	err = json.Unmarshal(data, &readProf)
	require.NoError(t, err)

	require.Equal(t, prof, readProf)
}

func TestMerge(t *testing.T) {
	orig := testProfile(t, 0)

	{
		merged := orig
		require.NoError(t, merged.Merge(identity.Profile{}))
		require.Equal(t, orig, merged)
	}
	{
		merged := identity.Profile{}
		expected := orig
		incoming := orig
		require.NoError(t, merged.Merge(incoming))
		require.Equal(t, expected, merged)
	}
	{
		merged := orig
		a := identity.About{Username: "foo", Email: "foo@example.com", Bio: "Fake bio."}
		expected := orig
		expected.About = a
		require.NoError(t, merged.Merge(identity.Profile{About: a}))
		require.Equal(t, expected, merged)
	}
	{
		merged := orig
		a := identity.About{Username: "foo", Email: "foo@example.com", Bio: "Fake bio."}
		expected := orig
		expected.About = a
		incoming := orig
		incoming.About = a
		incoming.Peer.ID = "foobar"
		require.NoError(t, merged.Merge(incoming))
		require.Equal(t, expected, merged)
	}
	{
		merged := orig
		a := identity.About{Username: "foo", Email: "foo@example.com", Bio: "Fake bio."}
		expected := orig
		expected.About = a
		incoming := orig
		incoming.About = a
		incoming.Account.ID = "foobar"
		require.NoError(t, merged.Merge(incoming))
		require.Equal(t, expected, merged)
	}
}

func TestAboutDiff(t *testing.T) {
	cases := []struct {
		Old      identity.About
		New      identity.About
		Want     identity.About
		WantNone bool
	}{
		{
			Old:      identity.About{},
			New:      identity.About{},
			WantNone: true,
		},
		{
			Old:  identity.About{Username: "foo"},
			New:  identity.About{Bio: "fake-bio"},
			Want: identity.About{Bio: "fake-bio"},
		},
		{
			Old:  identity.About{Username: "foo", Bio: "fake-bio"},
			New:  identity.About{Username: "foo2"},
			Want: identity.About{Username: "foo2"},
		},
		{
			Old:      identity.About{Username: "foo", Bio: "fake-bio"},
			New:      identity.About{Username: "foo"},
			WantNone: true,
		},
		{
			Old:  identity.About{Username: "foo", Bio: "fake-bio"},
			New:  identity.About{Bio: "fake-bio-2"},
			Want: identity.About{Bio: "fake-bio-2"},
		},
		{
			Old:  identity.About{},
			New:  identity.About{Username: "foo", Bio: "fake-bio"},
			Want: identity.About{Username: "foo", Bio: "fake-bio"},
		},
	}

	for i, c := range cases {
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			diff, ok := c.Old.Diff(c.New)
			require.NotEqual(t, c.WantNone, ok)
			require.Equal(t, c.Want, diff)
		})
	}
}

func testProfile(t *testing.T, idx uint32) identity.Profile {
	t.Helper()

	seed := []byte{41, 32, 223, 130, 129, 34, 30, 227, 125, 39, 207, 223, 119, 5, 116, 159}

	prof, err := identity.FromSeed(seed, idx)
	require.NoError(t, err)

	return prof
}
