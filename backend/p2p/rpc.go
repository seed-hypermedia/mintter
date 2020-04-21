package p2p

import (
	"context"
	"fmt"
	"mintter/backend/identity"
	"mintter/backend/p2p/internal"
	"net"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	gostream "github.com/libp2p/go-libp2p-gostream"
	"go.uber.org/zap"
	"google.golang.org/grpc"
)

// rpcHandler wraps p2p Node implementing grpc server interface.
// This way we don't expose server handlers on the main type.
type rpcHandler struct {
	*Node
}

func (n *Node) serveRPC() {
	srv := grpc.NewServer()

	rpc := &rpcHandler{n}
	internal.RegisterPeerServiceServer(srv, rpc)

	n.g.Go(func() error {
		return srv.Serve(n.lis)
	})

	n.g.Go(func() error {
		<-n.quitc
		srv.GracefulStop()
		return nil
	})
}

func (n *Node) dialProfile(ctx context.Context, pid identity.ProfileID, opts ...grpc.DialOption) (*grpc.ClientConn, error) {
	prof, err := n.store.GetProfile(ctx, pid)
	if err != nil {
		return nil, err
	}

	return n.dial(ctx, prof.Peer.ID, opts...)
}

func (n *Node) dial(ctx context.Context, pid peer.ID, opts ...grpc.DialOption) (*grpc.ClientConn, error) {
	opts = append(opts, n.dialOpts...)

	return grpc.DialContext(ctx, pid.String(), opts...)
}

func dialOpts(host host.Host) []grpc.DialOption {
	return []grpc.DialOption{
		grpc.WithContextDialer(func(ctx context.Context, target string) (net.Conn, error) {
			id, err := peer.Decode(target)
			if err != nil {
				return nil, fmt.Errorf("failed to dial peer %s: %w", target, err)
			}

			return gostream.Dial(ctx, host, id, ProtocolID)
		}),
		grpc.WithInsecure(),
		grpc.WithBlock(),
	}
}

func logClose(l *zap.Logger, fn func() error, errmsg string) {
	if err := fn(); err != nil {
		l.Warn("CloseError", zap.Error(err), zap.String("details", errmsg))
	}
}
