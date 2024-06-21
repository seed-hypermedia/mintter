package mttnet

import (
	"context"
	"fmt"
	"net"
	p2p "seed/backend/genproto/p2p/v1alpha"
	"sync"
	"time"

	gostream "github.com/libp2p/go-libp2p-gostream"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/protocol"
	"github.com/libp2p/go-libp2p/p2p/net/swarm"
	"go.uber.org/multierr"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials/insecure"
)

// Client manages libp2p client connection for the Hyper Media Protocol.
// We're using gRPC on top of libp2p streams, and the Client manages connections
// and provides RPC client instances for a given remote peer.
// Users are responsible to call Close() for graceful shutdown.
type Client struct {
	opts  []grpc.DialOption
	me    peer.ID
	host  host.Host
	mu    sync.Mutex
	conns map[peer.ID]*singleConn
}

type singleConn struct {
	mu   sync.Mutex
	conn *grpc.ClientConn
}

func (sc *singleConn) Close() error {
	if sc.conn == nil {
		return nil
	}

	return sc.conn.Close()
}

// newClient creates a new Client using the provided libp2p host.
func newClient(me peer.ID, h host.Host, protoID protocol.ID) *Client {
	return &Client{
		opts: []grpc.DialOption{
			grpc.WithContextDialer(func(ctx context.Context, target string) (net.Conn, error) {
				id, err := peer.Decode(target)
				if err != nil {
					return nil, fmt.Errorf("failed to dial peer %s: %w", target, err)
				}

				return gostream.Dial(ctx, h, id, protoID)
			}),
			grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpc.WithBlock(),
		},
		me:   me,
		host: h,
	}
}

// Dial a remote peer and provide and RPC client instance.
func (c *Client) Dial(ctx context.Context, pid peer.ID) (p2p.P2PClient, error) {
	conn, err := c.dialPeer(ctx, pid)
	if err != nil {
		return nil, err
	}

	return p2p.NewP2PClient(conn), nil
}

// Close the Client and all the open connections and streams gracefully.
func (c *Client) Close() (err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conns == nil {
		return nil
	}

	for _, sc := range c.conns {
		sc.mu.Lock()
		err = multierr.Append(err, sc.Close())
		sc.mu.Unlock()
	}

	return err
}

func (c *Client) dialPeer(ctx context.Context, pid peer.ID) (*grpc.ClientConn, error) {
	ctx, cancel := context.WithTimeout(ctx, 7*time.Second)
	defer cancel()

	if c.me == pid {
		return nil, errDialSelf
	}

	sw, ok := c.host.Network().(*swarm.Swarm)
	if ok {
		sw.Backoff().Clear(pid)
	}

	// We do lock sharding here. We don't want to hold the main lock for too long,
	// because then dialing one peer for too long will block other peers from being dialed.
	// Instead we hold the main lock very briefly, and then each connection has a separate lock,
	// so that we can make sure there's only one connection open for any given peer.

	var sc *singleConn
	{
		c.mu.Lock()
		if c.conns == nil {
			c.conns = make(map[peer.ID]*singleConn)
		}
		sc = c.conns[pid]
		if sc == nil {
			sc = &singleConn{}
			c.conns[pid] = sc
		}
		c.mu.Unlock()
	}

	sc.mu.Lock()
	defer sc.mu.Unlock()

	if sc.conn != nil && sc.conn.GetState() == connectivity.Shutdown {
		// Best effort closing connection.
		go sc.conn.Close()
		sc.conn = nil
	}

	if sc.conn == nil {
		conn, err := grpc.DialContext(ctx, pid.String(), c.opts...)
		if err != nil {
			return nil, fmt.Errorf("grpc-p2p: failed to dial peer %s: %w", pid, err)
		}
		sc.conn = conn
	}

	return sc.conn, nil
}
