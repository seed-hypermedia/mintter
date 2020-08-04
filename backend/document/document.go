// Package document provides functionality for dealing with Mintter documents.
package document

import (
	"context"
	"fmt"
	"sync"

	"mintter/backend/identity"
	"mintter/backend/ipfsutil"
	"mintter/backend/ipldutil"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"github.com/rs/xid"
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
	bs        blockstore.Blockstore
	revstore  docRevStore
	profstore profileStore
}

// TODO wire in key store and document store.

type docRevStore interface {
	Get(string) ([]cid.Cid, error)
	Store(string, []cid.Cid) error
}

type profileStore interface {
	GetProfile(context.Context, identity.ProfileID) (identity.Profile, error)
	CurrentProfile(context.Context) (identity.Profile, error)
}

type inmemRevStore struct {
	m sync.Map
}

func (s *inmemRevStore) Get(docID string) ([]cid.Cid, error) {
	v, ok := s.m.Load(docID)
	if !ok {
		return nil, datastore.ErrNotFound
	}

	return v.([]cid.Cid), nil
}

func (s *inmemRevStore) Store(docID string, revs []cid.Cid) error {
	s.m.Store(docID, revs)
	return nil
}

// NewService creates a new document service.
func NewService(bs blockstore.Blockstore, profstore profileStore, revstore docRevStore) *Service {
	return &Service{
		bs:        bs,
		revstore:  revstore,
		profstore: profstore,
	}
}

// PublishDocument on the P2P network.
func (svc *Service) PublishDocument(ctx context.Context, d *State) (cid.Cid, error) {
	revs, err := svc.revstore.Get(d.ID)
	if err != nil && err != datastore.ErrNotFound {
		return cid.Undef, err
	}

	var cur State

	for _, rev := range revs {
		var set opSet

		if err := ipldutil.GetSignedRecord(ctx, ipfsutil.BlockGetterFromBlockStore(svc.bs), svc.profstore, rev, &set); err != nil {
			return cid.Undef, err
		}

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

	headcid, err := ipldutil.PutSignedRecord(ctx, svc.bs, svc.profstore, head)
	if err != nil {
		return cid.Undef, err
	}

	revs = append(revs, headcid)
	if err := svc.revstore.Store(d.ID, revs); err != nil {
		return cid.Undef, fmt.Errorf("failed to store revisions for document %s: %w", d.ID, err)
	}

	return headcid, nil
}

// GetDocument from local storage or P2P network.
func (svc *Service) GetDocument(ctx context.Context, id cid.Cid) (*State, error) {
	var nodes []opSet

	next := id
	for next.Defined() {
		var set opSet
		if err := ipldutil.GetSignedRecord(ctx, ipfsutil.BlockGetterFromBlockStore(svc.bs), svc.profstore, next, &set); err != nil {
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
