package vcstypes

import (
	"mintter/backend/ipfs"
	"testing"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multihash"
	"github.com/stretchr/testify/require"
)

func TestParseMintterLink(t *testing.T) {
	tests := []struct {
		In   string
		Want []string
	}{
		{
			In:   "mtt://docid/versionid/blockid",
			Want: []string{"docid", "versionid", "blockid"},
		},
		{
			In:   "mtt://bafy2bzaceaemtzyq7gj6fa5jn4xhfq6yp657j5dpoqvh6bio4kk4bi2wmoroy/baeaxdiheaiqfsiervpfvbohhvjgnkcto3f5p4alwe4k46fr334vlw4n5jaknnqa/MIWneLC1",
			Want: []string{"bafy2bzaceaemtzyq7gj6fa5jn4xhfq6yp657j5dpoqvh6bio4kk4bi2wmoroy", "baeaxdiheaiqfsiervpfvbohhvjgnkcto3f5p4alwe4k46fr334vlw4n5jaknnqa", "MIWneLC1"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.In, func(t *testing.T) {
			got := linkRegex.FindStringSubmatch(tt.In)
			require.Equal(t, tt.Want, got[1:])
		})
	}
}

func TestBug_MissingBacklinks(t *testing.T) {
	blk := Block{
		ID:         "4NfZOkKb",
		Type:       "statement",
		Attributes: map[string]string(nil),
		Text:       "￼",
		Annotations: []Annotation{
			{
				Type: "embed",
				Attributes: map[string]string{
					"url": "mtt://bafy2bzaceaemtzyq7gj6fa5jn4xhfq6yp657j5dpoqvh6bio4kk4bi2wmoroy/baeaxdiheaiqfsiervpfvbohhvjgnkcto3f5p4alwe4k46fr334vlw4n5jaknnqa/MIWneLC1",
				},
				Starts: []int32{
					0,
				},
				Ends: []int32{
					1,
				},
			},
		},
	}

	var i int
	blk.ForEachLink(func(l MintterLink) bool {
		i++
		return true
	})
	require.Equal(t, 1, i, "must have one link")
}

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
