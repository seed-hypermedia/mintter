package main

import (
	"context"
	"testing"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/config"
	"github.com/libp2p/go-libp2p/core/host"
	peerstore "github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	"github.com/libp2p/go-libp2p/p2p/protocol/ping"
	multiaddr "github.com/multiformats/go-multiaddr"
	"github.com/stretchr/testify/require"
)

func TestPing(t *testing.T) {
	opts := []libp2p.Option{
		libp2p.ListenAddrStrings("/ip4/127.0.0.1/tcp/0"),
		libp2p.Ping(false),
	}
	listener, _, err := initNode(opts)
	require.NoError(t, err)
	defer listener.Close()
	listenerInfo := peerstore.AddrInfo{
		ID:    listener.ID(),
		Addrs: listener.Addrs(),
	}

	caller, pingService, err := initNode(opts)
	require.NoError(t, err)
	defer caller.Close()

	require.NoError(t, caller.Connect(context.Background(), listenerInfo))
	ch := pingService.Ping(context.Background(), listenerInfo.ID)
	for i := 0; i < 5; i++ {
		res := <-ch
		require.Less(t, res.RTT, time.Millisecond*5)
	}
}

func TestRelayPing(t *testing.T) {
	t.Skip("Depends on external infra")
	relay, err := staticRelay()
	require.NoError(t, err)
	const bootDelay = 3
	opts := []libp2p.Option{
		libp2p.EnableHolePunching(),
		libp2p.EnableAutoRelay(autorelay.WithStaticRelays(relay),
			autorelay.WithBootDelay(time.Second*bootDelay),
			autorelay.WithNumRelays(1)), // only one active relay at a time. If it fails, then connect to the other
		libp2p.ForceReachabilityPrivate(),
		libp2p.EnableRelay(),      // Be able to dial behind-relay peers and receive connections from them.
		libp2p.EnableNATService(), // Dial other peers on-demand to let them know if they are reachable.
		libp2p.ListenAddrStrings("/ip4/127.0.0.1/tcp/0"),
		libp2p.Ping(false),
	}
	listener, _, err := initNode(opts)
	require.NoError(t, err)
	defer listener.Close()
	require.Eventually(t, func() bool { return len(listener.Addrs()) == 2 }, time.Second*bootDelay*3, time.Second*bootDelay)
	require.Contains(t, listener.Addrs()[1].String(), "p2p-circuit")

	listenerInfo := peerstore.AddrInfo{
		ID:    listener.ID(),
		Addrs: []multiaddr.Multiaddr{listener.Addrs()[1]},
	}

	caller, pingService, err := initNode(opts)
	require.NoError(t, err)
	defer caller.Close()

	require.NoError(t, caller.Connect(context.Background(), listenerInfo))
	ch := pingService.Ping(context.Background(), listenerInfo.ID)
	for i := 0; i < 5; i++ {
		res := <-ch
		require.Less(t, res.RTT, time.Millisecond*500)
	}
}

func initNode(opts []config.Option) (host.Host, *ping.PingService, error) {
	node, err := libp2p.New(opts...)
	if err != nil {
		return nil, nil, err
	}

	// configure our own ping protocol
	pingService := &ping.PingService{Host: node}
	node.SetStreamHandler(ping.ID, pingService.PingHandler)

	return node, pingService, nil
}

func staticRelay() ([]peerstore.AddrInfo, error) {
	id, err := peerstore.Decode("12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq")
	if err != nil {
		return nil, err
	}
	addr, err := multiaddr.NewMultiaddr("/ip4/23.20.24.146/tcp/4002")
	if err != nil {
		return nil, err
	}
	relay := []peerstore.AddrInfo{{ID: id, Addrs: []multiaddr.Multiaddr{addr}}}
	return relay, nil
}
