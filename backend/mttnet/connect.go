package mttnet

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"strings"
	"time"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/net/swarm"
	"go.uber.org/zap"
	rpcpeer "google.golang.org/grpc/peer"
)

// Connect to a peer using provided addr info.
func (n *Node) Connect(ctx context.Context, info peer.AddrInfo) (err error) {
	if info.ID == "" {
		return fmt.Errorf("must specify peer ID to connect")
	}

	isConnected := n.p2p.Host.Network().Connectedness(info.ID) == network.Connected
	didHandshake := n.p2p.ConnManager().IsProtected(info.ID, protocolSupportKey)

	if isConnected && didHandshake {
		return nil
	}

	log := n.log.With(zap.String("peer", info.ID.String()))
	ctx, cancel := context.WithTimeout(ctx, 7*time.Second)
	defer cancel()

	log.Debug("ConnectStarted")
	defer func() {
		log.Debug("ConnectFinished", zap.Error(err), zap.String("Info", info.String()))
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

	if err := n.checkMintterProtocolVersion(info.ID, n.protocol.version); err != nil {
		return err
	}

	c, err := n.client.Dial(ctx, info.ID)
	if err != nil {
		return err
	}

	myInfo, err := n.handshakeInfo(ctx)
	if err != nil {
		return err
	}

	theirInfo, err := c.Handshake(ctx, myInfo)
	if err != nil {
		return fmt.Errorf("failed to handshake with peer %s: %w", info.ID, err)
	}

	if err := n.verifyHandshake(ctx, info.ID, theirInfo); err != nil {
		return err
	}

	return nil
}

func (n *Node) checkMintterProtocolVersion(pid peer.ID, desiredVersion string) (err error) {
	protos, err := n.p2p.Peerstore().GetProtocols(pid)
	if err != nil {
		return fmt.Errorf("failed to check mintter protocol version: %w", err)
	}

	var isMintter bool
	if len(protos) == 0 {
		n.log.Warn("peer does not support any protocol", zap.String("PeerID", pid.String()))
	}

	// Eventually we'd need to implement some compatibility checks between different protocol versions.
	for _, p := range protos {
		version := strings.TrimPrefix(string(p), n.protocol.prefix)
		if version == string(p) {
			continue
		}
		isMintter = true
		if version == desiredVersion {
			return nil
		}
	}

	if isMintter {
		return fmt.Errorf("peer with incompatible Mintter protocol version")
	}

	return fmt.Errorf("not a Mintter peer")
}

func (n *Node) verifyHandshake(ctx context.Context, pid peer.ID, pb *p2p.HandshakeInfo) error {
	c, err := cid.Cast(pb.KeyDelegationCid)
	if err != nil {
		return fmt.Errorf("failed to cast key delegation CID: %w", err)
	}

	// TODO(burdiyan): avoid verifying if already seen this peer.

	var kd hyper.KeyDelegation
	if err := cbornode.DecodeInto(pb.KeyDelegationData, &kd); err != nil {
		return fmt.Errorf("failed to decode key delegation to verify: %w", err)
	}

	if err := kd.Verify(); err != nil {
		return fmt.Errorf("failed to verify handshake: %w", err)
	}

	if kd.Purpose != hyper.DelegationPurposeRegistration {
		return fmt.Errorf("invalid key delegation purpose: %s", kd.Purpose)
	}

	if kd.Type != hyper.TypeKeyDelegation {
		return fmt.Errorf("invalid blob type: %s", kd.Type)
	}

	blob := kd.Blob()

	if !blob.CID.Equals(c) {
		return fmt.Errorf("handshake key delegation CID doesn't match")
	}

	if err := n.blobs.SaveBlob(ctx, blob); err != nil {
		return fmt.Errorf("failed to save handshake key delegation blob: %w", err)
	}

	n.p2p.ConnManager().Protect(pid, protocolSupportKey)

	return nil
}

var errDialSelf = errors.New("can't dial self")

// Handshake gets called by the remote peer who initiates the connection.
func (srv *rpcMux) Handshake(ctx context.Context, in *p2p.HandshakeInfo) (*p2p.HandshakeInfo, error) {
	n := srv.Node
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		panic("BUG: no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return nil, err
	}

	log := n.log.With(zap.String("peer", pid.String()))

	if err := n.checkMintterProtocolVersion(pid, srv.Node.protocol.version); err != nil {
		return nil, err
	}

	if err := n.verifyHandshake(ctx, pid, in); err != nil {
		// TODO(burdiyan): implement blocking and disconnecting from bad peers.
		log.Warn("FailedToVerifyIncomingMintterHandshake", zap.Error(err))
		return nil, fmt.Errorf("you gave me a bad handshake")
	}

	return n.handshakeInfo(ctx)
}

func (n *Node) handshakeInfo(ctx context.Context) (*p2p.HandshakeInfo, error) {
	// TODO(burdiyan): this is only needed once. Cache it.
	// Not doing it because we used to have weird proof not found issues.

	c, err := n.getDelegation(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get our own key delegation for handshake: %w", err)
	}

	blk, err := n.blobs.IPFSBlockstoreReader().Get(ctx, c)
	if err != nil {
		return nil, fmt.Errorf("failed to load block for our own handshake: %w", err)
	}

	hinfo := &p2p.HandshakeInfo{
		KeyDelegationCid:  c.Bytes(),
		KeyDelegationData: blk.RawData(),
	}

	return hinfo, nil
}

func (n *Node) getDelegation(ctx context.Context) (cid.Cid, error) {
	var out cid.Cid

	// TODO(burdiyan): need to cache this. Makes no sense to always do this.
	if err := n.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		acc := n.me.Account().Principal()
		dev := n.me.DeviceKey().Principal()

		list, err := hypersql.KeyDelegationsList(conn, acc)
		if err != nil {
			return err
		}

		for _, res := range list {
			if bytes.Equal(dev, res.KeyDelegationsViewDelegate) {
				out = cid.NewCidV1(uint64(res.KeyDelegationsViewBlobCodec), res.KeyDelegationsViewBlobMultihash)
				return nil
			}
		}

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	if !out.Defined() {
		return out, fmt.Errorf("BUG: failed to find our own key delegation")
	}

	return out, nil
}
