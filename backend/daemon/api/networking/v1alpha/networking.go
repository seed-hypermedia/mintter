package networking

import (
	"context"
	"fmt"
	"mintter/backend/core"
	networking "mintter/backend/genproto/networking/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs/vcssql"

	"github.com/ipfs/go-cid"
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
	//allPeers := net.Libp2p().Peerstore().Peers()

	conn, release, err := net.VCS().DB().Conn(ctx)
	if err != nil {
		return nil, err
	}
	devices, err := vcssql.DevicesList(conn)
	release()
	if err != nil {
		return nil, err
	}
	ret := networking.ListPeersResponse{
		PeerList: []*networking.PeerIDs{},
	}
	for _, device := range devices {
		did := cid.NewCidV1(core.CodecDeviceKey, device.DevicesMultihash)
		pid, err := peer.FromCid(did)
		if err != nil {
			return nil, fmt.Errorf("failed to parse device ID[%s] as PID: %w", did.String(), err)
		}

		connectedness := net.Libp2p().Network().Connectedness(pid)
		if in.Status >= 0 && in.Status != networking.ConnectionStatus(connectedness) {
			continue
		}
		aid, err := net.AccountForDevice(ctx, did)
		if err != nil {
			return nil, err
		}

		ret.PeerList = append(ret.PeerList, &networking.PeerIDs{
			DeviceId:  did.String(),
			PeerId:    pid.String(),
			AccountId: aid.String(),
		})
	}

	return &ret, nil
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

	device, err := cid.Decode(in.DeviceId)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to parse device ID as CID: %v", err)
	}

	pid, err := peer.FromCid(device)
	if err != nil {
		return nil, err
	}

	addrinfo := net.Libp2p().Peerstore().PeerInfo(pid)
	mas, err := peer.AddrInfoToP2pAddrs(&addrinfo)
	if err != nil {
		return nil, fmt.Errorf("failed to get device addrs: %w", err)
	}

	connectedness := net.Libp2p().Network().Connectedness(pid)

	aid, err := net.AccountForDevice(ctx, device)
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
