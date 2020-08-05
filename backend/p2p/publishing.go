package p2p

import (
	"context"
	"fmt"

	"mintter/backend/identity"
	"mintter/backend/ipfsutil"
	"mintter/backend/ipldutil"
	"mintter/backend/p2p/internal"
	"mintter/backend/publishing"

	"github.com/ipfs/go-cid"
	"go.uber.org/zap"

	blocks "github.com/ipfs/go-block-format"
)

// AddSections to the IPLD service.
func (n *Node) AddSections(ctx context.Context, sects ...publishing.Section) ([]cid.Cid, error) {
	cids := make([]cid.Cid, len(sects))
	blks := make([]blocks.Block, len(sects))

	for i, s := range sects {
		if s.Author != n.acc.ID.String() {
			return nil, fmt.Errorf("can't add sections from other authors (%s)", s.Author)
		}

		blk, err := ipldutil.CreateSignedBlock(ctx, n.store, s)
		if err != nil {
			return nil, fmt.Errorf("failed to create block for section %d: %w", i, err)
		}

		cids[i] = blk.Cid()
		blks[i] = blk
	}

	if err := n.ipfs.BlockStore().PutMany(blks); err != nil {
		return nil, fmt.Errorf("failed to put blocks: %w", err)
	}

	return cids, nil
}

// AddPublication to the IPLD service and store an internal reference to it.
func (n *Node) AddPublication(ctx context.Context, pub publishing.Publication) (cid.Cid, error) {
	if pub.Author != n.acc.ID.String() {
		return cid.Undef, fmt.Errorf("can't add publication from other authors (%s)", pub.Author)
	}

	blk, err := ipldutil.CreateSignedBlock(ctx, n.store, pub)
	if err != nil {
		return cid.Undef, fmt.Errorf("failed to create publication block: %w", err)
	}

	if err := n.ipfs.BlockStore().Put(blk); err != nil {
		return cid.Undef, fmt.Errorf("failed to put publication into block store: %w", err)
	}

	if err := n.store.AddPublication(pub.Author, pub.DocumentID, blk.Cid()); err != nil {
		return cid.Undef, fmt.Errorf("failed to add publication to store: %w", err)
	}

	if err := n.pubsub.Publish(pub.Author, blk.Cid().Bytes()); err != nil {
		n.log.Error("FailedToPublishOverPubSub", zap.Error(err), zap.String("cid", blk.Cid().String()))
	}

	return blk.Cid(), nil
}

// GetSections from the IPLD service.
func (n *Node) GetSections(ctx context.Context, cids ...cid.Cid) ([]publishing.Section, error) {
	out := make([]publishing.Section, len(cids))

	for i, cid := range cids {
		blk, err := n.ipfs.BlockStore().Get(cid)
		if err != nil {
			return nil, fmt.Errorf("failed to get section: %d: %w", i, err)
		}

		if err := ipldutil.ReadSignedBlock(ctx, n.store, blk, &out[i]); err != nil {
			return nil, fmt.Errorf("failed to read signed section %d: %w", i, err)
		}
	}

	return out, nil
}

// GetPublication from the IPLD service.
func (n *Node) GetPublication(ctx context.Context, cid cid.Cid) (publishing.Publication, error) {
	return n.getPublication(ctx, cid, n.ipfs.BlockStore().BlockGetter())
}

func (n *Node) getPublication(ctx context.Context, cid cid.Cid, getter ipfsutil.BlockGetter) (publishing.Publication, error) {
	local, err := n.ipfs.BlockStore().Has(cid)
	if err != nil {
		return publishing.Publication{}, err
	}

	blk, err := getter.GetBlock(ctx, cid)
	if err != nil {
		return publishing.Publication{}, err
	}

	var p publishing.Publication
	if err := ipldutil.ReadSignedBlock(ctx, n.store, blk, &p); err != nil {
		return publishing.Publication{}, err
	}

	// If we ended up fetching a remote block from IPFS we have to
	// create a local reference between document ID and publication CID.
	if !local {
		if err := n.store.AddPublication(p.Author, p.DocumentID, cid); err != nil {
			return publishing.Publication{}, fmt.Errorf("can't store doc-cid reference: %w", err)
		}
	}

	return p, nil
}

// SyncPublications will load and try to fetch all publications from a given peer.
func (n *Node) SyncPublications(ctx context.Context, pid identity.ProfileID) error {
	conn, err := n.dialProfile(ctx, pid)
	if err != nil {
		return err
	}
	defer logClose(n.log, conn.Close, "failed closing grpc connection syncing publications")

	resp, err := internal.NewPeerServiceClient(conn).ListPublications(ctx, &internal.ListPublicationsRequest{})
	if err != nil {
		return err
	}

	for _, id := range resp.PublicationIds {
		cid, err := cid.Decode(id)
		if err == nil {
			err = n.syncPublication(ctx, cid)
		}

		if err != nil {
			n.log.Error("FailedToSyncPublication",
				zap.String("cid", id),
				zap.String("remotePeer", pid.String()),
			)
			continue
		}
	}

	return nil
}

func (n *Node) syncPublication(ctx context.Context, cid cid.Cid) error {
	ok, err := n.ipfs.BlockStore().Has(cid)
	if err != nil {
		return err
	}

	if ok {
		return nil
	}

	sess := n.ipfs.BlockStore().Session(ctx)

	pub, err := n.getPublication(ctx, cid, sess)
	if err != nil {
		return fmt.Errorf("GetPublication: %w", err)
	}

	for range sess.GetBlocks(ctx, pub.Sections) {
		// Drain the channel so it doesn't block.
	}

	return nil
}

// ListPublications implements Mintter protocol.
func (n *rpcHandler) ListPublications(ctx context.Context, in *internal.ListPublicationsRequest) (*internal.ListPublicationsResponse, error) {
	cids, err := n.store.ListPublications(n.acc.ID.String(), 0, 0)
	if err != nil {
		return nil, err
	}

	resp := &internal.ListPublicationsResponse{
		PublicationIds: make([]string, len(cids)),
	}

	for i, cid := range cids {
		resp.PublicationIds[i] = cid.String()
	}

	return resp, nil
}
