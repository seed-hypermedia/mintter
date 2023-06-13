package mttnet

import (
	"context"
	"fmt"
	"mintter/backend/core"
	site "mintter/backend/genproto/documents/v1alpha"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"net"
	"sync"
	"time"

	gostream "github.com/libp2p/go-libp2p-gostream"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/net/swarm"
	"go.uber.org/multierr"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials/insecure"
)

// Client manages libp2p client connection for the Mintter Protocol.
// We're using gRPC on top of libp2p streams, and the Client manages connections
// and provides RPC client instances for a given remote peer.
// Users are responsible to call Close() for graceful shutdown.
type Client struct {
	opts  []grpc.DialOption
	me    core.Identity
	host  host.Host
	mu    sync.Mutex
	conns map[peer.ID]*grpc.ClientConn
}

// NewClient creates a new Client using the provided libp2p host.
func NewClient(me core.Identity, h host.Host) *Client {
	return &Client{
		opts: []grpc.DialOption{
			grpc.WithContextDialer(func(ctx context.Context, target string) (net.Conn, error) {
				id, err := peer.Decode(target)
				if err != nil {
					return nil, fmt.Errorf("failed to dial peer %s: %w", target, err)
				}

				return gostream.Dial(ctx, h, id, ProtocolID)
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

// DialSite dials a remote site a remote peer and provide and RPC client instance.
func (c *Client) DialSite(ctx context.Context, siteDeviceID peer.ID) (site.WebSiteClient, error) {
	conn, err := c.dialPeer(ctx, siteDeviceID)
	if err != nil {
		return nil, err
	}

	return site.NewWebSiteClient(conn), nil
}

// Close the Client and all the open connections and streams gracefully.
func (c *Client) Close() (err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conns == nil {
		return nil
	}

	for _, conn := range c.conns {
		err = multierr.Append(err, conn.Close())
	}

	return err
}

func (c *Client) dialPeer(ctx context.Context, pid peer.ID) (*grpc.ClientConn, error) {
	ctx, cancel := context.WithTimeout(ctx, 7*time.Second)
	defer cancel()

	if c.me.DeviceKey().ID() == pid {
		return nil, errDialSelf
	}

	sw, ok := c.host.Network().(*swarm.Swarm)
	if ok {
		sw.Backoff().Clear(pid)
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conns == nil {
		c.conns = make(map[peer.ID]*grpc.ClientConn)
	}

	if conn := c.conns[pid]; conn != nil {
		if conn.GetState() != connectivity.Shutdown {
			return conn, nil
		}

		// Best effort closing connection.
		go conn.Close()

		delete(c.conns, pid)
	}

	conn, err := grpc.DialContext(ctx, pid.String(), c.opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to establish connection to device %s: %w", peer.ToCid(pid), err)
	}

	if c.conns[pid] != nil {
		panic("BUG: adding connection while there's another open")
	}

	c.conns[pid] = conn

	return conn, nil
}
