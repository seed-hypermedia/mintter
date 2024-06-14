package relay

import (
	"context"
	"net"
	"seed/backend/core/coretest"
	"seed/backend/pkg/libp2px"
	"seed/backend/pkg/must"
	"testing"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	"github.com/multiformats/go-multiaddr"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestRelay(t *testing.T) {
	// Create the relay
	alice := coretest.NewTester("alice")
	log, err := zap.NewDevelopment(zap.WithCaller(false))
	require.NoError(t, err)

	cfg := defaultConfig()
	cfg.Port = freePort(t)
	cfg.PrivKey = must.Do2(newPrivKeyString(alice.Device.Wrapped()))
	relayNode, err := NewRelay(log, cfg)
	require.NoError(t, err)

	require.NoError(t, relayNode.Start())
	defer func() {
		require.NoError(t, relayNode.Stop())
	}()

	relayInfo := libp2px.AddrInfo(relayNode.Host())

	bob := libp2px.Host{Host: makePrivateHost(t, relayInfo, "bob")}
	carol := libp2px.Host{Host: makePrivateHost(t, relayInfo, "carol")}

	var (
		bobInRelay   bool
		carolInRelay bool
	)
	require.Eventually(t, func() bool {
		if !bobInRelay {
			bobInRelay = len(relayNode.host.Peerstore().Addrs(bob.ID())) > 0
		}
		if !carolInRelay {
			carolInRelay = len(relayNode.host.Peerstore().Addrs(carol.ID())) > 0
		}
		return bobInRelay && carolInRelay
	}, time.Minute, 100*time.Millisecond, "bob and carol must automatically connect to the static relay")

	require.Len(t, bob.Peerstore().Addrs(carol.ID()), 0, "bob must not know carol")
	require.Len(t, carol.Peerstore().Addrs(bob.ID()), 0, "carol must not know bob")

	// Because our relay node doesn't have any public addresses (because it's running locally),
	// carol and bob would never encapsulate their addresses with the relayed address (this is how autorelay works),
	// so instead of waiting until they report their relayed addresses,
	// we just manually encapsulate them into the relayed connection.
	require.NoError(t, bob.Connect(context.Background(), peer.AddrInfo{
		ID: carol.ID(),
		Addrs: []multiaddr.Multiaddr{
			must.Do2(multiaddr.NewMultiaddr("/p2p/" + relayNode.host.ID().String() + "/p2p-circuit/p2p/" + carol.ID().String())),
		},
	}), "bob must connect to carol via the relay")
}

func makePrivateHost(t *testing.T, relayInfo peer.AddrInfo, name string) host.Host {
	tester := coretest.NewTester(name)

	host, err := libp2p.New(
		libp2p.UserAgent("seed/testing/"+name),
		libp2p.Identity(tester.Device.Wrapped()),
		libp2p.ListenAddrStrings(libp2px.DefaultListenAddrs(freePort(t))...),
		libp2p.EnableHolePunching(),
		libp2p.EnableRelay(),
		libp2p.ForceReachabilityPrivate(),
		libp2p.EnableAutoRelayWithStaticRelays(
			[]peer.AddrInfo{relayInfo},
			// Options useful for testing to make tests run faster.
			autorelay.WithBackoff(0),
			autorelay.WithBootDelay(0),
			autorelay.WithMinCandidates(1),
			autorelay.WithNumRelays(1),
		),
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, host.Close())
	})

	return host
}

func freePort(t *testing.T) int {
	addr, err := net.ResolveTCPAddr("tcp", "localhost:0")
	require.NoError(t, err)

	l, err := net.ListenTCP("tcp", addr)
	require.NoError(t, err)
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}
