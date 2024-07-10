package networking

import (
	"context"
	"fmt"
	"net/netip"
	networking "seed/backend/genproto/networking/v1alpha"
	"seed/backend/hyper"
	"seed/backend/ipfs"
	"seed/backend/mttnet"
	"strings"

	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements the networking API.
type Server struct {
	blobs *hyper.Storage
	net   *mttnet.Node
}

// NewServer returns a new networking API server.
func NewServer(blobs *hyper.Storage, node *mttnet.Node) *Server {
	return &Server{
		blobs: blobs,
		net:   node,
	}
}

// RegisterServer registers the server with the gRPC server.
func (srv *Server) RegisterServer(rpc grpc.ServiceRegistrar) {
	networking.RegisterNetworkingServer(rpc, srv)
}

// Connect implements the Connect RPC method.
func (srv *Server) Connect(ctx context.Context, in *networking.ConnectRequest) (*networking.ConnectResponse, error) {
	// We want to support connecting to plain peer IDs, so we need to convert it into multiaddr.
	if len(in.Addrs) == 1 {
		addr := in.Addrs[0]
		if !strings.Contains(addr, "/") {
			in.Addrs[0] = "/p2p/" + addr
		}
	}

	info, err := mttnet.AddrInfoFromStrings(in.Addrs...)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "bad addrs: %v", err)
	}

	net := srv.net

	if err := net.ForceConnect(ctx, info); err != nil {
		return nil, err
	}

	return &networking.ConnectResponse{}, nil
}

// ListPeers filters peers by status. If no status provided, it lists all peers.
func (srv *Server) ListPeers(ctx context.Context, in *networking.ListPeersRequest) (*networking.ListPeersResponse, error) {
	net := srv.net

	out := &networking.ListPeersResponse{}

	pids := net.Libp2p().Peerstore().Peers()

	out.Peers = make([]*networking.PeerInfo, 0, len(pids))

	for _, pid := range pids {

		// Skip our own peer.
		if pid == net.Libp2p().ID() {
			continue
		}

		// Skip non-seed peers
		if !net.Libp2p().ConnManager().IsProtected(pid, mttnet.ProtocolSupportKey) {
			continue
		}
		var aidString string
		pids := pid.String()
		aid, err := net.AccountForDevice(ctx, pid)
		if err == nil {
			aidString = aid.String()
		}

		addrinfo := net.Libp2p().Peerstore().PeerInfo(pid)
		mas, err := peer.AddrInfoToP2pAddrs(&addrinfo)
		if err != nil {
			return nil, fmt.Errorf("failed to get device addrs: %w", err)
		}

		connectedness := net.Libp2p().Network().Connectedness(pid)

		out.Peers = append(out.Peers, &networking.PeerInfo{
			Id:               pids,
			AccountId:        aidString,
			Addrs:            ipfs.StringAddrs(mas),
			ConnectionStatus: networking.ConnectionStatus(connectedness), // ConnectionStatus is a 1-to-1 mapping for the libp2p connectedness.
		})
	}

	return out, nil
}

// GetPeerInfo gets info about
func (srv *Server) GetPeerInfo(ctx context.Context, in *networking.GetPeerInfoRequest) (*networking.PeerInfo, error) {
	if in.DeviceId == "" {
		return nil, status.Error(codes.InvalidArgument, "must specify device id")
	}

	net := srv.net

	pid, err := peer.Decode(in.DeviceId)
	if err != nil {
		return nil, fmt.Errorf("failed to parse peer ID %s: %w", in.DeviceId, err)
	}

	addrinfo := net.Libp2p().Peerstore().PeerInfo(pid)
	mas, err := peer.AddrInfoToP2pAddrs(&addrinfo)
	if err != nil {
		return nil, fmt.Errorf("failed to get device addrs: %w", err)
	}
	addrs := []string{}
	for _, addr := range ipfs.StringAddrs(mas) {
		if !net.ArePrivateIPsAllowed() {
			ipStr := strings.Split(addr, "/")
			if len(ipStr) < 3 {
				continue
			}
			ip, err := netip.ParseAddr(ipStr[2])
			if err != nil {
				continue
			}
			if ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
				continue
			}
		}

		addrs = append(addrs, addr)
	}
	connectedness := net.Libp2p().Network().Connectedness(pid)
	var aidString string
	aid, err := net.AccountForDevice(ctx, pid)
	if err == nil {
		aidString = aid.String()
	}

	resp := &networking.PeerInfo{
		Id:               in.DeviceId,
		AccountId:        aidString,
		Addrs:            addrs,
		ConnectionStatus: networking.ConnectionStatus(connectedness), // ConnectionStatus is a 1-to-1 mapping for the libp2p connectedness.
	}

	return resp, nil
}
