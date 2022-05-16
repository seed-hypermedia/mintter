package vcstypes

import (
	"crypto/rand"
	"fmt"
	"mintter/backend/crdt"
	"mintter/backend/vcs"
	"time"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

const DocumentType vcs.ObjectType = "https://schema.mintter.org/Document"

func init() {
	cbornode.RegisterCborType(DocumentPermanode{})
	cbornode.RegisterCborType(DocumentEvent{})
	cbornode.RegisterCborType(BlockMovedEvent{})
	cbornode.RegisterCborType(Block{})
	cbornode.RegisterCborType(Annotation{})
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

type Document struct {
	state  DocumentState
	events []DocumentEvent
}

func NewDocument(id, author cid.Cid, createTime time.Time) *Document {
	return &Document{
		state: NewDocumentState(id, author, createTime),
	}
}

func (d *Document) ChangeTitle(title string) {
	if d.state.Title == title {
		return
	}

	d.events = append(d.events, DocumentEvent{
		TitleChanged: title,
	})

	if err := d.state.apply(d.events[len(d.events)-1], time.Now().UTC().Round(time.Second)); err != nil {
		panic(err) // TODO: don't panic.
	}
}

func (d *Document) ChangeSubtitle(subtitle string) {
	if d.state.Subtitle == subtitle {
		return
	}

	d.events = append(d.events, DocumentEvent{
		SubtitleChanged: subtitle,
	})

	if err := d.state.apply(d.events[len(d.events)-1], time.Now().UTC().Round(time.Second)); err != nil {
		panic(err) // TODO: don't panic.
	}
}

func (d *Document) MoveBlock(blockID, parent, left string) error {
	if err := d.state.moveBlock(blockID, parent, left); err != nil {
		return err
	}

	d.events = append(d.events, DocumentEvent{
		// TODO: extract block move struct.
		BlockMoved: BlockMovedEvent{
			BlockID:     blockID,
			Parent:      parent,
			LeftSibling: left,
		},
	})

	return nil
}

func (d *Document) ReplaceBlock(blk Block) error {
	if err := d.state.replaceBlock(blk); err != nil {
		return err
	}

	d.events = append(d.events, DocumentEvent{BlockReplaced: blk})

	return nil
}

func (d *Document) DeleteBlock(blockID string) error {
	if err := d.state.deleteBlock(blockID); err != nil {
		return err
	}

	d.events = append(d.events, DocumentEvent{
		BlockDeleted: blockID,
	})

	return nil
}

func (d *Document) Events() []DocumentEvent {
	return d.events
}

func (d *Document) State() DocumentState { return d.state }

func (d *Document) Apply(evt DocumentEvent, updateTime time.Time) error {
	return d.state.apply(evt, updateTime)
}

type DocumentEvent struct {
	// One of.
	TitleChanged    string          `refmt:"titleChanged,omitempty"`
	SubtitleChanged string          `refmt:"subtitleChanged,omitempty"`
	BlockMoved      BlockMovedEvent `refmt:"blockMoved,omitempty"` // TODO: add refmt tags to omitempty fields.
	BlockReplaced   Block           `refmt:"blockReplaced,omitempty"`
	BlockDeleted    string          `refmt:"blockDeleted,omitempty"`
}

type BlockMovedEvent struct {
	BlockID     string `refmt:"blockID,omitempty"`
	Parent      string `refmt:"parent,omitempty"`
	LeftSibling string `refmt:"leftSibling,omitempty"`
}

type Block struct {
	ID          string            `refmt:"id,omitempty""`
	Type        string            `refmt:"type,omitempty"`
	Attributes  map[string]string `refmt:"attributes,omitempty"`
	Text        string            `refmt:"text,omitempty"`
	Annotations []Annotation      `refmt:"annotations,omitempty"`
}

type Annotation struct {
	Type       string            `refmt:"type,omitempty""`
	Attributes map[string]string `refmt:"attributes,omitempty"`
	Starts     []int32           `refmt:"starts,omitempty"`
	Ends       []int32           `refmt:"ends,omitempty"`
}

type DocumentState struct {
	ID         cid.Cid
	Author     cid.Cid
	CreateTime time.Time
	UpdateTime time.Time
	Title      string
	Subtitle   string
	Blocks     map[string]Block
	Tree       *crdt.Tree
}

func NewDocumentState(id, author cid.Cid, createTime time.Time) DocumentState {
	return DocumentState{
		ID:         id,
		Author:     author,
		CreateTime: createTime,
		Blocks:     make(map[string]Block),
		Tree:       crdt.NewTree(crdt.NewVectorClock()),
	}
}

func (ds *DocumentState) replaceBlock(blk Block) error {
	if blk.ID == "" {
		return fmt.Errorf("must specify block ID to replace")
	}

	if _, ok := ds.Blocks[blk.ID]; !ok {
		return fmt.Errorf("can't replace block %s: not found", blk.ID)
	}

	ds.Blocks[blk.ID] = blk

	return nil
}

func (ds *DocumentState) moveBlock(blockID, parent, left string) error {
	if parent == "" {
		parent = crdt.RootNodeID
	}

	if blockID == "" {
		return fmt.Errorf("blocks without ID are not allowed")
	}

	// TODO: avoid moving if the block is already where it should be.

	if err := ds.Tree.SetNodePosition(ds.Author.KeyString(), blockID, parent, left); err != nil {
		return err
	}

	if _, ok := ds.Blocks[blockID]; !ok {
		ds.Blocks[blockID] = Block{ID: blockID}
	}

	return nil
}

func (ds *DocumentState) deleteBlock(blockID string) error {
	if _, ok := ds.Blocks[blockID]; !ok {
		return fmt.Errorf("can't delete block %s: not found", blockID)
	}

	return ds.Tree.DeleteNode(ds.Author.KeyString(), blockID)
}

func (ds *DocumentState) apply(evt DocumentEvent, updateTime time.Time) error {
	switch {
	case evt.TitleChanged != "":
		ds.Title = evt.TitleChanged
	case evt.SubtitleChanged != "":
		ds.Subtitle = evt.SubtitleChanged
	case evt.BlockMoved.BlockID != "":
		if err := ds.moveBlock(evt.BlockMoved.BlockID, evt.BlockMoved.Parent, evt.BlockMoved.LeftSibling); err != nil {
			return err
		}
	case evt.BlockReplaced.ID != "":
		if err := ds.replaceBlock(evt.BlockReplaced); err != nil {
			return err
		}
	case evt.BlockDeleted != "":
		if err := ds.deleteBlock(evt.BlockDeleted); err != nil {
			return err
		}
	default:
		panic("BUG: unhandled document event")
	}

	ds.UpdateTime = updateTime

	return nil
}
