package mdns_legacy

import (
	"context"
	"testing"
	"time"

	bhost "github.com/libp2p/go-libp2p/p2p/host/basic"
	swarmt "github.com/libp2p/go-libp2p/p2p/net/swarm/testing"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"

	"github.com/stretchr/testify/require"
)

type DiscoveryNotifee struct {
	h host.Host
}

func (n *DiscoveryNotifee) HandlePeerFound(pi peer.AddrInfo) {
	n.h.Connect(context.Background(), pi)
}

func TestMdnsDiscovery(t *testing.T) {
	// TODO: re-enable when the new lib will get integrated
	t.Skip("TestMdnsDiscovery fails randomly with current lib")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	a, err := bhost.NewHost(swarmt.GenSwarm(t), nil)
	require.NoError(t, err)
	b, err := bhost.NewHost(swarmt.GenSwarm(t), nil)
	require.NoError(t, err)

	sa, err := NewMdnsService(ctx, a, time.Second, "someTag")
	require.NoError(t, err)

	sb, err := NewMdnsService(ctx, b, time.Second, "someTag")
	require.NoError(t, err)
	_ = sb

	n := &DiscoveryNotifee{a}

	sa.RegisterNotifee(n)

	time.Sleep(time.Second * 2)

	if err := a.Connect(ctx, peer.AddrInfo{ID: b.ID()}); err != nil {
		t.Fatal(err)
	}
}
