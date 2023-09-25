package networking

import (
	"context"
	"fmt"
	"mintter/backend/core"
	networking "mintter/backend/genproto/networking/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/ipfs"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"net/netip"
	"strings"

	"crawshaw.io/sqlite"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Server implements the networking API.
type Server struct {
	blobs *hyper.Storage
	net   *future.ReadOnly[*mttnet.Node]
}

// NewServer returns a new networking API server.
func NewServer(blobs *hyper.Storage, node *future.ReadOnly[*mttnet.Node]) *Server {
	return &Server{
		blobs: blobs,
		net:   node,
	}
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

	var dels []hypersql.KeyDelegationsListAllResult
	if err := srv.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		dels, err = hypersql.KeyDelegationsListAll(conn)
		return err
	}); err != nil {
		return nil, err
	}

	out.Peers = make([]*networking.PeerInfo, 0, len(dels))

	for _, del := range dels {
		pid, err := core.Principal(del.KeyDelegationsViewDelegate).PeerID()
		if err != nil {
			return nil, err
		}

		// Skip our own peer.
		if pid == net.Libp2p().ID() {
			continue
		}

		pids := pid.String()

		addrinfo := net.Libp2p().Peerstore().PeerInfo(pid)
		mas, err := peer.AddrInfoToP2pAddrs(&addrinfo)
		if err != nil {
			return nil, fmt.Errorf("failed to get device addrs: %w", err)
		}

		connectedness := net.Libp2p().Network().Connectedness(pid)

		out.Peers = append(out.Peers, &networking.PeerInfo{
			Id:               pids,
			AccountId:        core.Principal(del.KeyDelegationsViewIssuer).String(),
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

	aid, err := net.AccountForDevice(ctx, pid)
	if err != nil {
		return nil, err
	}

	resp := &networking.PeerInfo{
		Id:               in.DeviceId,
		AccountId:        aid.String(),
		Addrs:            addrs,
		ConnectionStatus: networking.ConnectionStatus(connectedness), // ConnectionStatus is a 1-to-1 mapping for the libp2p connectedness.
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
