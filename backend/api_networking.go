package backend

import (
	"context"
	"fmt"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multiaddr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	networking "mintter/api/go/networking/v1alpha"
	"mintter/backend/ipfsutil"
)

type networkingAPI struct {
	back *backend
	networking.UnimplementedNetworkingServer
}

func newNetworkingAPI(back *backend) networking.NetworkingServer {
	return &networkingAPI{
		back: back,
	}
}

func (srv *networkingAPI) Connect(ctx context.Context, in *networking.ConnectRequest) (*networking.ConnectResponse, error) {
	if len(in.Addrs) == 0 {
		return nil, status.Error(codes.InvalidArgument, "must specify at least one address to connect")
	}

	mas := make([]multiaddr.Multiaddr, len(in.Addrs))
	for i, a := range in.Addrs {
		ma, err := multiaddr.NewMultiaddr(a)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "bad multiaddr %s: %v", a, err)
		}
		mas[i] = ma
	}

	return &networking.ConnectResponse{}, srv.back.Connect(ctx, mas...)
}

func (srv *networkingAPI) GetPeerInfo(ctx context.Context, in *networking.GetPeerInfoRequest) (*networking.PeerInfo, error) {
	if in.PeerId == "" {
		return nil, status.Error(codes.InvalidArgument, "must specify peer id")
	}

	c, err := cid.Decode(in.PeerId)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to parse peer ID as CID: %v", err)
	}

	deviceID := DeviceID(c)

	mas, err := srv.back.GetDeviceAddrs(deviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get device addrs: %w", err)
	}

	connectedness := srv.back.p2p.libp2p.Network().Connectedness(deviceID.PeerID())

	aid, err := srv.back.GetAccountForDevice(ctx, deviceID)
	if err != nil {
		return nil, err
	}

	resp := &networking.PeerInfo{
		Addrs:            ipfsutil.StringAddrs(mas),
		ConnectionStatus: networking.ConnectionStatus(connectedness), // ConnectionStatus is a 1-to-1 mapping for the libp2p connectedness.
		AccountId:        aid.String(),
	}

	return resp, nil
}
