package p2p

import (
	"context"
	"time"

	"mintter/backend/p2p/internal"

	peer "github.com/libp2p/go-libp2p-core/peer"
	"go.uber.org/multierr"
)

// Ping another peer to check the connectivity.
func (n *Node) Ping(ctx context.Context, pid peer.ID) (dur time.Duration, err error) {
	conn, err := n.dial(ctx, pid)
	if err != nil {
		return 0, err
	}
	defer func() {
		err = multierr.Append(err, conn.Close())
	}()

	start := time.Now()
	_, err = internal.NewPeerServiceClient(conn).Ping(ctx, &internal.PingRequest{})
	if err != nil {
		return
	}

	dur = time.Since(start)
	return
}

func (n *rpcHandler) Ping(ctx context.Context, in *internal.PingRequest) (*internal.PingResponse, error) {
	time.Sleep(1 * time.Second)
	return &internal.PingResponse{}, nil
}
