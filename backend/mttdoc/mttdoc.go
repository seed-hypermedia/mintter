// Package mttdoc provides a model for the Mintter Document.
package mttdoc

import (
	"bytes"
	"fmt"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs/crdt"
	"mintter/backend/vcs/vcsdb"
	"sort"
)

// Attributes for document-related datoms.
const (
	AttrTitle    vcsdb.Attribute = "mintter.document/title"
	AttrSubtitle vcsdb.Attribute = "mintter.document/subtitle"
	AttrMove     vcsdb.Attribute = "mintter.document/move"

	AttrBlockState vcsdb.Attribute = "mintter.document/block-snapshot"

	AttrPosBlock  vcsdb.Attribute = "mintter.document.position/block"
	AttrPosParent vcsdb.Attribute = "mintter.document.position/parent"
	AttrPosLeft   vcsdb.Attribute = "mintter.document.position/left"
)

// Document is an instance of a Mintter Document.
type Document struct {
	datomFn vcsdb.DatomFactory

	title    *crdt.LWW[vcsdb.Datom]
	subtitle *crdt.LWW[vcsdb.Datom]

	blocks map[vcsdb.NodeID]*crdt.LWW[vcsdb.Datom]

	blockPos map[vcsdb.NodeID]*crdt.ListElement[BlockPosition] // block-id => current position
	children map[vcsdb.NodeID]*crdt.RGA[BlockPosition]         // parent => children

	dirtyDatoms   []vcsdb.Datom
	deletedDatoms map[vcsdb.OpID]struct{}
	lastOp        vcsdb.OpID
	err           error
}

// New creates a new Document.
func New(newDatom vcsdb.DatomFactory) *Document {
	doc := &Document{
		datomFn: newDatom,

		title:    crdt.NewLWW[vcsdb.Datom](lessComparator),
		subtitle: crdt.NewLWW[vcsdb.Datom](lessComparator),

		blocks: make(map[vcsdb.NodeID]*crdt.LWW[vcsdb.Datom]),

		blockPos: make(map[vcsdb.NodeID]*crdt.ListElement[BlockPosition]),
		children: make(map[vcsdb.NodeID]*crdt.RGA[BlockPosition]),

		deletedDatoms: make(map[vcsdb.OpID]struct{}),
	}
	doc.children[vcsdb.RootNode] = crdt.NewRGA[BlockPosition](lessComparator)
	doc.children[vcsdb.TrashNode] = crdt.NewRGA[BlockPosition](lessComparator)
	return doc
}

// Replay existing sorted datoms to restore the state of the document.
func (doc *Document) Replay(in []vcsdb.Datom) error {
	if !doc.lastOp.IsZero() {
		return fmt.Errorf("document must be empty to replay existing state")
	}

	var m moves
	for _, d := range in {
		switch d.Attr {
		case AttrTitle:
			doc.title.Set(d.OpID, d)
		case AttrSubtitle:
			doc.subtitle.Set(d.OpID, d)
		case AttrBlockState:
			lww := doc.blocks[d.Entity]
			if lww == nil {
				lww = crdt.NewLWW[vcsdb.Datom](lessComparator)
				doc.blocks[d.Entity] = lww
			}
			lww.Set(d.OpID, d)
		}

		m.handle(d)
	}

	moveLog := m.Log()

	for _, move := range moveLog {
		if _, err := doc.integrateMove(move.Op, move.Block, move.Parent, move.ID, move.Ref); err != nil {
			return err
		}
	}

	return nil
}

func (doc *Document) integrateMove(id vcsdb.OpID, block, parent, posID vcsdb.NodeID, refID vcsdb.OpID) (moved bool, err error) {
	if doc.err != nil {
		return false, doc.err
	}

	if block.IsReserved() {
		return false, fmt.Errorf("can't move reserved nodes")
	}

	if block == parent {
		return false, fmt.Errorf("can't move block under itself")
	}

	l := doc.getChildren(parent)
	el, err := l.GetElement(refID)
	if err != nil {
		return false, err
	}

	// Don't do anything if block is already where we want.
	curPos := doc.blockPos[block]
	if curPos != nil && curPos.Value().Parent == parent {
		prevLive := curPos.PrevAlive()
		if prevLive == el || prevLive == nil && el.ID().IsZero() {
			return false, nil
		}
	}

	// We can safely update clock here, because we've checked all the invariants up to this point.
	// Although we still have to make the ancestorship check, these invalid moves would still
	// allocate a position, but won't perform the actual move.
	if err := doc.track(id); err != nil {
		return false, err
	}

	newEl, err := l.InsertAfter(id, el, BlockPosition{
		ID:     posID,
		Block:  block,
		Parent: parent,
	})
	if err != nil {
		return false, err
	}

	moved = doc.doMove(block, newEl)

	return moved, nil
}

func (doc *Document) doMove(blk vcsdb.NodeID, li *crdt.ListElement[BlockPosition]) (moved bool) {
	if doc.isAncestor(blk, li.Value().Parent) {
		return false
	}

	if curPos, ok := doc.blockPos[blk]; ok {
		curPos.MarkDeleted()
	}
	doc.blockPos[blk] = li

	return true
}

func (doc *Document) track(op vcsdb.OpID) error {
	if !lessComparator(doc.lastOp, op) {
		return fmt.Errorf("tracking out of date op")
	}

	doc.lastOp = op
	return nil
}

type moves struct {
	Blocks map[vcsdb.NodeID]struct{}

	Moves map[vcsdb.NodeID]map[vcsdb.Attribute]vcsdb.Datom // moveNode => related datoms
}

func (m *moves) Log() []moveOp {
	out := make([]moveOp, 0, len(m.Moves))

	for nid, datoms := range m.Moves {
		if len(datoms) != 4 {
			panic("BUG: incomplete move operation")
		}
		var move moveOp
		move.ID = nid
		move.Block = datoms[AttrPosBlock].Value.(vcsdb.NodeID)
		move.Parent = datoms[AttrPosParent].Value.(vcsdb.NodeID)
		move.Left = datoms[AttrPosLeft].Value.(vcsdb.NodeID)
		move.Op = datoms[AttrPosLeft].OpID

		if leftMove := m.Moves[move.Left]; leftMove != nil {
			move.Ref = leftMove[AttrPosLeft].OpID
		} else {
			if _, ok := m.Blocks[move.Left]; ok {
				move.Ref = crdt.ListStart
			} else {
				panic("BUG: left datom doesn't point to MOVE or BLOCK")
			}
		}

		out = append(out, move)
	}

	sort.Slice(out, func(i, j int) bool {
		return lessComparator(out[i].Op, out[j].Op)
	})

	return out
}

var moveAttrs = map[vcsdb.Attribute]struct{}{
	AttrMove:      {},
	AttrPosBlock:  {},
	AttrPosParent: {},
	AttrPosLeft:   {},
}

func (m *moves) handle(d vcsdb.Datom) {
	if m.Blocks == nil {
		m.Blocks = make(map[vcsdb.NodeID]struct{})
		m.Blocks[vcsdb.RootNode] = struct{}{}
		m.Blocks[vcsdb.TrashNode] = struct{}{}
	}

	if m.Moves == nil {
		m.Moves = make(map[vcsdb.NodeID]map[vcsdb.Attribute]vcsdb.Datom)
	}

	if _, ok := moveAttrs[d.Attr]; !ok {
		return
	}

	var nid vcsdb.NodeID
	if d.Attr == AttrMove {
		nid = d.Value.(vcsdb.NodeID)
	} else {
		nid = d.Entity
	}

	if d.Attr == AttrPosBlock {
		m.Blocks[d.Value.(vcsdb.NodeID)] = struct{}{}
	}

	if m.Moves[nid] == nil {
		m.Moves[nid] = make(map[vcsdb.Attribute]vcsdb.Datom, 4)
	}

	m.Moves[nid][d.Attr] = d
}

type moveOp struct {
	ID     vcsdb.NodeID // ID of the position node.
	Op     vcsdb.OpID   // OpID of the "left" datom.
	Block  vcsdb.NodeID // Block to move.
	Parent vcsdb.NodeID // New parent.
	Left   vcsdb.NodeID // Left position node. If same as parent, means beginning of the list.
	Ref    vcsdb.OpID   // OpID of the previous move op.
}

// EnsureBlockState ensures block is at the current state.
// We're storing blocks as opaque bytes for now.
//
// TODO(burdiyan): implement block identity based on text.
func (doc *Document) EnsureBlockState(blk string, state []byte) {
	must.Maybe(&doc.err, func() error {
		nid := vcsdb.NodeIDFromString(blk)

		lww := doc.blocks[nid]
		if lww == nil {
			lww = crdt.NewLWW[vcsdb.Datom](lessComparator)
			doc.blocks[nid] = lww
		}

		oldDatom := lww.Value()
		var old []byte
		if v := oldDatom.Value; v != nil {
			old = v.([]byte)
		}

		if !oldDatom.IsZero() && bytes.Equal(old, state) {
			return nil
		}

		d := doc.newDatom(nid, AttrBlockState, state)
		doc.dirtyDatoms = append(doc.dirtyDatoms, d)
		lww.Set(d.OpID, d)

		if oldDatom.Change == d.Change {
			doc.deletedDatoms[oldDatom.OpID] = struct{}{}
		}

		return doc.track(d.OpID)
	})
}

// BlockState returns the current block content.
func (doc *Document) BlockState(block vcsdb.NodeID) (data []byte, ok bool) {
	lww := doc.blocks[block]
	if lww == nil {
		return nil, false
	}

	d := lww.Value()
	if d.OpID.IsZero() {
		return nil, false
	}

	return d.Value.([]byte), true
}

// EnsureTitle will change document title if it's different.
func (doc *Document) EnsureTitle(s string) {
	must.Maybe(&doc.err, func() error {
		oldDatom := doc.title.Value()
		var old string
		if v := oldDatom.Value; v != nil {
			old = v.(string)
		}

		if !oldDatom.OpID.IsZero() && old == s {
			return nil
		}

		d := doc.newDatom(vcsdb.RootNode, AttrTitle, s)
		doc.dirtyDatoms = append(doc.dirtyDatoms, d)
		doc.title.Set(d.OpID, d)

		if oldDatom.Change == d.Change {
			doc.deletedDatoms[oldDatom.OpID] = struct{}{}
		}

		return doc.track(d.OpID)
	})
}

// Title returns current document title.
func (doc *Document) Title() string {
	d := doc.title.Value()
	if d.OpID.IsZero() {
		return ""
	}

	return d.Value.(string)
}

// Subtitle returns current document subtitle.
func (doc *Document) Subtitle() string {
	d := doc.subtitle.Value()
	if d.OpID.IsZero() {
		return ""
	}

	return d.Value.(string)
}

// EnsureSubtitle will change the document subtitle if it's different than current.
func (doc *Document) EnsureSubtitle(s string) {
	must.Maybe(&doc.err, func() error {
		oldDatom := doc.subtitle.Value()
		var old string
		if v := oldDatom.Value; v != nil {
			old = v.(string)
		}

		if !oldDatom.OpID.IsZero() && old == s {
			return nil
		}

		d := doc.newDatom(vcsdb.RootNode, AttrSubtitle, s)
		doc.dirtyDatoms = append(doc.dirtyDatoms, d)
		doc.subtitle.Set(d.OpID, d)

		if oldDatom.Change == d.Change {
			doc.deletedDatoms[oldDatom.OpID] = struct{}{}
		}

		return doc.track(d.OpID)
	})
}

// MoveBlock moves block under a given parent into a position next to the given left block
// within the same parent's list of children.
// Parent ID can be empty - means the top-level (root) list of the document.
// Left ID can also be empty which means beginning of the parent's list of children.
func (doc *Document) MoveBlock(blockID, parentID, leftID string) (moved bool) {
	must.Maybe(&doc.err, func() error {
		ok, err := doc.moveBlock(blockID, parentID, leftID)
		moved = ok
		return err
	})
	return moved
}

// DeleteBlock from the document hierarchy.
func (doc *Document) DeleteBlock(blockID string) (deleted bool) {
	return doc.MoveBlock(blockID, "$TRASH", "")
}

func (doc *Document) moveBlock(blockID, parentID, leftID string) (moved bool, err error) {
	block := vcsdb.NodeIDFromString(blockID)

	parent := vcsdb.RootNode
	if parentID != "" {
		parent = vcsdb.NodeIDFromString(parentID)
	}

	if doc.isAncestor(block, parent) {
		return false, fmt.Errorf("can't move: %s is ancestor of %s", block, parent)
	}

	refID := crdt.ListStart
	leftPosNode := parent
	if leftID != "" {
		el := doc.blockPos[vcsdb.NodeIDFromString(leftID)]
		if el == nil {
			return false, fmt.Errorf("left block %s is not in the document", leftID)
		}
		refID = el.ID()
		leftPosNode = el.Value().ID
	}

	posNode := vcsdb.NewNodeID()
	d1 := doc.newDatom(vcsdb.RootNode, AttrMove, posNode)
	d2 := doc.newDatom(posNode, AttrPosBlock, block)
	d3 := doc.newDatom(posNode, AttrPosParent, parent)
	d4 := doc.newDatom(posNode, AttrPosLeft, leftPosNode)

	moved, err = doc.integrateMove(d4.OpID, block, parent, posNode, refID)
	if moved && err == nil {
		doc.dirtyDatoms = append(doc.dirtyDatoms, d1, d2, d3, d4)
	}

	return moved, err
}

// DeletedDatoms returns the set of datoms to be deleted
func (doc *Document) DeletedDatoms() map[vcsdb.OpID]struct{} {
	return doc.deletedDatoms
}

// DirtyDatoms returns the list of datoms to be inserted into the database.
func (doc *Document) DirtyDatoms() []vcsdb.Datom {
	return doc.dirtyDatoms
}

// Err returns the underlying document error.
func (doc *Document) Err() error {
	return doc.err
}

func (doc *Document) getChildren(parent vcsdb.NodeID) *crdt.RGA[BlockPosition] {
	l := doc.children[parent]
	if l == nil {
		l = crdt.NewRGA[BlockPosition](lessComparator)
		doc.children[parent] = l
	}
	return l
}

func (doc *Document) isAncestor(a, b vcsdb.NodeID) bool {
	// check if a is ancestor of b transitively.
	cur := b

	for {
		pos, ok := doc.blockPos[cur]
		if !ok {
			return false
		}

		parent := pos.Value().Parent
		if parent == a {
			return true
		}
		cur = parent
	}
}

func (doc *Document) newDatom(e vcsdb.NodeID, a vcsdb.Attribute, v any) (d vcsdb.Datom) {
	must.Maybe(&doc.err, func() error {
		d = doc.datomFn(e, a, v)
		return nil
	})

	return d
}

func lessComparator(i, j vcsdb.OpID) bool {
	return vcsdb.BasicOpCompare(i, j) == -1
}

// BlockPosition is an instance of a block at some position
// within the hierarchy of content blocks.
type BlockPosition struct {
	// ID of the position node itself.
	ID vcsdb.NodeID
	// Parent block ID where this position lives.
	Parent vcsdb.NodeID
	// Block is a content block that's supposed to be at this position.
	// When blocks are moved their position are still there,
	// although their RGA list elements are marked as deleted.
	Block vcsdb.NodeID
}

func movesFromDatoms(in []vcsdb.Datom) []moveOp {
	var m moves
	for _, d := range in {
		m.handle(d)
	}

	return m.Log()
}
