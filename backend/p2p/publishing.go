package p2p

import (
	"context"
	"errors"
	"fmt"

	"mintter/backend/identity"
	"mintter/backend/ipldutil"
	"mintter/backend/p2p/internal"
	"mintter/backend/publishing"

	"github.com/ipfs/go-cid"
	format "github.com/ipfs/go-ipld-format"
	"github.com/libp2p/go-libp2p-core/peer"
	"go.uber.org/zap"
)

// AddSections to the IPLD service.
func (n *Node) AddSections(ctx context.Context, sects ...publishing.Section) ([]cid.Cid, error) {
	cids := make([]cid.Cid, len(sects))
	nodes := make([]format.Node, len(sects))

	for i, s := range sects {
		if s.Author != n.acc.ID.String() {
			return nil, fmt.Errorf("can't add sections from other authors (%s)", s.Author)
		}

		node, err := ipldutil.MarshalSigned(s, n.acc.PrivKey)
		if err != nil {
			return nil, err
		}

		nodes[i] = node
		cids[i] = node.Cid()
	}

	if err := n.dag.AddMany(ctx, nodes); err != nil {
		return nil, fmt.Errorf("failed to add sections to IPLD service: %w", err)
	}

	return cids, nil
}

// AddPublication to the IPLD service and store an internal reference to it.
func (n *Node) AddPublication(ctx context.Context, pub publishing.Publication) (cid.Cid, error) {
	if pub.Author != n.acc.ID.String() {
		return cid.Undef, fmt.Errorf("can't add publication from other authors (%s)", pub.Author)
	}

	node, err := ipldutil.MarshalSigned(pub, n.acc.PrivKey)
	if err != nil {
		return cid.Undef, err
	}

	if err := n.dag.Add(ctx, node); err != nil {
		return cid.Undef, fmt.Errorf("failed to add publication to IPLD service: %w", err)
	}

	if err := n.store.AddPublication(pub.Author, pub.DocumentID, node.Cid()); err != nil {
		return cid.Undef, fmt.Errorf("failed to add publication to store: %w", err)
	}

	cid := node.Cid()

	if err := n.pubsub.Publish(pub.Author, cid.Bytes()); err != nil {
		n.log.Error("FailedToPublishOverPubSub", zap.Error(err), zap.String("cid", cid.String()))
	}

	return cid, nil
}

// GetSections from the IPLD service.
func (n *Node) GetSections(ctx context.Context, cids ...cid.Cid) ([]publishing.Section, error) {
	out := make([]publishing.Section, 0, len(cids))

	// To avoid calling database for each section to get the profile
	// we cache them locally. It's probably a good idea to have a global LRU cache or similar.
	cache := map[string]identity.Profile{}

	for item := range n.dag.GetMany(ctx, cids) {
		if item.Err != nil {
			return nil, fmt.Errorf("failed to get block: %w", item.Err)
		}

		var prof identity.Profile
		{
			var authorID string
			v, _, err := item.Node.Resolve([]string{"data", "author"})
			if err != nil {
				return nil, fmt.Errorf("failed to retrieve author's profile ID: %w", err)
			}

			authorID = v.(string)

			pid, err := identity.DecodeProfileID(authorID)
			if err != nil {
				return nil, fmt.Errorf("failed to decode profile ID: %w", err)
			}

			p, ok := cache[authorID]
			if !ok {
				p, err = n.store.GetProfile(ctx, pid)
				if err != nil {
					return nil, fmt.Errorf("failed to get profile %s: %w", pid, err)
				}
				cache[authorID] = p
			}

			prof = p
		}

		var v publishing.Section
		if err := ipldutil.UnmarshalSigned(item.Node.RawData(), &v, prof.Account.PubKey); err != nil {
			return nil, fmt.Errorf("failed to verify section signature: %w", err)
		}

		out = append(out, v)
	}

	return out, nil
}

// GetPublication from the IPLD service.
func (n *Node) GetPublication(ctx context.Context, cid cid.Cid) (publishing.Publication, error) {
	local, err := n.dag.BlockStore().Has(cid)
	if err != nil {
		return publishing.Publication{}, err
	}

	node, err := n.dag.Get(ctx, cid)
	if err != nil {
		return publishing.Publication{}, fmt.Errorf("failed to get IPLD node: %w", err)
	}

	// TODO(burdiyan): Should we verify signature here?

	var author identity.ProfileID
	{
		v, _, err := node.Resolve([]string{"data", "author"})
		if err != nil {
			return publishing.Publication{}, err
		}
		a := v.(string)
		if a == "" {
			return publishing.Publication{}, errors.New("missing author field for signed IPLD")
		}

		pid, err := peer.Decode(a)
		if err != nil {
			return publishing.Publication{}, err
		}

		author.ID = pid
	}

	prof, err := n.store.GetProfile(ctx, author)
	if err != nil {
		return publishing.Publication{}, err
	}

	var p publishing.Publication
	if err := ipldutil.UnmarshalSigned(node.RawData(), &p, prof.Account.PubKey); err != nil {
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
	ok, err := n.dag.BlockStore().Has(cid)
	if err != nil {
		return err
	}

	if ok {
		return nil
	}

	pub, err := n.GetPublication(ctx, cid)
	if err != nil {
		return fmt.Errorf("GetPublication: %w", err)
	}

	if _, err := n.GetSections(ctx, pub.Sections...); err != nil {
		return fmt.Errorf("GetSections: %w", err)
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
