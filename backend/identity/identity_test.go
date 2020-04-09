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
		Idx         uint32
		WantPubKey  string
		WantPrivKey string
		WantPeerID  string
	}{
		{
			Idx:         0,
			WantPubKey:  "CAESIPPoxrTSxCGBdNZ0PxE5H9ZsGhzMq9vmSXpr5aseVEUj",
			WantPrivKey: "CAESQDjb4g9GJyaXgqI9ppiRSdHXt2Un07HutP3FqfrbD87e8+jGtNLEIYF01nQ/ETkf1mwaHMyr2+ZJemvlqx5URSM=",
			WantPeerID:  "12D3KooWSEV7CwbRHgq3QnVVYCnrtTHJ76GePELvi25CsJKF3K9U",
		},
		{
			Idx:         1,
			WantPubKey:  "CAESIMvm/ZhQtQmVLcA4sQsy19+4nVc5tIbrAqX4eDpAIYOs",
			WantPrivKey: "CAESQOcUc5jCzyTqSNI3s8ogihxRCcms1hVH/10X+yEAWr1Wy+b9mFC1CZUtwDixCzLX37idVzm0husCpfh4OkAhg6w=",
			WantPeerID:  "12D3KooWPYKDkkSYAvxYCYSic7WJjHSm79MK591pjxpF7crqKMS3",
		},
	}

	for _, c := range cases {
		t.Run(strconv.Itoa(int(c.Idx)), func(t *testing.T) {
			prof := testProfile(t, c.Idx)
			require.Equal(t, c.WantPeerID, prof.PeerID.String())

			pubkey, err := prof.PubKey.MarshalJSON()
			require.NoError(t, err)
			require.Equal(t, c.WantPubKey, strings.Trim(string(pubkey), "\""))

			privkey, err := prof.PrivKey.MarshalJSON()
			require.NoError(t, err)
			require.Equal(t, c.WantPrivKey, strings.Trim(string(privkey), "\""))
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

func testProfile(t *testing.T, idx uint32) identity.Profile {
	t.Helper()

	seed := []byte{41, 32, 223, 130, 129, 34, 30, 227, 125, 39, 207, 223, 119, 5, 116, 159}

	prof, err := identity.FromSeed(seed, idx)
	require.NoError(t, err)

	return prof
}
