package networking

import (
	"context"
	"fmt"
	"mintter/backend/core"
	networking "mintter/backend/genproto/networking/v1alpha"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/ipfs"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"

	"crawshaw.io/sqlite"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements the networking API.
type Server struct {
	net *future.ReadOnly[*mttnet.Node]
}

// NewServer returns a new networking API server.
func NewServer(node *future.ReadOnly[*mttnet.Node]) *Server {
	return &Server{
		net: node,
	}
}

// Connect implements the Connect RPC method.
func (srv *Server) Connect(ctx context.Context, in *networking.ConnectRequest) (*networking.ConnectResponse, error) {
	info, err := mttnet.AddrInfoFromStrings(in.Addrs...)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "bad addrs: %v", err)
	}

	net, err := srv.getNet()
	if err != nil {
		return nil, err
	}

	if err := net.Connect(ctx, info); err != nil {
		return nil, err
	}

	return &networking.ConnectResponse{}, nil
}

// ListPeers filters peers by status. If no status provided, it lists all peers.
func (srv *Server) ListPeers(ctx context.Context, in *networking.ListPeersRequest) (*networking.ListPeersResponse, error) {
	net, err := srv.getNet()
	if err != nil {
		return nil, err
	}

	out := &networking.ListPeersResponse{}

	if err := net.Blobs().Query(ctx, func(conn *sqlite.Conn) error {
		list, err := hypersql.KeyDelegationsListAll(conn)
		if err != nil {
			return err
		}

		for _, del := range list {
			pid, err := core.Principal(del.KeyDelegationsViewDelegate).PeerID()
			if err != nil {
				return err
			}

			pids := pid.String()

			out.PeerList = append(out.PeerList, &networking.PeerIDs{
				DeviceId:  pids,
				PeerId:    pids,
				AccountId: core.Principal(del.KeyDelegationsViewIssuer).String(),
			})
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return out, nil
}

// GetPeerInfo gets info about
func (srv *Server) GetPeerInfo(ctx context.Context, in *networking.GetPeerInfoRequest) (*networking.PeerInfo, error) {
	if in.DeviceId == "" {
		return nil, status.Error(codes.InvalidArgument, "must specify device id")
	}

	net, err := srv.getNet()
	if err != nil {
		return nil, err
	}

	pid, err := peer.Decode(in.DeviceId)
	if err != nil {
		return nil, fmt.Errorf("failed to parse peer ID %s: %w", in.DeviceId, err)
	}

	addrinfo := net.Libp2p().Peerstore().PeerInfo(pid)
	mas, err := peer.AddrInfoToP2pAddrs(&addrinfo)
	if err != nil {
		return nil, fmt.Errorf("failed to get device addrs: %w", err)
	}

	connectedness := net.Libp2p().Network().Connectedness(pid)

	aid, err := net.AccountForDevice(ctx, pid)
	if err != nil {
		return nil, err
	}

	resp := &networking.PeerInfo{
		Addrs:            ipfs.StringAddrs(mas),
		ConnectionStatus: networking.ConnectionStatus(connectedness), // ConnectionStatus is a 1-to-1 mapping for the libp2p connectedness.
		AccountId:        aid.String(),
	}

	return resp, nil
}

func (srv *Server) getNet() (*mttnet.Node, error) {
	net, ok := srv.net.Get()
	if !ok {
		return nil, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}

	return net, nil
}
