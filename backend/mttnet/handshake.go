package mttnet

import (
	"context"
	"fmt"
	"mintter/backend/core"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/vcs"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/peer"
	swarm "github.com/libp2p/go-libp2p-swarm"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	rpcpeer "google.golang.org/grpc/peer"
)

// Connect to a peer using provided addrs. All addrs are expected to belong to the same peer.
// The node will stop after the first successful connection.
func (n *Node) Connect(ctx context.Context, info peer.AddrInfo) (err error) {
	if info.ID == "" {
		return fmt.Errorf("must specify peer ID to connect")
	}

	device := peer.ToCid(info.ID)

	log := n.log.With(zap.String("device", device.String()))

	var isMintterPeer bool

	log.Debug("ConnectStarted")
	defer func() {
		log.Debug("ConnectFinished", zap.Error(err), zap.Bool("isMintterPeer", isMintterPeer))
	}()

	// Since we're explicitly connecting to a peer, we want to clear any backoffs
	// that the network might have at the moment.
	{
		sw, ok := n.p2p.Host.Network().(*swarm.Swarm)
		if ok {
			sw.Backoff().Clear(info.ID)
		}
	}

	if err := n.p2p.Host.Connect(ctx, info); err != nil {
		return fmt.Errorf("failed to connect to peer %s: %w", info.ID, err)
	}

	protos, err := n.p2p.Peerstore().GetProtocols(info.ID)
	if err != nil {
		return fmt.Errorf("failed to get protocols for device %s: %w", device, err)
	}

	isMintterPeer = supportsMintterProtocol(protos)
	if !isMintterPeer {
		return nil
	}

	n.p2p.ConnManager().Protect(info.ID, protocolSupportKey)

	c, err := n.RPCClient(ctx, device)
	if err != nil {
		return err
	}

	myInfo, err := n.handshakeInfo(ctx)
	if err != nil {
		return err
	}

	theirInfo, err := c.Handshake(ctx, myInfo)
	if err != nil {
		return fmt.Errorf("failed to handshake with device %s: %w", device, err)
	}

	h, err := decodeHandshake(device, theirInfo)
	if err != nil {
		return err
	}

	if err := n.verifyMintterPeer(ctx, h); err != nil {
		return fmt.Errorf("failed to verify mintter peer: %w", err)
	}

	return nil
}

func (n *Node) verifyMintterPeerAsync(h decodedHandshake) {
	log := n.log.With(zap.String("device", h.device.String()))

	n.wg.Add(1)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()

		log.Debug("MintterPeerVerificationStarted")
		err := n.verifyMintterPeer(ctx, h)
		log.Debug("MintterPeerVerificationFinished", zap.Error(err))
		n.wg.Done()
	}()
}

type decodedHandshake struct {
	account    cid.Cid
	device     cid.Cid
	accountObj vcs.ObjectID
	ver        vcs.Version
}

func decodeHandshake(device cid.Cid, theirInfo *p2p.HandshakeInfo) (out decodedHandshake, err error) {
	racc, err := cid.Decode(theirInfo.AccountId)
	if err != nil {
		return out, fmt.Errorf("failed to parse remote account ID %s: %w", theirInfo.AccountId, err)
	}

	robj, err := cid.Decode(theirInfo.AccountObjectId)
	if err != nil {
		return out, fmt.Errorf("failed to parse remote account object ID %s: %w", theirInfo.AccountObjectId, err)
	}

	rver, err := vcs.ParseVersion(theirInfo.Version)
	if err != nil {
		return out, fmt.Errorf("failed to parse remote version %s: %w", theirInfo.Version, err)
	}

	if codec := racc.Prefix().Codec; codec != core.CodecAccountKey {
		return out, fmt.Errorf("bad codec for account ID: %d", codec)
	}

	if codec := device.Prefix().Codec; codec != core.CodecDeviceKey {
		return out, fmt.Errorf("bad codec for device ID: %d", codec)
	}

	if codec := robj.Prefix().Codec; codec != cid.DagCBOR {
		return out, fmt.Errorf("bad codec for account object ID: %d", codec)
	}

	return decodedHandshake{
		account:    racc,
		device:     device,
		accountObj: robj,
		ver:        rver,
	}, nil
}

func (n *Node) verifyMintterPeer(ctx context.Context, h decodedHandshake) error {
	sess := n.bitswap.NewSession(ctx)

	if err := n.syncer.SyncFromVersion(ctx, n.me.AccountID(), n.me.DeviceKey().CID(), h.accountObj, sess, h.ver); err != nil {
		return fmt.Errorf("failed to sync peer account object: %w", err)
	}

	// TODO:
	// Check if device is trusted.
	// Disconnet, unprotect, and blacklist if revoked.

	return nil
}

func (n *Node) dialPeer(ctx context.Context, pid peer.ID) (*grpc.ClientConn, error) {
	sw, ok := n.p2p.Host.Network().(*swarm.Swarm)
	if ok {
		sw.Backoff().Clear(pid)
	}

	return n.rpcConns.Dial(ctx, pid, n.dialOpts)
}

func (n *rpcHandler) Handshake(ctx context.Context, in *p2p.HandshakeInfo) (*p2p.HandshakeInfo, error) {
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		panic("BUG: no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return nil, err
	}

	n.p2p.ConnManager().Protect(pid, protocolSupportKey)

	device := peer.ToCid(pid)

	h, err := decodeHandshake(device, in)
	if err != nil {
		return nil, err
	}

	n.verifyMintterPeerAsync(h)

	return n.handshakeInfo(ctx)
}

func (n *Node) handshakeInfo(ctx context.Context) (*p2p.HandshakeInfo, error) {
	ver, err := n.vcs.LoadNamedVersion(ctx, n.accountObjectID, n.me.AccountID(), n.me.DeviceKey().CID(), "main")
	if err != nil {
		return nil, fmt.Errorf("failed to load version of our account: %w", err)
	}

	hinfo := &p2p.HandshakeInfo{
		AccountId:       n.me.AccountID().String(),
		AccountObjectId: n.accountObjectID.String(),
		Version:         ver.String(),
	}

	return hinfo, nil
}

func supportsMintterProtocol(protos []string) bool {
	// Eventually we'd need to implement some compatibility checks between different protocol versions.
	for _, p := range protos {
		if p == string(ProtocolID) {
			return true
		}
	}

	return false
}
