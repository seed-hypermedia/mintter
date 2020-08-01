package document

import (
	"errors"
	"fmt"

	"github.com/sergi/go-diff/diffmatchpatch"
)

// opType is a type for operation types.
type opType string

// Operation types.
const (
	opTypeCreateDocument opType = "CreateDocument"
	opTypeCreateBlock    opType = "CreateBlock"
	opTypeUpdateDocument opType = "UpdateDocument"
	opTypeRemoveBlock    opType = "RemoveBlock"
	opTypeApplyDelta     opType = "ApplyDelta"
	opTypeMoveBlock      opType = "MoveBlock"
)

// operation that can be applied to a document.
type operation struct {
	Type opType `refmt:"type"`

	// Only one of these must be set, according to the type.
	CreateDocument *createDocument `refmt:"createDocument,omitempty"`
	CreateBlock    *createBlock    `refmt:"createBlock,omitempty"`
	UpdateDocument *updateDocument `refmt:"updateDocument,omitempty"`
	RemoveBlock    *removeBlock    `refmt:"removeBlock,omitempty"`
	ApplyDelta     *applyDelta     `refmt:"applyDelta,omitempty"`
	MoveBlock      *moveBlock      `refmt:"moveBlock,omitempty"`
}

// newOperation creates a new operation and fills in the type.
func newOperation(v interface{}) operation {
	var o operation

	switch vv := v.(type) {
	case *createDocument:
		o.Type = opTypeCreateDocument
		o.CreateDocument = vv
	case *createBlock:
		o.Type = opTypeCreateBlock
		o.CreateBlock = vv
	case *updateDocument:
		o.Type = opTypeUpdateDocument
		o.UpdateDocument = vv
	case *removeBlock:
		o.Type = opTypeRemoveBlock
		o.RemoveBlock = vv
	case *applyDelta:
		o.Type = opTypeApplyDelta
		o.ApplyDelta = vv
	case *moveBlock:
		o.Type = opTypeMoveBlock
		o.MoveBlock = vv
	default:
		panic(fmt.Errorf("BUG: unknown operation: %T", v))
	}

	return o
}

type opList struct {
	ops []operation
}

func (os *opList) add(o ...operation) {
	os.ops = append(os.ops, o...)
}

type createDocument struct {
	ID       string
	Author   string
	Title    string
	Subtitle string
}

type createBlock struct {
	ID    string
	Text  string
	After string
}

type updateDocument struct {
	Title    string
	Subtitle string
}

type removeBlock struct {
	ID string
}

type applyDelta struct {
	BlockID string
	Delta   string
}

type moveBlock struct {
	ID    string
	After string
}

func (d *State) apply(ops []operation) error {
	type idx struct {
		Pos   int
		Block Block
	}

	blocksMap := make(map[string]idx)
	var opCount int

	for _, op := range ops {
		opCount++

		switch op.Type {
		case opTypeCreateDocument:
			opv := op.CreateDocument
			if opCount != 1 {
				return fmt.Errorf("operation CreateDocument must be the first one")
			}
			if d.ID != "" {
				return fmt.Errorf("document already has an ID, but got CreateDocument")
			}
			d.Title = opv.Title
			d.Author = opv.Author
			d.ID = opv.ID
			d.Subtitle = opv.Subtitle
		case opTypeCreateBlock:
			opv := op.CreateBlock
			if d.ID == "" && opCount < 2 {
				return fmt.Errorf("operation CreateBlock must be at least the second one")
			}

			if _, ok := blocksMap[opv.ID]; ok {
				return fmt.Errorf("duplicate operation CreateBlock for ID: %s", opv.ID)
			}

			i := blocksMap[opv.ID]
			i.Block = Block{
				ID:   opv.ID,
				Text: opv.Text,
			}

			if opv.After == "" {
				i.Pos = 0
			} else {
				prev, ok := blocksMap[opv.After]
				if !ok {
					return fmt.Errorf("block %s is created after non existing block %s", opv.ID, opv.After)
				}
				i.Pos = prev.Pos + 1
			}

			blocksMap[opv.ID] = i
		case opTypeRemoveBlock:
			opv := op.RemoveBlock
			delete(blocksMap, opv.ID)
		case opTypeApplyDelta:
			opv := op.ApplyDelta
			if d.ID == "" && opCount < 3 {
				return fmt.Errorf("operation ApplyDelta must be at least the third one")
			}

			i, ok := blocksMap[opv.BlockID]
			if !ok {
				return fmt.Errorf("block %s is not found", opv.BlockID)
			}

			dmp := diffmatchpatch.New()
			diff, err := dmp.DiffFromDelta(i.Block.Text, opv.Delta)
			if err != nil {
				return err
			}

			i.Block.Text = dmp.DiffText2(diff)

			blocksMap[opv.BlockID] = i
		case opTypeMoveBlock:
			panic("BUG: not implemented")
		}
	}

	d.Blocks = make([]Block, len(blocksMap))
	for _, blockIdx := range blocksMap {
		d.Blocks[blockIdx.Pos] = blockIdx.Block
	}

	return nil
}

func (d *State) diff(new State) ([]operation, error) {
	ops := &opList{}

	if new.ID == "" {
		return nil, errors.New("new document must have an ID")
	}

	if new.Author == "" {
		return nil, errors.New("new document must have an author")
	}

	if new.Title == "" {
		return nil, errors.New("new document must have a title")
	}

	if d.Author != "" && d.Author != new.Author {
		return nil, errors.New("documents must be from the same author")
	}

	if d.ID != "" && d.ID != new.ID {
		return nil, errors.New("new document must have the same ID as the old one")
	}

	if d.ID == "" {
		ops.add(newOperation(&createDocument{
			ID:       new.ID,
			Author:   new.Author,
			Title:    new.Title,
			Subtitle: new.Subtitle,
		}))
	} else {
		var v1, v2 updateDocument
		v1.Title = d.Title
		v1.Subtitle = d.Subtitle
		v2.Title = new.Title
		v2.Subtitle = new.Subtitle

		if v1 != v2 {
			ops.add(newOperation(&v2))
		}
	}

	if err := diffBlocks(ops, d.Blocks, new.Blocks); err != nil {
		return nil, err
	}

	return ops.ops, nil
}

type blockPos struct {
	Old Block
	// OldIdx   int
	OldAfter string
	New      Block
	// NewIdx   int
	NewAfter string
}

func (pos blockPos) deriveOps(os *opList) {
	switch {
	case pos.Old.ID != "" && pos.New.ID == "":
		os.add(newOperation(&removeBlock{ID: pos.Old.ID}))
		return
	case pos.Old.ID == "" && pos.New.ID != "":
		os.add(newOperation(&createBlock{
			ID:    pos.New.ID,
			Text:  pos.New.Text,
			After: pos.NewAfter,
		}))
		return
	case pos.OldAfter != pos.NewAfter:
		os.add(newOperation(&moveBlock{
			ID:    pos.New.ID,
			After: pos.NewAfter,
		}))
	}

	if pos.Old.Text != pos.New.Text {
		dmp := diffmatchpatch.New()
		diff := dmp.DiffMain(pos.Old.Text, pos.New.Text, true)
		delta := dmp.DiffToDelta(diff)

		os.add(newOperation(&applyDelta{
			BlockID: pos.New.ID,
			Delta:   delta,
		}))
	}
}

func diffBlocks(os *opList, a, b []Block) error {
	idx := make(map[string]blockPos)

	ordered := make([]string, len(b))

	for i, block := range b {
		pos := idx[block.ID]
		if i > 0 {
			pos.NewAfter = b[i-1].ID
		}
		pos.New = block

		idx[block.ID] = pos
		ordered[i] = block.ID
	}

	for i, block := range a {
		pos := idx[block.ID]
		if i > 0 {
			pos.OldAfter = a[i-1].ID
		}
		pos.Old = block

		idx[block.ID] = pos
	}

	for _, id := range ordered {
		pos := idx[id]
		pos.deriveOps(os)
		delete(idx, id)
	}

	for _, pos := range idx {
		pos.deriveOps(os)
	}

	return nil
}
