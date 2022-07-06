package autorelay_test

import (
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	relayv1 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv1/relay"
	circuitv2_proto "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/proto"
	relayv2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/network"
	"github.com/libp2p/go-libp2p-core/peer"

	ma "github.com/multiformats/go-multiaddr"
	"github.com/stretchr/testify/require"
)

func isRelayAddr(a ma.Multiaddr) (isRelay bool) {
	ma.ForEach(a, func(c ma.Component) bool {
		switch c.Protocol().Code {
		case ma.P_CIRCUIT:
			isRelay = true
			return false
		default:
			return true
		}
	})
	return isRelay
}

func newPrivateNode(t *testing.T, opts ...autorelay.Option) host.Host {
	t.Helper()
	h, err := libp2p.New(
		libp2p.ForceReachabilityPrivate(),
		libp2p.EnableAutoRelay(opts...),
	)
	require.NoError(t, err)
	return h
}

func newRelay(t *testing.T) host.Host {
	t.Helper()
	h, err := libp2p.New(
		libp2p.DisableRelay(),
		libp2p.EnableRelayService(),
		libp2p.ForceReachabilityPublic(),
		libp2p.AddrsFactory(func(addrs []ma.Multiaddr) []ma.Multiaddr {
			for i, addr := range addrs {
				saddr := addr.String()
				if strings.HasPrefix(saddr, "/ip4/127.0.0.1/") {
					addrNoIP := strings.TrimPrefix(saddr, "/ip4/127.0.0.1")
					addrs[i] = ma.StringCast("/dns4/localhost" + addrNoIP)
				}
			}
			return addrs
		}),
	)
	require.NoError(t, err)
	return h
}

func newRelayV1(t *testing.T) host.Host {
	t.Helper()
	h, err := libp2p.New(
		libp2p.DisableRelay(),
		libp2p.ForceReachabilityPublic(),
		libp2p.AddrsFactory(func(addrs []ma.Multiaddr) []ma.Multiaddr {
			for i, addr := range addrs {
				saddr := addr.String()
				if strings.HasPrefix(saddr, "/ip4/127.0.0.1/") {
					addrNoIP := strings.TrimPrefix(saddr, "/ip4/127.0.0.1")
					addrs[i] = ma.StringCast("/dns4/localhost" + addrNoIP)
				}
			}
			return addrs
		}),
	)
	require.NoError(t, err)
	r, err := relayv1.NewRelay(h)
	require.NoError(t, err)
	t.Cleanup(func() { r.Close() })
	return h
}

// creates a node that speaks the relay v2 protocol, but doesn't accept any reservations for the first workAfter tries
func newBrokenRelay(t *testing.T, workAfter int) host.Host {
	t.Helper()
	h, err := libp2p.New(
		libp2p.DisableRelay(),
		libp2p.AddrsFactory(func(addrs []ma.Multiaddr) []ma.Multiaddr {
			for i, addr := range addrs {
				saddr := addr.String()
				if strings.HasPrefix(saddr, "/ip4/127.0.0.1/") {
					addrNoIP := strings.TrimPrefix(saddr, "/ip4/127.0.0.1")
					addrs[i] = ma.StringCast("/dns4/localhost" + addrNoIP)
				}
			}
			return addrs
		}),
		libp2p.EnableRelayService(),
	)
	require.NoError(t, err)
	var n int32
	h.SetStreamHandler(circuitv2_proto.ProtoIDv2Hop, func(str network.Stream) {
		str.Reset()
		num := atomic.AddInt32(&n, 1)
		if int(num) >= workAfter {
			h.RemoveStreamHandler(circuitv2_proto.ProtoIDv2Hop)
			r, err := relayv2.New(h)
			require.NoError(t, err)
			t.Cleanup(func() { r.Close() })
		}
	})
	return h
}

func TestSingleRelay(t *testing.T) {
	const numPeers = 5
	peerChan := make(chan peer.AddrInfo)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for i := 0; i < numPeers; i++ {
			r := newRelay(t)
			t.Cleanup(func() { r.Close() })
			peerChan <- peer.AddrInfo{ID: r.ID(), Addrs: r.Addrs()}
		}
	}()
	h := newPrivateNode(t,
		autorelay.WithPeerSource(peerChan),
		autorelay.WithMaxCandidates(1),
		autorelay.WithNumRelays(99999),
		autorelay.WithBootDelay(0),
	)
	defer h.Close()

	require.Eventually(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
	}, 3*time.Second, 100*time.Millisecond)
	<-done
	// test that we don't add any more relays
	require.Never(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) != 1
	}, 200*time.Millisecond, 50*time.Millisecond)
}

func TestPreferRelayV2(t *testing.T) {
	r := newRelay(t)
	defer r.Close()
	// The relay supports both v1 and v2. The v1 stream handler should never be called,
	// if we prefer v2 relays.
	r.SetStreamHandler(relayv1.ProtoID, func(str network.Stream) {
		str.Reset()
		t.Fatal("used relay v1")
	})
	peerChan := make(chan peer.AddrInfo, 1)
	peerChan <- peer.AddrInfo{ID: r.ID(), Addrs: r.Addrs()}
	h := newPrivateNode(t,
		autorelay.WithPeerSource(peerChan),
		autorelay.WithMaxCandidates(1),
		autorelay.WithNumRelays(99999),
		autorelay.WithBootDelay(0),
	)
	defer h.Close()

	require.Eventually(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
	}, 3*time.Second, 100*time.Millisecond)
}

func TestWaitForCandidates(t *testing.T) {
	peerChan := make(chan peer.AddrInfo)
	h := newPrivateNode(t,
		autorelay.WithPeerSource(peerChan),
		autorelay.WithMinCandidates(2),
		autorelay.WithNumRelays(1),
		autorelay.WithBootDelay(time.Hour),
	)
	defer h.Close()

	r1 := newRelay(t)
	t.Cleanup(func() { r1.Close() })
	peerChan <- peer.AddrInfo{ID: r1.ID(), Addrs: r1.Addrs()}

	// make sure we don't add any relays yet
	// We need to wait until we have at least 2 candidates before we connect.
	require.Never(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
	}, 200*time.Millisecond, 50*time.Millisecond)

	r2 := newRelay(t)
	t.Cleanup(func() { r2.Close() })
	peerChan <- peer.AddrInfo{ID: r2.ID(), Addrs: r2.Addrs()}
	require.Eventually(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
	}, 3*time.Second, 100*time.Millisecond)
}

func TestBackoff(t *testing.T) {
	const backoff = 500 * time.Millisecond
	peerChan := make(chan peer.AddrInfo)
	h := newPrivateNode(t,
		autorelay.WithPeerSource(peerChan),
		autorelay.WithNumRelays(1),
		autorelay.WithBootDelay(0),
		autorelay.WithBackoff(backoff),
	)
	defer h.Close()

	r1 := newBrokenRelay(t, 1)
	t.Cleanup(func() { r1.Close() })
	peerChan <- peer.AddrInfo{ID: r1.ID(), Addrs: r1.Addrs()}

	// make sure we don't add any relays yet
	require.Never(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
	}, backoff*2/3, 50*time.Millisecond)

	require.Eventually(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
	}, 2*backoff, 50*time.Millisecond)
}

func TestMaxBackoffs(t *testing.T) {
	peerChan := make(chan peer.AddrInfo)
	h := newPrivateNode(t,
		autorelay.WithPeerSource(peerChan),
		autorelay.WithNumRelays(1),
		autorelay.WithBootDelay(0),
		autorelay.WithBackoff(25*time.Millisecond),
		autorelay.WithMaxAttempts(3),
	)
	defer h.Close()

	r := newBrokenRelay(t, 4)
	t.Cleanup(func() { r.Close() })
	peerChan <- peer.AddrInfo{ID: r.ID(), Addrs: r.Addrs()}

	// make sure we don't add any relays yet
	require.Never(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
	}, 300*time.Millisecond, 50*time.Millisecond)
}

func TestStaticRelays(t *testing.T) {
	const numRelays = 3
	var staticRelays []peer.AddrInfo
	for i := 0; i < numRelays; i++ {
		r := newRelay(t)
		t.Cleanup(func() { r.Close() })
		staticRelays = append(staticRelays, peer.AddrInfo{ID: r.ID(), Addrs: r.Addrs()})
	}

	h := newPrivateNode(t,
		autorelay.WithStaticRelays(staticRelays),
		autorelay.WithNumRelays(1),
	)
	defer h.Close()

	require.Eventually(t, func() bool {
		return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
	}, 2*time.Second, 50*time.Millisecond)
}

func TestRelayV1(t *testing.T) {
	t.Run("relay v1 support disabled", func(t *testing.T) {
		peerChan := make(chan peer.AddrInfo)
		go func() {
			r := newRelayV1(t)
			peerChan <- peer.AddrInfo{ID: r.ID(), Addrs: r.Addrs()}
			t.Cleanup(func() { r.Close() })
		}()
		h := newPrivateNode(t,
			autorelay.WithPeerSource(peerChan),
			autorelay.WithBootDelay(0),
		)
		defer h.Close()

		require.Never(t, func() bool {
			return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
		}, 3*time.Second, 100*time.Millisecond)
	})

	t.Run("relay v1 support enabled", func(t *testing.T) {
		peerChan := make(chan peer.AddrInfo)
		go func() {
			r := newRelayV1(t)
			peerChan <- peer.AddrInfo{ID: r.ID(), Addrs: r.Addrs()}
			t.Cleanup(func() { r.Close() })
		}()
		h := newPrivateNode(t,
			autorelay.WithPeerSource(peerChan),
			autorelay.WithBootDelay(0),
			autorelay.WithCircuitV1Support(),
		)
		defer h.Close()

		require.Eventually(t, func() bool {
			return len(ma.FilterAddrs(h.Addrs(), isRelayAddr)) > 0
		}, 3*time.Second, 100*time.Millisecond)
	})
}
