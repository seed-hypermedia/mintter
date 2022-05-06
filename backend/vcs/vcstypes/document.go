package vcstypes

import (
	"crypto/rand"
	"fmt"
	"mintter/backend/crdt"
	"time"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

const (
	DocumentType = "https://schema.mintter.org/Document"
)

func init() {
	cbornode.RegisterCborType(DocumentPermanode{})
	cbornode.RegisterCborType(DocumentEvent{})
	cbornode.RegisterCborType(BlockMovedEvent{})
	cbornode.RegisterCborType(Block{})
}

type DocumentPermanode struct {
	Type       string `refmt:"@type"`
	Owner      cid.Cid
	Nonce      []byte
	CreateTime time.Time
}

func (dp DocumentPermanode) PermanodeType() string {
	return dp.Type
}

func (dp DocumentPermanode) PermanodeCreateTime() time.Time {
	return dp.CreateTime
}

func (dp DocumentPermanode) PermanodeOwner() cid.Cid {
	return dp.Owner
}

func NewDocumentPermanode(owner cid.Cid) DocumentPermanode {
	p := DocumentPermanode{
		Type:       DocumentType,
		Owner:      owner,
		CreateTime: time.Now().UTC().Round(time.Second),
		Nonce:      make([]byte, 8),
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

	d.state.apply(d.events[len(d.events)-1], time.Now().UTC().Round(time.Second))
}

func (d *Document) ChangeSubtitle(subtitle string) {
	if d.state.Subtitle == subtitle {
		return
	}

	d.events = append(d.events, DocumentEvent{
		SubtitleChanged: subtitle,
	})

	d.state.apply(d.events[len(d.events)-1], time.Now().UTC().Round(time.Second))
}

func (d *Document) MoveBlock(blockID, parent, left string) error {
	if err := d.state.moveBlock(blockID, parent, left); err != nil {
		return err
	}

	d.events = append(d.events, DocumentEvent{
		// TODO: extract block move struct.
		BlockMoved: struct {
			BlockID     string
			Parent      string
			LeftSibling string
		}{
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

type DocumentEvent struct {
	TitleChanged    string
	SubtitleChanged string
	BlockMoved      BlockMovedEvent // TODO: add refmt tags to omitempty fields.
	BlockReplaced   Block
	BlockDeleted    string
}

type BlockMovedEvent struct {
	BlockID     string
	Parent      string
	LeftSibling string
}

type Block struct {
	ID          string
	Type        string
	Attributes  map[string]string
	Text        string
	Annotations []Annotation
}

type Annotation struct {
	Type       string
	Attributes map[string]string
	Starts     []int32
	Ends       []int32
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
