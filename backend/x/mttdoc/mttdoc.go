package mttdoc

import (
	"fmt"

	"github.com/tidwall/gjson"
)

var (
	rootBlock     = &block{ID: "ROOT"}
	listHeadBlock = &block{ID: "START"}
)

type doc struct {
	ID       string
	Author   string
	Title    string
	Subtitle string

	Blocks   map[string]*block
	RootList list
}

func (d *doc) list() *list {
	if d.RootList.Block == nil {
		d.RootList.Block = rootBlock
	}

	return &d.RootList
}

func (d *doc) ApplyChange(c docChange) error {
	d.Title = patchString(d.Title, c.SetTitle)
	d.Subtitle = patchString(d.Subtitle, c.SetSubtitle)

	if d.Blocks == nil {
		d.Blocks = make(map[string]*block)
	}

	for _, bc := range c.BlockChanges {
		switch bc.Op {
		case blockOpInsert:
			if _, ok := d.Blocks[bc.ID]; ok {
				return fmt.Errorf("duplicated block ID %s on insert", bc.ID)
			}

			blk := &block{
				ID:         bc.ID,
				Type:       bc.SetType,
				Content:    bc.SetContent,
				Attributes: copyAttributes(bc.SetAttributes),
			}

			if err := d.integrateBlock(blk, bc.SetPosition); err != nil {
				return err
			}

			// Set list type
			// Set list attributes
		case blockOpDelete:
			// Delete
		case blockOpRetain:
			// Retain
			old := d.Blocks[bc.ID]
			if old == nil {
				return fmt.Errorf("can't retain non-existing block %s", bc.ID)
			}
		}
	}

	return nil
}

func (d *doc) integrateBlock(blk *block, pos blockPosition) error {
	// Find list
	// Find sibling
	if pos.Left == "" || pos.Parent == "" {
		return fmt.Errorf("position must have both parent and left IDs when integrating")
	}

	var l *list
	if pos.Parent == rootBlock.ID {
		l = d.list()
	} else {
		pb := d.Blocks[pos.Parent]
		if pb == nil {
			return fmt.Errorf("parent block %s is not found", pos.Parent)
		}

		l = pb.list()
	}

	if err := l.insertAfter(blk, pos.Left); err != nil {
		return err
	}

	blk.Parent = l

	d.Blocks[blk.ID] = blk

	return nil
}

type block struct {
	Type       string
	ID         string
	Left       *block
	Parent     *list
	Children   *list
	Content    string
	Attributes map[string]gjson.Result
}

func (b *block) list() *list {
	if b.Children == nil {
		b.Children = &list{Block: b}
	}

	return b.Children
}

type list struct {
	Type       string
	Block      *block // block this list belongs to
	Children   []*block
	Attributes map[string]gjson.Result
}

func (l *list) insertAfter(blk *block, left string) error {
	if len(l.Children) > 0 && left == l.Children[len(l.Children)-1].ID {
		l.Children = append(l.Children, blk)
		blk.Left = l.Children[len(l.Children)-1]
		return nil
	}

	// TODO: try to reuse the array, or maybe use a linked list here?
	c := make([]*block, len(l.Children)+1)

	if left == listHeadBlock.ID {
		c[0] = blk
		copy(c[1:], l.Children)
		l.Children = c
		blk.Left = listHeadBlock
		return nil
	}

	var found int

	for i, needle := range l.Children {
		c[i] = needle

		if needle.ID == left {
			c[i+1] = blk
			found = i
			blk.Left = needle
			break
		}
	}

	if found == 0 {
		return fmt.Errorf("not found block %s in list %s", left, l.Block.ID)
	}

	copy(c[found+1:], l.Children[found:])

	l.Children = c

	return nil
}
