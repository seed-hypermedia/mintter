package p2p

import (
	"context"
	"errors"
	"fmt"
	"net"

	internal "mintter/api/go/p2p"
	v2 "mintter/api/go/v2"
	"mintter/backend/identity"

	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	gostream "github.com/libp2p/go-libp2p-gostream"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
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
	v2.RegisterDocumentsServer(srv, n.docsrv)

	n.g.Go(func() error {
		err := srv.Serve(n.lis)
		if errors.Is(err, grpc.ErrServerStopped) {
			return nil
		}

		return err
	})

	n.g.Go(func() error {
		<-n.ctx.Done()
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

// dial opens and caches the GRPC connection per peer. Callers MUST NOT close the GRPC connection after it's used.
func (n *Node) dial(ctx context.Context, pid peer.ID, opts ...grpc.DialOption) (*grpc.ClientConn, error) {
	n.connCache.Lock()
	defer n.connCache.Unlock()

	if n.connCache.conns == nil {
		n.connCache.conns = make(map[peer.ID]*grpc.ClientConn)
	}

	if conn := n.connCache.conns[pid]; conn != nil {
		if conn.GetState() != connectivity.Shutdown {
			return conn, nil
		}

		if err := conn.Close(); err != nil {
			n.log.Error("FailedClosingGRPCConnection", zap.Error(err), zap.String("peer", pid.String()))
		}
		delete(n.connCache.conns, pid)
	}

	conn, err := grpc.DialContext(ctx, pid.String(), append(opts, n.dialOpts...)...)
	if err != nil {
		return nil, err
	}

	if n.connCache.conns[pid] != nil {
		panic("BUG: adding connection while there's another open")
	}

	n.connCache.conns[pid] = conn

	return conn, nil
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
