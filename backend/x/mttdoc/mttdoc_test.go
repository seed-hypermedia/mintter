package mttdoc

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestApplyChange(t *testing.T) {
	d := new(doc)

	dc := docChange{
		SetTitle:    "My new document title",
		SetSubtitle: "Subtitle",
		BlockChanges: []blockChange{
			{
				ID:          "block-1",
				Op:          blockOpInsert,
				SetType:     "statement",
				SetPosition: blockPosition{Parent: rootBlock.ID, Left: listHeadBlock.ID},
				SetContent:  "Hello world",
			},
			{
				ID:          "block-2",
				Op:          blockOpInsert,
				SetType:     "statement",
				SetPosition: blockPosition{Parent: "block-1", Left: listHeadBlock.ID},
				SetContent:  "Sub content",
			},
		},
	}

	require.NoError(t, d.ApplyChange(dc))

	it := newIterator(d)
	for blk := it.Next(); blk != nil; blk = it.Next() {
		fmt.Println(blk.ID, blk.Parent.Block.ID, blk.Left.ID)
	}
}
