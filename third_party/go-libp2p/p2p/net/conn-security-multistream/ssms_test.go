package csms

import (
	"context"
	"io"
	"net"
	"sync"
	"testing"

	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/sec"
	"github.com/libp2p/go-libp2p-core/sec/insecure"
	tnet "github.com/libp2p/go-libp2p-testing/net"

	"github.com/stretchr/testify/require"
)

type TransportAdapter struct {
	mux *SSMuxer
}

func (sm *TransportAdapter) SecureInbound(ctx context.Context, insecure net.Conn, p peer.ID) (sec.SecureConn, error) {
	sconn, _, err := sm.mux.SecureInbound(ctx, insecure, p)
	return sconn, err
}

func (sm *TransportAdapter) SecureOutbound(ctx context.Context, insecure net.Conn, p peer.ID) (sec.SecureConn, error) {
	sconn, _, err := sm.mux.SecureOutbound(ctx, insecure, p)
	return sconn, err
}

func TestCommonProto(t *testing.T) {
	idA := tnet.RandIdentityOrFatal(t)
	idB := tnet.RandIdentityOrFatal(t)

	var at, bt SSMuxer

	atInsecure := insecure.NewWithIdentity(idA.ID(), idA.PrivateKey())
	btInsecure := insecure.NewWithIdentity(idB.ID(), idB.PrivateKey())
	at.AddTransport("/plaintext/1.0.0", atInsecure)
	bt.AddTransport("/plaintext/1.1.0", btInsecure)
	bt.AddTransport("/plaintext/1.0.0", btInsecure)

	ln, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)
	muxB := &TransportAdapter{mux: &bt}
	connChan := make(chan sec.SecureConn)
	go func() {
		conn, err := ln.Accept()
		require.NoError(t, err)
		c, err := muxB.SecureInbound(context.Background(), conn, idA.ID())
		require.NoError(t, err)
		connChan <- c
	}()

	muxA := &TransportAdapter{mux: &at}

	cconn, err := net.Dial("tcp", ln.Addr().String())
	require.NoError(t, err)

	cc, err := muxA.SecureOutbound(context.Background(), cconn, idB.ID())
	require.NoError(t, err)
	require.Equal(t, cc.LocalPeer(), idA.ID())
	require.Equal(t, cc.RemotePeer(), idB.ID())
	_, err = cc.Write([]byte("foobar"))
	require.NoError(t, err)
	require.NoError(t, cc.Close())

	sc := <-connChan
	require.Equal(t, sc.LocalPeer(), idB.ID())
	require.Equal(t, sc.RemotePeer(), idA.ID())
	b, err := io.ReadAll(sc)
	require.NoError(t, err)
	require.Equal(t, "foobar", string(b))
}

func TestNoCommonProto(t *testing.T) {
	idA := tnet.RandIdentityOrFatal(t)
	idB := tnet.RandIdentityOrFatal(t)

	var at, bt SSMuxer
	atInsecure := insecure.NewWithIdentity(idA.ID(), idA.PrivateKey())
	btInsecure := insecure.NewWithIdentity(idB.ID(), idB.PrivateKey())

	at.AddTransport("/plaintext/1.0.0", atInsecure)
	bt.AddTransport("/plaintext/1.1.0", btInsecure)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	a, b := net.Pipe()

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		defer a.Close()
		_, _, err := at.SecureInbound(ctx, a, "")
		if err == nil {
			t.Error("connection should have failed")
		}
	}()

	go func() {
		defer wg.Done()
		defer b.Close()
		_, _, err := bt.SecureOutbound(ctx, b, "peerA")
		if err == nil {
			t.Error("connection should have failed")
		}
	}()
	wg.Wait()
}
