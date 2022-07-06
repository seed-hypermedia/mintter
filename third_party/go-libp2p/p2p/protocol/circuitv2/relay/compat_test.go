package relay_test

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"testing"

	compatv1 "github.com/libp2p/go-libp2p-circuit"
	relayv1 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv1/relay"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/network"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/transport"

	ma "github.com/multiformats/go-multiaddr"
)

func addTransportV1(t *testing.T, h host.Host, upgrader transport.Upgrader) {
	err := compatv1.AddRelayTransport(h, upgrader)
	if err != nil {
		t.Fatal(err)
	}
}

func TestRelayCompatV2DialV1(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	hosts, upgraders := getNetHosts(t, ctx, 3)
	addTransportV1(t, hosts[0], upgraders[0])
	addTransport(t, hosts[2], upgraders[2])

	rch := make(chan []byte, 1)
	hosts[0].SetStreamHandler("test", func(s network.Stream) {
		defer s.Close()
		defer close(rch)

		buf := make([]byte, 1024)
		nread := 0
		for nread < len(buf) {
			n, err := s.Read(buf[nread:])
			nread += n
			if err != nil {
				if err == io.EOF {
					break
				}
				t.Fatal(err)
			}
		}

		rch <- buf[:nread]
	})

	r, err := relayv1.NewRelay(hosts[1])
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()

	connect(t, hosts[0], hosts[1])
	connect(t, hosts[1], hosts[2])

	raddr, err := ma.NewMultiaddr(fmt.Sprintf("/p2p/%s/p2p-circuit/p2p/%s", hosts[1].ID(), hosts[0].ID()))
	if err != nil {
		t.Fatal(err)
	}

	err = hosts[2].Connect(ctx, peer.AddrInfo{ID: hosts[0].ID(), Addrs: []ma.Multiaddr{raddr}})
	if err != nil {
		t.Fatal(err)
	}

	conns := hosts[2].Network().ConnsToPeer(hosts[0].ID())
	if len(conns) != 1 {
		t.Fatalf("expected 1 connection, but got %d", len(conns))
	}
	if conns[0].Stat().Transient {
		t.Fatal("expected non transient connection")
	}

	s, err := hosts[2].NewStream(ctx, hosts[0].ID(), "test")
	if err != nil {
		t.Fatal(err)
	}

	msg := []byte("relay works!")
	nwritten, err := s.Write(msg)
	if err != nil {
		t.Fatal(err)
	}
	if nwritten != len(msg) {
		t.Fatalf("expected to write %d bytes, but wrote %d instead", len(msg), nwritten)
	}
	s.CloseWrite()

	got := <-rch
	if !bytes.Equal(msg, got) {
		t.Fatalf("Wrong echo; expected %s but got %s", string(msg), string(got))
	}
}

func TestRelayCompatV1DialV2(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	hosts, upgraders := getNetHosts(t, ctx, 3)
	addTransport(t, hosts[0], upgraders[0])
	addTransportV1(t, hosts[2], upgraders[2])

	rch := make(chan []byte, 1)
	hosts[0].SetStreamHandler("test", func(s network.Stream) {
		defer s.Close()
		defer close(rch)

		buf := make([]byte, 1024)
		nread := 0
		for nread < len(buf) {
			n, err := s.Read(buf[nread:])
			nread += n
			if err != nil {
				if err == io.EOF {
					break
				}
				t.Fatal(err)
			}
		}

		rch <- buf[:nread]
	})

	r, err := relayv1.NewRelay(hosts[1])
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()

	connect(t, hosts[0], hosts[1])
	connect(t, hosts[1], hosts[2])

	raddr, err := ma.NewMultiaddr(fmt.Sprintf("/p2p/%s/p2p-circuit/p2p/%s", hosts[1].ID(), hosts[0].ID()))
	if err != nil {
		t.Fatal(err)
	}

	err = hosts[2].Connect(ctx, peer.AddrInfo{ID: hosts[0].ID(), Addrs: []ma.Multiaddr{raddr}})
	if err != nil {
		t.Fatal(err)
	}

	conns := hosts[2].Network().ConnsToPeer(hosts[0].ID())
	if len(conns) != 1 {
		t.Fatalf("expected 1 connection, but got %d", len(conns))
	}
	if conns[0].Stat().Transient {
		t.Fatal("expected non transient connection")
	}

	s, err := hosts[2].NewStream(ctx, hosts[0].ID(), "test")
	if err != nil {
		t.Fatal(err)
	}

	msg := []byte("relay works!")
	nwritten, err := s.Write(msg)
	if err != nil {
		t.Fatal(err)
	}
	if nwritten != len(msg) {
		t.Fatalf("expected to write %d bytes, but wrote %d instead", len(msg), nwritten)
	}
	s.CloseWrite()

	got := <-rch
	if !bytes.Equal(msg, got) {
		t.Fatalf("Wrong echo; expected %s but got %s", string(msg), string(got))
	}
}
