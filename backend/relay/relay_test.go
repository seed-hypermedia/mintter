package relay

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	ma "github.com/multiformats/go-multiaddr"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func isRelayAddr(addr ma.Multiaddr) bool {
	_, err := addr.ValueForProtocol(ma.P_CIRCUIT)
	return err == nil
}

func TestRelay(t *testing.T) {
	require.NoError(t, initAndTest(2))
	require.NoError(t, initAndTest(1))
}

// initAndTest initialices two nodes and 1 relay and tests connectivity
// between the nodes through the relay. You can select the relay version
// 1->v1 or 2->v2
func initAndTest(relayVersion uint8) error {
	// Create the relay
	log, _ := zap.NewProduction(zap.WithCaller(false))
	defer log.Sync()

	privK, err := LoadIdentity("/tmp/key.pem")
	if err != nil {
		return err
	}

	cfg := defaultConfig()
	cfg.Network.AnnounceAddrs = []string{
		"/ip4/0.0.0.0/tcp/4001",
		"/ip4/127.0.0.1/tcp/4001",
		"/ip4/0.0.0.0/udp/4001/quic",
		"/ip4/0.0.0.0/tcp/4003/ws",
	}
	if relayVersion == 1 {
		cfg.RelayV1.Enabled = true
		cfg.RelayV2.Enabled = false
	} else if relayVersion == 2 {
		cfg.RelayV1.Enabled = false
		cfg.RelayV2.Enabled = true
	} else {
		return fmt.Errorf("only v1 and v2 relay version supported, requested %d version", relayVersion)
	}

	h2, _ := NewRelay(log, cfg, privK)
	if err := h2.Start(); err != nil {
		return err
	}
	defer h2.Stop()

	h2info := peer.AddrInfo{
		ID: h2.host.ID(), //We use the internal function since the exported one returns string instead of peer.ID
		//Addrs: h2.ListeningAddrs(),
		Addrs: h2.host.Network().ListenAddresses(),
	}

	h1, err := libp2p.New( /*libp2p.ListenAddrs(), */ libp2p.EnableNATService(),
		libp2p.EnableRelay(), libp2p.ForceReachabilityPrivate(),
		libp2p.EnableAutoRelay(autorelay.WithStaticRelays([]peer.AddrInfo{h2info})),
	)
	if err != nil {
		return fmt.Errorf("Failed to create h1: %v", err)
	}
	defer h1.Close()

	time.Sleep(1 * time.Second)
	fmt.Println("H1 peerstore:", h1.Peerstore().Addrs(h1.ID()))

	// Zero out the listen addresses for the host, so it can only communicate
	// via p2p-circuit for our example
	h3, err := libp2p.New( /*libp2p.ListenAddrs(), */ libp2p.EnableNATService(),
		libp2p.EnableRelay(), libp2p.ForceReachabilityPrivate(),
		libp2p.EnableAutoRelay(autorelay.WithStaticRelays([]peer.AddrInfo{h2info})),
	)
	if err != nil {
		return fmt.Errorf("Failed to create h3: %v", err)
	}
	defer h3.Close()
	time.Sleep(1 * time.Second)

	h3Info := peer.AddrInfo{
		ID:    h3.ID(),
		Addrs: h3.Peerstore().Addrs(h3.ID()), /*h3.ListeningAddrs()*/
	}
	fmt.Println("H3 peerstore:", h3.Peerstore().Addrs(h3Info.ID))

	relayAddr, err := ma.NewMultiaddr("/p2p/" + h2info.ID.Pretty() + "/p2p-circuit/p2p/" + h3.ID().Pretty())
	if err != nil {
		return err
	}
	h3InfoRelay := peer.AddrInfo{
		ID:    h3.ID(),
		Addrs: []ma.Multiaddr{relayAddr},
	}
	if err := h1.Connect(context.Background(), h3InfoRelay); err != nil {
		return fmt.Errorf("Failed to connect h1 and h3: %v", err)
	}
	time.Sleep(1 * time.Second)
	// Woohoo! we're connected!
	s, err := h1.NewStream(context.Background(), h3.ID(), "/cats")
	if err != nil {
		return fmt.Errorf("huh, this should have worked: %v", err)
	}

	s.Read(make([]byte, 1)) // block until the handler closes the stream

	return nil
}
