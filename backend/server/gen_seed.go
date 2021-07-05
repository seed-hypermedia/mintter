package server

import (
	"context"

	proto "mintter/backend/api/v2"
	"mintter/backend/identity"
)

// GenSeed implements GenSeed rpc.
func (s *Server) GenSeed(ctx context.Context, req *proto.GenSeedRequest) (*proto.GenSeedResponse, error) {
	words, err := identity.NewMnemonic(req.AezeedPassphrase)
	if err != nil {
		return nil, err
	}

	resp := &proto.GenSeedResponse{
		Mnemonic: words,
	}

	return resp, nil
}
