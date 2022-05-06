package vcstypes

import (
	"mintter/backend/ipfs"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
)

func TestDocument(t *testing.T) {
	doc := NewDocument(mustCID("doc-1"), mustCID("author"), time.Now())

	doc.ChangeTitle("Hello")
	doc.ChangeTitle("Hello")
	doc.ChangeSubtitle("Hello World")

	require.NoError(t, doc.MoveBlock("b1", "", ""))
	err := doc.ReplaceBlock(Block{
		ID:   "b1",
		Type: "statement",
		Text: "Hello World",
	})
	require.NoError(t, err)

	want := []DocumentEvent{
		{TitleChanged: "Hello"},
		{SubtitleChanged: "Hello World"},
		{BlockMoved: BlockMovedEvent{"b1", "", ""}},
		{BlockReplaced: Block{
			ID:   "b1",
			Type: "statement",
			Text: "Hello World",
		}},
	}

	require.Equal(t, want, doc.Events())
}

func mustCID(s string) cid.Cid {
	c, err := ipfs.NewCID(cid.Raw, multihash.IDENTITY, []byte(s))
	if err != nil {
		panic(err)
	}
	return c
}
