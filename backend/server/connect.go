package server

import (
	"context"
	"fmt"
	"mintter/proto"

	"github.com/multiformats/go-multiaddr"
)

// ConnectToPeer implements Mintter server.
func (s *Server) ConnectToPeer(ctx context.Context, in *proto.ConnectToPeerRequest) (*proto.ConnectToPeerResponse, error) {
	mas := make([]multiaddr.Multiaddr, len(in.Addrs))

	for i, a := range in.Addrs {
		ma, err := multiaddr.NewMultiaddr(a)
		if err != nil {
			// We allow passing plain peer IDs to attempt the connection, so when parsing fails
			// we adapt the peer ID to be the valid multiaddr.
			a = "/p2p/" + a
			ma, err = multiaddr.NewMultiaddr(a)
			if err != nil {
				return nil, err
			}
		}
		mas[i] = ma
	}

	if err := s.node.Connect(ctx, mas...); err != nil {
		return nil, fmt.Errorf("failed to establish p2p connection: %w", err)
	}

	return &proto.ConnectToPeerResponse{}, nil
}

func addrSlice(mas ...multiaddr.Multiaddr) []string {
	out := make([]string, len(mas))

	for i, ma := range mas {
		out[i] = ma.String()
	}

	return out
}
