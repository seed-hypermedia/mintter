package swarm_test

import (
	"context"
	"testing"

	swarmt "github.com/libp2p/go-libp2p/p2p/net/swarm/testing"

	"github.com/libp2p/go-libp2p-core/peerstore"
	"github.com/libp2p/go-libp2p-core/test"

	ma "github.com/multiformats/go-multiaddr"
	"github.com/stretchr/testify/require"
)

func TestDialBadAddrs(t *testing.T) {
	m := func(s string) ma.Multiaddr {
		maddr, err := ma.NewMultiaddr(s)
		if err != nil {
			t.Fatal(err)
		}
		return maddr
	}

	s := makeSwarms(t, 1)[0]

	test := func(a ma.Multiaddr) {
		p := test.RandPeerIDFatal(t)
		s.Peerstore().AddAddr(p, a, peerstore.PermanentAddrTTL)
		if _, err := s.DialPeer(context.Background(), p); err == nil {
			t.Errorf("swarm should not dial: %s", p)
		}
	}

	test(m("/ip6/fe80::1"))                // link local
	test(m("/ip6/fe80::100"))              // link local
	test(m("/ip4/127.0.0.1/udp/1234/utp")) // utp
}

func TestAddrRace(t *testing.T) {
	s := makeSwarms(t, 1)[0]
	defer s.Close()

	a1, err := s.InterfaceListenAddresses()
	require.NoError(t, err)
	a2, err := s.InterfaceListenAddresses()
	require.NoError(t, err)

	if len(a1) > 0 && len(a2) > 0 && &a1[0] == &a2[0] {
		t.Fatal("got the exact same address set twice; this could lead to data races")
	}
}

func TestAddressesWithoutListening(t *testing.T) {
	s := swarmt.GenSwarm(t, swarmt.OptDialOnly)
	a1, err := s.InterfaceListenAddresses()
	require.NoError(t, err)
	require.Empty(t, a1, "expected to be listening on no addresses")
}
