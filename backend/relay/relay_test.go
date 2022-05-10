package relay

import (
	"context"
	"encoding/hex"
	"fmt"
	"testing"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/network"
	"github.com/libp2p/go-libp2p-core/peer"
	swarm "github.com/libp2p/go-libp2p-swarm"
	"github.com/libp2p/go-libp2p/p2p/host/autorelay"
	"github.com/multiformats/go-multiaddr"
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

	cfg := defaultConfig()
	cfg.Network.AnnounceAddrs = []string{
		"/ip4/0.0.0.0/tcp/4001",
		"/ip4/0.0.0.0/udp/4001/quic",
	}
	cfg.PrivKey, _ = generateRandomPrivKey()

	if relayVersion == 1 {
		cfg.RelayV1.Enabled = true
		cfg.RelayV2.Enabled = false
	} else if relayVersion == 2 {
		cfg.RelayV1.Enabled = false
		cfg.RelayV2.Enabled = true
	} else {
		return fmt.Errorf("only v1 and v2 relay version supported, requested %d version", relayVersion)
	}

	h2, _ := NewRelay(log, cfg)
	if err := h2.Start(); err != nil {
		return err
	}
	defer h2.Stop()

	h2info := peer.AddrInfo{
		ID: h2.host.ID(), //We use the internal function since the exported one returns string instead of peer.ID
		//Addrs: h2.ListeningAddrs(),
		Addrs: h2.host.Network().ListenAddresses(),
	}

	//realaysInfo, err := provideBootstrapRelays()
	//if err != nil {
	//	fmt.Errorf("Couldn't hardcode relays: %v", err)
	//}
	h1, err := libp2p.New(libp2p.EnableNATService(), libp2p.EnableHolePunching(),
		libp2p.EnableRelay(), libp2p.ForceReachabilityPrivate(),
		libp2p.EnableAutoRelay(autorelay.WithStaticRelays([]peer.AddrInfo{h2info})),
	)
	if err != nil {
		return fmt.Errorf("Failed to create h1: %v", err)
	}
	defer h1.Close()

	fmt.Println("H1 peerstore:", h1.Peerstore().Addrs(h1.ID()))

	h3, err := libp2p.New(libp2p.EnableNATService(), libp2p.EnableHolePunching(),
		libp2p.EnableRelay(), libp2p.ForceReachabilityPrivate(),
		libp2p.EnableAutoRelay(autorelay.WithStaticRelays([]peer.AddrInfo{h2info})),
	)
	//h3.Peerstore().AddAddr()
	if err != nil {
		return fmt.Errorf("Failed to create h3: %v", err)
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
		return fmt.Errorf("Failed to connect h1 and h2: %v", err)
	}
	if err := h3.Connect(context.Background(), h2info); err != nil {
		return fmt.Errorf("Failed to connect h3 and h2: %v", err)
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
		return fmt.Errorf("Didn't actually expect to get a stream here. What happened?")
	}

	// Since we just tried and failed to dial, the dialer system will, by default
	// prevent us from redialing again so quickly. Since we know what we're doing, we
	// can use this ugly hack (it's on our TODO list to make it a little cleaner)
	// to tell the dialer "no, its okay, let's try this again"
	h1.Network().(*swarm.Swarm).Backoff().Clear(h3.ID())

	err = h1.Connect(context.Background(), h3Info)

	if err != nil {
		return fmt.Errorf("Failed to connect h1 and h3: %v", err)
	}

	// Woohoo! we're connected!
	fmt.Println("H3 peerstore after connect:", h3.Peerstore().Addrs(h3Info.ID))
	s, err := h1.NewStream(context.Background(), h3.ID(), "/cats")
	if err != nil {
		return fmt.Errorf("huh, this should have worked: %v", err)
	}

	s.Read(make([]byte, 1)) // block until the handler closes the stream

	return nil
}

// provideBootstrapRelays hardcodes a list of relays to connect in case
// a node is not reachable from outside
func provideBootstrapRelays() ([]peer.AddrInfo, error) {
	relays := map[string][]string{
		"12D3KooWDEy9x2MkUtDMLwb38isNhWMap39xeKVqL8Wb9AHYPYM7": {
			"/ip4/18.158.173.157/tcp/4002",
			"/ip4/18.158.173.157/udp/4002/quic",
		},
	}
	relaysInfo := []peer.AddrInfo{}

	for ID, Addrs := range relays {
		newID, err := peer.Decode(ID)
		if err != nil {
			return nil, err
		}
		newRelay := peer.AddrInfo{
			ID:    newID,
			Addrs: []multiaddr.Multiaddr{},
		}
		for _, addr := range Addrs {
			ma, err := multiaddr.NewMultiaddr(addr)
			if err != nil {
				return nil, err
			}
			newRelay.Addrs = append(newRelay.Addrs, ma)
		}
		relaysInfo = append(relaysInfo, newRelay)
	}
	return relaysInfo, nil
}

func generateRandomPrivKey() (string, error) {
	priv, _, err := crypto.GenerateKeyPair(crypto.Ed25519, 128)
	if err != nil {
		return "", err
	}
	marshaled, err := crypto.MarshalPrivateKey(priv)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(marshaled), nil
}
