package mttnet

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/db/sqliteschema"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/vcs"
	"mintter/backend/vcs/sqlitevcs"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
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

	device := peer.ToCid(info.ID)

	log := n.log.With(zap.String("device", device.String()))

	var isMintterPeer bool

	log.Debug("ConnectStarted")
	defer func() {
		log.Debug("ConnectFinished", zap.Error(err), zap.Bool("isMintterPeer", isMintterPeer), zap.String("Info", info.String()))
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

	isMintterPeer, err = n.checkMintterProtocolVersion(info.ID)
	if err != nil {
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
		return fmt.Errorf("failed to handshake with device %s: %w", device, err)
	}

	if err := n.verifyHandshake(ctx, device, theirInfo); err != nil {
		return err
	}

	n.p2p.ConnManager().Protect(info.ID, protocolSupportKey)

	return nil
}

func (n *Node) checkMintterProtocolVersion(pid peer.ID) (ok bool, err error) {
	protos, err := n.p2p.Peerstore().GetProtocols(pid)
	if err != nil {
		return false, fmt.Errorf("failed to check mintter protocol version: %w", err)
	}

	return supportsMintterProtocol(protos), nil
}

func (n *Node) verifyHandshake(ctx context.Context, device cid.Cid, pb *p2p.HandshakeInfo) error {
	pubKey, err := core.ParsePublicKey(core.CodecAccountKey, pb.AccountPublicKey)
	if err != nil {
		return fmt.Errorf("failed to parse remote account public key: %w", err)
	}

	if err := sqlitevcs.RegistrationProof(pb.AccountDeviceProof).Verify(pubKey, device); err != nil {
		return fmt.Errorf("failed to verify account device registration proof: %w", err)
	}

	conn, release, err := n.vcs.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	conn.EnsureAccountDevice(pubKey.CID(), device)

	return conn.Err()
}

var errDialSelf = errors.New("can't dial self")

// Handshake gets called by the remote peer who initiates the connection.
func (srv *Server) Handshake(ctx context.Context, in *p2p.HandshakeInfo) (*p2p.HandshakeInfo, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		panic("BUG: no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return nil, err
	}

	device := peer.ToCid(pid)

	log := n.log.With(
		zap.String("peer", pid.String()),
		zap.String("device", device.String()),
	)

	ok, err = n.checkMintterProtocolVersion(pid)
	if err != nil {
		return nil, err
	}
	if !ok {
		log.Debug("SkippedHandshakeWithIncompatibleMintterPeer")
		return nil, fmt.Errorf("you have an incompatible protocol version")
	}

	if err := n.verifyHandshake(ctx, device, in); err != nil {
		// TODO(burdiyan): implement blocking and disconnecting from bad peers.
		log.Warn("FailedToVerifyIncomingMintterHandshake", zap.Error(err))
		return nil, fmt.Errorf("you gave me a bad handshake")
	}

	n.p2p.ConnManager().Protect(pid, protocolSupportKey)

	return n.handshakeInfo(ctx)
}

func (n *Node) handshakeInfo(ctx context.Context) (*p2p.HandshakeInfo, error) {
	// TODO(burdiyan): this is only needed once. Cache it.
	// Not doing it because we used to have weird proof not found issues.

	const q = `
SELECT
	` + sqliteschema.C_DeviceProofsDelegationCodec + `,
	` + sqliteschema.C_DeviceProofsDelegationHash + `
FROM ` + sqliteschema.T_DeviceProofs + `
WHERE ` + sqliteschema.C_DeviceProofsAccountHash + `= ?
AND ` + sqliteschema.C_DeviceProofsDeviceHash + ` = ?
LIMIT 1`

	conn, release, err := n.vcs.Conn(ctx)
	if err != nil && !errors.Is(err, context.Canceled) {
		panic(err)
	}
	defer release()

	var (
		proofCodec int
		proofHash  []byte
	)
	if err := sqlitex.Exec(conn.InternalConn(), q, func(stmt *sqlite.Stmt) error {
		stmt.Scan(&proofCodec, &proofHash)
		return nil
	}, n.me.AccountID().Hash(), n.me.DeviceKey().CID().Hash()); err != nil {
		return nil, fmt.Errorf("failed to get delegation from database: %w", err)
	}
	if proofHash == nil {
		return nil, fmt.Errorf("BUG: can't find proof for our own device")
	}

	cc := cid.NewCidV1(uint64(proofCodec), proofHash)

	blk, err := conn.GetBlock(ctx, cc)
	if err != nil {
		return nil, fmt.Errorf("BUG: failed to get block %s with our own key delegation: %w", cc, err)
	}

	ch, err := vcs.DecodeChange(blk.RawData())
	if err != nil {
		return nil, fmt.Errorf("BUG: failed to decode our own delegation change %s: %w", cc, err)
	}

	pubKeyRaw, err := n.me.Account().MarshalBinary()
	if err != nil {
		panic(err)
	}

	hinfo := &p2p.HandshakeInfo{
		AccountPublicKey:   pubKeyRaw,
		AccountDeviceProof: ch.Body,
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
