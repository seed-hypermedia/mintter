// Package mttdoc provides a model for retrieving and manipulating the Mintter Document Objects.
package mttdoc

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"mintter/backend/vcs/crdt"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"sort"
	"time"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

const DocumentType vcs.ObjectType = "https://schema.mintter.org/Document"

func init() {
	cbornode.RegisterCborType(DocumentPermanode{})
}

type DocumentPermanode struct {
	vcs.BasePermanode

	Nonce []byte
}

func NewDocumentPermanode(owner cid.Cid) DocumentPermanode {
	p := DocumentPermanode{
		BasePermanode: vcs.BasePermanode{
			Type:       DocumentType,
			Owner:      owner,
			CreateTime: time.Now().UTC().Round(time.Second),
		},
		Nonce: make([]byte, 8),
	}

	_, err := rand.Read(p.Nonce)
	if err != nil {
		panic("can't read random data")
	}

	return p
}

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
	title    *crdt.LWW[vcsdb.Datom]
	subtitle *crdt.LWW[vcsdb.Datom]
	blocks   map[vcsdb.NodeID]*crdt.LWW[vcsdb.Datom]
	tree     *blockTree
	dw       *vcsdb.DatomWriter
	tracker  *crdt.OpTracker
	err      error
}

// New creates a new Document.
func New(dw *vcsdb.DatomWriter) *Document {
	ot := crdt.NewOpTracker(lessComparator)

	return &Document{
		title:    crdt.NewLWW[vcsdb.Datom](lessComparator),
		subtitle: crdt.NewLWW[vcsdb.Datom](lessComparator),
		blocks:   make(map[vcsdb.NodeID]*crdt.LWW[vcsdb.Datom]),
		tree:     newBlockTree(ot, dw),
		dw:       dw,
		tracker:  ot,
	}
}

// Replay existing sorted datoms to restore the state of the document.
func (doc *Document) Replay(in []vcsdb.Datom) error {
	if !doc.tracker.IsZero() {
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
		if _, err := doc.tree.integrateMove(move.Op, move.Block, move.Parent, move.ID, move.Ref); err != nil {
			return err
		}
	}

	return nil
}

// Iterator creates a new document iterator to walk the document
// hierarchy of content blocks in depth-first order.
func (doc *Document) Iterator() *Iterator {
	return doc.tree.Iterator()
}

func (doc *Document) track(op vcsdb.OpID) error {
	return doc.tracker.Track(op)
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
		m.Blocks[vcs.RootNode] = struct{}{}
		m.Blocks[vcs.TrashNode] = struct{}{}
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
		nid := vcs.NodeIDFromString(blk)

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

		d := doc.dw.NewAndAdd(nid, AttrBlockState, state)
		lww.Set(d.OpID, d)

		if oldDatom.Change == d.Change {
			doc.dw.DeleteDatom(oldDatom.OpID)
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

		d := doc.dw.NewAndAdd(vcs.RootNode, AttrTitle, s)
		doc.title.Set(d.OpID, d)

		if oldDatom.Change == d.Change {
			doc.dw.DeleteDatom(oldDatom.OpID)
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

		d := doc.dw.NewAndAdd(vcs.RootNode, AttrSubtitle, s)
		doc.subtitle.Set(d.OpID, d)

		if oldDatom.Change == d.Change {
			doc.dw.DeleteDatom(oldDatom.OpID)
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
		block := vcs.NodeIDFromString(blockID)
		parent := vcs.RootNode
		if parentID != "" {
			parent = vcs.NodeIDFromString(parentID)
		}
		var left vcs.NodeID
		if leftID != "" {
			left = vcs.NodeIDFromString(leftID)
		}

		ok, err := doc.tree.MoveBlock(block, parent, left)
		moved = ok

		return err
	})
	return moved
}

// DeleteBlock from the document hierarchy.
func (doc *Document) DeleteBlock(blockID string) (deleted bool) {
	return doc.MoveBlock(blockID, "$TRASH", "")
}

// DeletedDatoms returns the set of datoms to be deleted.
func (doc *Document) DeletedDatoms() map[vcsdb.OpID]struct{} {
	return doc.dw.Deleted()
}

// DirtyDatoms returns the list of datoms to be inserted into the database.
func (doc *Document) DirtyDatoms() []vcsdb.Datom {
	return doc.dw.Dirty()
}

// Err returns the underlying document error.
func (doc *Document) Err() error {
	return doc.err
}

func lessComparator(i, j vcsdb.OpID) bool {
	return vcsdb.BasicOpCompare(i, j) == -1
}
