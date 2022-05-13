package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"
)

func (n *rpcHandler) GetPeerInfo(context.Context, *p2p.GetPeerInfoRequest) (*p2p.PeerInfo, error) {
	return &p2p.PeerInfo{
		AccountId: n.me.AccountID().String(),
	}, nil
}
