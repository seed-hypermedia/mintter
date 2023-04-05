package documents

import (
	"fmt"
	"mintter/backend/crdt"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"sort"
	"time"

	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type docState struct {
	id         cid.Cid
	author     cid.Cid
	createTime time.Time
	maxClock   hlc.Time
	tree       *crdt.Tree
	applied    map[cid.Cid]*docChange
	parents    map[cid.Cid]struct{} // applied-parents=heads
	title      map[cid.Cid]string
	subtitle   map[cid.Cid]string
	blocks     map[string]map[cid.Cid]*documents.Block
}

func newDocState(id, author cid.Cid, createTime time.Time) *docState {
	return &docState{
		id:         id,
		author:     author,
		createTime: createTime,
		tree:       crdt.NewTree(crdt.NewVectorClock()),
		applied:    make(map[cid.Cid]*docChange),
		parents:    make(map[cid.Cid]struct{}),
		title:      make(map[cid.Cid]string),
		subtitle:   make(map[cid.Cid]string),
		blocks:     make(map[string]map[cid.Cid]*documents.Block),
	}
}

type docChange struct {
	vc    vcs.VerifiedChange
	patch *documents.UpdateDraftRequestV2
}

func (ds *docState) applyChange(vc vcs.VerifiedChange) error {
	if vc.Decoded.Time.Before(ds.maxClock) {
		return fmt.Errorf("failed to apply change %s: out of order", vc.Cid())
	}

	for _, dep := range vc.Decoded.Parents {
		ds.parents[dep] = struct{}{}
	}

	patch := &documents.UpdateDraftRequestV2{}
	if err := proto.Unmarshal(vc.Decoded.Body, patch); err != nil {
		return fmt.Errorf("failed to decode document patch body %s: %w", vc.Cid(), err)
	}

	dc := &docChange{vc: vc, patch: patch}

	site := vc.Cid().KeyString()
	for _, cc := range patch.Changes {
		switch op := cc.Op.(type) {
		case *documents.DocumentChange_SetTitle:
			ds.title[vc.Cid()] = op.SetTitle
		case *documents.DocumentChange_SetSubtitle:
			ds.subtitle[vc.Cid()] = op.SetSubtitle
		case *documents.DocumentChange_MoveBlock_:

			if err := ds.tree.SetNodePosition(site, op.MoveBlock.BlockId, op.MoveBlock.Parent, op.MoveBlock.LeftSibling); err != nil {
				return fmt.Errorf("failed to apply move operation: %w", err)
			}
		case *documents.DocumentChange_DeleteBlock:
			if err := ds.tree.DeleteNode(site, op.DeleteBlock); err != nil {
				return fmt.Errorf("failed to delete block %s: %w", op.DeleteBlock, err)
			}
		case *documents.DocumentChange_ReplaceBlock:
			if ds.blocks[op.ReplaceBlock.Id] == nil {
				ds.blocks[op.ReplaceBlock.Id] = make(map[cid.Cid]*documents.Block)
			}
			op.ReplaceBlock.Revision = vc.Cid().String()
			ds.blocks[op.ReplaceBlock.Id][vc.Cid()] = op.ReplaceBlock
		default:
			panic("BUG: unhandled document change")
		}
	}

	ds.maxClock = vc.Decoded.Time
	ds.applied[vc.Cid()] = dc
	return nil
}

func (ds *docState) version() string {
	var heads []cid.Cid
	for a := range ds.applied {
		_, ok := ds.parents[a]
		if ok {
			continue
		}
		heads = append(heads, a)
	}
	sort.Slice(heads, func(i, j int) bool {
		return heads[i].KeyString() < heads[j].KeyString()
	})

	return vcs.NewVersion(heads...).String()
}

func (ds *docState) hydrate() *documents.Document {
	it := ds.tree.Iterator()

	docpb := &documents.Document{
		Id:         ds.id.String(),
		Title:      ds.getTitle(),
		Subtitle:   ds.getSubtitle(),
		Author:     ds.author.String(),
		CreateTime: timestamppb.New(ds.createTime),
		UpdateTime: timestamppb.New(ds.maxClock.Time()),
	}

	blockMap := map[string]*documents.BlockNode{}

	appendChild := func(parent string, child *documents.BlockNode) {
		if parent == crdt.RootNodeID {
			docpb.Children = append(docpb.Children, child)
			return
		}

		blk, ok := blockMap[parent]
		if !ok {
			panic("BUG: no parent " + parent + " was found yet while iterating")
		}

		blk.Children = append(blk.Children, child)
	}

	for n := it.NextItem(); !n.IsZero(); n = it.NextItem() {
		blk := ds.getBlock(n.NodeID)
		child := &documents.BlockNode{Block: blk}
		appendChild(n.Parent, child)
		blockMap[n.NodeID] = child
	}

	return docpb
}

func (ds *docState) getTitle() string {
	var lww crdt.LWW[string]
	for c, str := range ds.title {
		lww.Set(c.KeyString(), ds.applied[c].vc.Decoded.Time.Pack(), str)
	}
	return lww.Value
}

func (ds *docState) getSubtitle() string {
	var lww crdt.LWW[string]
	for c, str := range ds.subtitle {
		lww.Set(c.KeyString(), ds.applied[c].vc.Decoded.Time.Pack(), str)
	}
	return lww.Value
}

func (ds *docState) getBlock(id string) *documents.Block {
	revs, ok := ds.blocks[id]
	if !ok {
		panic("BUG: can't find block " + id)
	}

	var lww crdt.LWW[*documents.Block]
	for c, blk := range revs {
		lww.Set(c.KeyString(), ds.applied[c].vc.Decoded.Time.Pack(), blk)
	}

	return lww.Value
}
