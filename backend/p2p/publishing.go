package p2p

import (
	"context"
	"fmt"

	"mintter/backend/ipldutil"
	"mintter/backend/publishing"

	"github.com/ipfs/go-cid"
	format "github.com/ipfs/go-ipld-format"
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

	if err := n.store.AddPublication(pub.DocumentID, node.Cid()); err != nil {
		return cid.Undef, fmt.Errorf("failed to add publication to store: %w", err)
	}

	return node.Cid(), nil
}

// GetSections from the IPLD service.
func (n *Node) GetSections(ctx context.Context, cids ...cid.Cid) ([]publishing.Section, error) {
	out := make([]publishing.Section, 0, len(cids))

	for item := range n.dag.GetMany(ctx, cids) {
		if item.Err != nil {
			return nil, fmt.Errorf("failed to get block: %w", item.Err)
		}

		var v publishing.Section
		if err := ipldutil.UnmarshalSigned(item.Node.RawData(), &v, n.acc.PubKey); err != nil {
			return nil, fmt.Errorf("failed to verify section signature: %w", err)
		}

		out = append(out, v)
	}

	return out, nil
}

// GetPublication from the IPLD service.
func (n *Node) GetPublication(ctx context.Context, cid cid.Cid) (publishing.Publication, error) {
	node, err := n.dag.Get(ctx, cid)
	if err != nil {
		return publishing.Publication{}, fmt.Errorf("failed to get IPLD node: %w", err)
	}

	var p publishing.Publication
	if err := ipldutil.UnmarshalSigned(node.RawData(), &p, n.acc.PubKey); err != nil {
		return publishing.Publication{}, err
	}

	return p, nil
}
