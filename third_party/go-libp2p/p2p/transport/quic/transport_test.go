package libp2pquic

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"io"
	"net"
	"testing"

	"github.com/stretchr/testify/require"

	ic "github.com/libp2p/go-libp2p-core/crypto"
	tpt "github.com/libp2p/go-libp2p-core/transport"
	ma "github.com/multiformats/go-multiaddr"

	"github.com/lucas-clemente/quic-go"
)

func getTransport(t *testing.T) tpt.Transport {
	t.Helper()
	rsaKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	key, err := ic.UnmarshalRsaPrivateKey(x509.MarshalPKCS1PrivateKey(rsaKey))
	require.NoError(t, err)
	tr, err := NewTransport(key, nil, nil, nil)
	require.NoError(t, err)
	return tr
}

func TestQUICProtocol(t *testing.T) {
	tr := getTransport(t)
	defer tr.(io.Closer).Close()

	protocols := tr.Protocols()
	if len(protocols) != 1 {
		t.Fatalf("expected to only support a single protocol, got %v", protocols)
	}
	if protocols[0] != ma.P_QUIC {
		t.Fatalf("expected the supported protocol to be QUIC, got %d", protocols[0])
	}
}

func TestCanDial(t *testing.T) {
	tr := getTransport(t)
	defer tr.(io.Closer).Close()

	invalid := []string{
		"/ip4/127.0.0.1/udp/1234",
		"/ip4/5.5.5.5/tcp/1234",
		"/dns/google.com/udp/443/quic",
	}
	valid := []string{
		"/ip4/127.0.0.1/udp/1234/quic",
		"/ip4/5.5.5.5/udp/0/quic",
	}
	for _, s := range invalid {
		invalidAddr, err := ma.NewMultiaddr(s)
		require.NoError(t, err)
		if tr.CanDial(invalidAddr) {
			t.Errorf("didn't expect to be able to dial a non-quic address (%s)", invalidAddr)
		}
	}
	for _, s := range valid {
		validAddr, err := ma.NewMultiaddr(s)
		require.NoError(t, err)
		if !tr.CanDial(validAddr) {
			t.Errorf("expected to be able to dial QUIC address (%s)", validAddr)
		}
	}
}

// The connection passed to quic-go needs to be type-assertable to a net.UDPConn,
// in order to enable features like batch processing and ECN.
func TestConnectionPassedToQUIC(t *testing.T) {
	tr := getTransport(t)
	defer tr.(io.Closer).Close()

	origQuicDialContext := quicDialContext
	defer func() { quicDialContext = origQuicDialContext }()

	var conn net.PacketConn
	quicDialContext = func(_ context.Context, c net.PacketConn, _ net.Addr, _ string, _ *tls.Config, _ *quic.Config) (quic.Connection, error) {
		conn = c
		return nil, errors.New("listen error")
	}
	remoteAddr, err := ma.NewMultiaddr("/ip4/127.0.0.1/udp/0/quic")
	require.NoError(t, err)
	_, err = tr.Dial(context.Background(), remoteAddr, "remote peer id")
	require.EqualError(t, err, "listen error")
	require.NotNil(t, conn)
	defer conn.Close()
	if _, ok := conn.(quic.OOBCapablePacketConn); !ok {
		t.Fatal("connection passed to quic-go cannot be type asserted to a *net.UDPConn")
	}
}
