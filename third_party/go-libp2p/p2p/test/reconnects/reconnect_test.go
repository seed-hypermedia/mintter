package reconnect

import (
	"context"
	"io"
	"math/rand"
	"runtime"
	"sync"
	"testing"
	"time"

	bhost "github.com/libp2p/go-libp2p/p2p/host/basic"
	swarmt "github.com/libp2p/go-libp2p/p2p/net/swarm/testing"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/network"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/protocol"

	"github.com/stretchr/testify/require"
)

func EchoStreamHandler(stream network.Stream) {
	_, err := io.CopyBuffer(stream, stream, make([]byte, 64)) // use a small buffer here to avoid problems with flow control
	if err == nil {
		stream.Close()
	} else {
		stream.Reset()
	}
}

func TestReconnect5(t *testing.T) {
	runTest := func(t *testing.T, swarmOpt swarmt.Option) {
		t.Helper()
		const num = 5
		hosts := make([]host.Host, 0, num)

		for i := 0; i < num; i++ {
			h, err := bhost.NewHost(swarmt.GenSwarm(t, swarmOpt), nil)
			require.NoError(t, err)
			defer h.Close()
			hosts = append(hosts, h)
			h.SetStreamHandler(protocol.TestingID, EchoStreamHandler)
		}

		for i := 0; i < 4; i++ {
			runRound(t, hosts)
		}
	}

	t.Run("using TCP", func(t *testing.T) {
		if runtime.GOOS == "darwin" {
			t.Skip("TCP RST handling is flaky in OSX, see https://github.com/golang/go/issues/50254")
		}
		runTest(t, swarmt.OptDisableQUIC)
	})

	t.Run("using QUIC", func(t *testing.T) {
		runTest(t, swarmt.OptDisableTCP)
	})
}

func runRound(t *testing.T, hosts []host.Host) {
	for _, h := range hosts {
		h.SetStreamHandler(protocol.TestingID, EchoStreamHandler)
	}

	// connect all hosts
	for _, h1 := range hosts {
		for _, h2 := range hosts {
			if h1.ID() >= h2.ID() {
				continue
			}
			require.NoError(t, h1.Connect(context.Background(), peer.AddrInfo{ID: h2.ID(), Addrs: h2.Peerstore().Addrs(h2.ID())}))
		}
	}

	const (
		numStreams = 5
		maxDataLen = 64 << 10
	)
	// exchange some data
	for _, h1 := range hosts {
		for _, h2 := range hosts {
			if h1 == h2 {
				continue
			}
			var wg sync.WaitGroup
			wg.Add(numStreams)
			for i := 0; i < numStreams; i++ {
				go func() {
					defer wg.Done()
					data := make([]byte, rand.Intn(maxDataLen)+1)
					rand.Read(data)
					str, err := h1.NewStream(context.Background(), h2.ID(), protocol.TestingID)
					require.NoError(t, err)
					defer str.Close()
					_, err = str.Write(data)
					require.NoError(t, err)
				}()
			}
			wg.Wait()
		}
	}

	// disconnect all hosts
	for _, h1 := range hosts {
		// close connection
		cs := h1.Network().Conns()
		for _, c := range cs {
			if c.LocalPeer() > c.RemotePeer() {
				continue
			}
			c.Close()
		}
	}

	require.Eventually(t, func() bool {
		for _, h1 := range hosts {
			for _, h2 := range hosts {
				if len(h1.Network().ConnsToPeer(h2.ID())) > 0 {
					return false
				}
			}
		}
		return true
	}, 5000*time.Millisecond, 10*time.Millisecond)
}
