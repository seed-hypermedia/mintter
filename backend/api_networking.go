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
}

func newNetworkingAPI(back *backend) networking.NetworkingServer {
	return &networkingAPI{
		back: back,
	}
}

func (srv *networkingAPI) GetPeerAddrs(ctx context.Context, in *networking.GetPeerAddrsRequest) (*networking.GetPeerAddrsResponse, error) {
	if in.PeerId == "" {
		return nil, status.Error(codes.InvalidArgument, "must specify peer id")
	}

	c, err := cid.Decode(in.PeerId)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to parse peer ID as CID: %v", err)
	}

	mas, err := srv.back.GetDeviceAddrs(DeviceID(c))
	if err != nil {
		return nil, fmt.Errorf("failed to get device addrs: %w", err)
	}

	resp := &networking.GetPeerAddrsResponse{
		Addrs: ipfsutil.StringAddrs(mas),
	}

	return resp, nil
}
