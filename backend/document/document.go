// Package document provides functionality for dealing with Mintter documents.
package document

import (
	"context"
	"fmt"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multihash"
	"github.com/rs/xid"

	cbornode "github.com/ipfs/go-ipld-cbor"
	format "github.com/ipfs/go-ipld-format"
)

// State of a document.
type State struct {
	ID       string  `json:"id"`
	Author   string  `json:"author"`
	Title    string  `json:"title"`
	Subtitle string  `json:"subtitle,omitempty"`
	Blocks   []Block `json:"blocks"`
}

// New creates a new Mintter document.
func New(author string) *State {
	return &State{
		ID:     xid.New().String(),
		Author: author,
	}
}

// Block of content in a Mintter document.
type Block struct {
	// ID can be local ID or fully-qualified remote ID as `au`thor/document/block`. In this case no other attribute must be set.
	ID   string `json:"id"`
	Text string `json:"text,omitempty"`
}

// Service for storing and retrieving documents.
type Service struct {
	docs map[string][]cid.Cid
	dag  format.DAGService
}

// TODO wire in key store and document store.

// NewService creates a new document service.
func NewService(dag format.DAGService) *Service {
	return &Service{
		docs: make(map[string][]cid.Cid),
		dag:  dag,
	}
}

// PublishDocument on the P2P network.
func (svc *Service) PublishDocument(ctx context.Context, d *State) (cid.Cid, error) {
	revs := svc.docs[d.ID]

	var cur State

	for _, rev := range revs {
		node, err := svc.dag.Get(ctx, rev)
		if err != nil {
			return cid.Undef, err
		}

		var set opSet

		if err := cbornode.DecodeInto(node.RawData(), &set); err != nil {
			return cid.Undef, err
		}

		// TODO: verify signature

		if err := cur.apply(set.Operations); err != nil {
			return cid.Undef, err
		}
	}

	ops, err := cur.diff(*d)
	if err != nil {
		return cid.Undef, err
	}

	head := opSet{
		Operations: ops,
	}

	if len(revs) > 0 {
		head.Parent = revs[len(revs)-1]
	}

	node, err := cbornode.WrapObject(head, multihash.SHA2_256, -1)
	if err != nil {
		return cid.Undef, fmt.Errorf("can't marshal to cbor: %w", err)
	}

	if err := svc.dag.Add(ctx, node); err != nil {
		return cid.Undef, err
	}

	svc.docs[d.ID] = append(revs, node.Cid())

	return node.Cid(), nil
}

// GetDocument from local storage or P2P network.
func (svc *Service) GetDocument(ctx context.Context, id cid.Cid) (*State, error) {
	var nodes []opSet

	next := id
	for next.Defined() {
		node, err := svc.dag.Get(ctx, next)
		if err != nil {
			return nil, err
		}

		var set opSet
		if err := cbornode.DecodeInto(node.RawData(), &set); err != nil {
			return nil, err
		}

		nodes = append(nodes, set)
		next = set.Parent
	}

	var ops opList

	for i := len(nodes) - 1; i >= 0; i-- {
		ops.add(nodes[i].Operations...)
	}

	var d State
	if err := d.apply(ops.ops); err != nil {
		return nil, err
	}

	return &d, nil
}
