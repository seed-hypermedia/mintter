package relay

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	"github.com/libp2p/go-libp2p/p2p/net/swarm"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestRelay(t *testing.T) {
	require.NoError(t, initAndTest())
}

// initAndTest initializes two nodes and 1 relay and tests connectivity
// between the nodes through the relay. You can select the relay version
// 1->v1 or 2->v2.
func initAndTest() error {
	// Create the relay
	log, _ := zap.NewDevelopment(zap.WithCaller(false))

	h2, _ := NewRelay(log, "")
	h2.cfg.Network.AnnounceAddrs = []string{
		"/ip4/0.0.0.0/tcp/4001",
		"/ip4/0.0.0.0/udp/4001/quic-v1",
	}

	if err := h2.Start(); err != nil {
		return err
	}
	defer func() {
		_ = h2.Stop()
		os.Remove(defaultCfgPath)
	}()
	h2info := peer.AddrInfo{
		ID: h2.host.ID(), //We use the internal function since the exported one returns string instead of peer.ID
		//Addrs: h2.ListeningAddrs(),
		Addrs: h2.host.Network().ListenAddresses(),
	}

	//realaysInfo, err := provideBootstrapRelays()
	//if err != nil {
	//	fmt.Errorf("couldn't hardcode relays: %v", err)
	//}
	h1, err := libp2p.New(libp2p.EnableNATService(), libp2p.EnableHolePunching(),
		libp2p.EnableRelay(), libp2p.ForceReachabilityPrivate(),
		libp2p.EnableAutoRelay(autorelay.WithStaticRelays([]peer.AddrInfo{h2info})),
	)
	if err != nil {
		return fmt.Errorf("failed to create h1: %w", err)
	}
	defer h1.Close()

	fmt.Println("H1 peerstore:", h1.Peerstore().Addrs(h1.ID()))

	h3, err := libp2p.New(libp2p.EnableNATService(), libp2p.EnableHolePunching(),
		libp2p.EnableRelay(), libp2p.ForceReachabilityPrivate(),
		libp2p.EnableAutoRelay(autorelay.WithStaticRelays([]peer.AddrInfo{h2info})),
	)
	//h3.Peerstore().AddAddr()
	if err != nil {
		return fmt.Errorf("failed to create h3: %w", err)
	}
	defer h3.Close()

	//h3.Network().Peerstore().ClearAddrs(h3.ID())
	//h3.Network().Peerstore().PeerInfo(h3.ID())
	h3Info := peer.AddrInfo{
		ID:                                                                                h3.ID(),
		Addrs:/*h3.Network().Peerstore().Addrs(h3.ID()),*/ h3.Network().ListenAddresses(), /*h3.Peerstore().Addrs(h3.ID()),*/ /*h3.Addrs()*/
	}
	// Connect both h1 and h3 to the relay, but not to each other
	if err := h1.Connect(context.Background(), h2info); err != nil {
		return fmt.Errorf("failed to connect h1 and h2: %w", err)
	}
	if err := h3.Connect(context.Background(), h2info); err != nil {
		return fmt.Errorf("failed to connect h3 and h2: %w", err)
	}

	h3.SetStreamHandler("/cats", func(s network.Stream) {
		fmt.Println("Meow! It worked!")
		s.Close()
	})

	fmt.Println("H3 peerstore before connect:", h3.Peerstore().Addrs(h3Info.ID))
	fmt.Println("H3 network addresses:", h3.Network().ListenAddresses())

	// Now, to test things, let's set up a protocol handler on h3
	_, err = h1.NewStream(context.Background(), h3.ID(), "/cats")
	if err == nil {
		return fmt.Errorf("didn't actually expect to get a stream here. What happened?")
	}

	// Since we just tried and failed to dial, the dialer system will, by default
	// prevent us from redialing again so quickly. Since we know what we're doing, we
	// can use this ugly hack (it's on our TODO list to make it a little cleaner)
	// to tell the dialer "no, its okay, let's try this again"
	h1.Network().(*swarm.Swarm).Backoff().Clear(h3.ID())

	err = h1.Connect(context.Background(), h3Info)

	if err != nil {
		return fmt.Errorf("Failed to connect h1 and h3: %w", err)
	}

	// Woohoo! we're connected!
	fmt.Println("H3 peerstore after connect:", h3.Peerstore().Addrs(h3Info.ID))
	s, err := h1.NewStream(context.Background(), h3.ID(), "/cats")
	if err != nil {
		return fmt.Errorf("huh, this should have worked: %w", err)
	}

	_, _ = s.Read(make([]byte, 1)) // block until the handler closes the stream

	return nil
}
