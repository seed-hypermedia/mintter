package backend

import (
	"context"
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	networking "mintter/api/go/networking/v1alpha"
	"mintter/backend/ipfsutil"
)

type networkingServer struct {
	p2p p2pNodeFactory
}

func newNetworkingServer(p2p *p2pNode) *networkingServer {
	return &networkingServer{
		p2p: makeP2PNodeFactory(p2p),
	}
}

func (srv *networkingServer) GetPeerAddrs(ctx context.Context, in *networking.GetPeerAddrsRequest) (*networking.GetPeerAddrsResponse, error) {
	if in.PeerId == "" {
		return nil, status.Error(codes.InvalidArgument, "must specify peer id")
	}

	p2p, err := srv.p2p()
	if err != nil {
		return nil, err
	}

	pid, err := ipfsutil.PeerIDFromCIDString(in.PeerId)
	if err != nil {
		return nil, fmt.Errorf("failed to decode peer id %s: %w", in.PeerId, err)
	}

	mas, err := p2p.PeerAddrs(pid)
	if err != nil {
		return nil, fmt.Errorf("failed to get addrs for peer id %s: %w", in.PeerId, err)
	}

	resp := &networking.GetPeerAddrsResponse{
		Addrs: ipfsutil.StringAddrs(mas),
	}

	return resp, nil
}
