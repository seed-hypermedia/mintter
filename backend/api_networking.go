package backend

import (
	"context"
	"fmt"

	"github.com/ipfs/go-cid"
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

	connectedness := srv.back.p2p.Host.Network().Connectedness(deviceID.PeerID())

	resp := &networking.PeerInfo{
		Addrs:            ipfsutil.StringAddrs(mas),
		ConnectionStatus: networking.ConnectionStatus(connectedness), // ConnectionStatus is a 1-to-1 mapping for the libp2p connectedness.
	}

	return resp, nil
}
