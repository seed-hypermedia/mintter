package server

import (
	"context"
	"testing"
	"time"

	"mintter/backend/identity"
	"mintter/backend/ipldutil"
	"mintter/backend/testutil"
	v2 "mintter/proto/v2"

	"github.com/google/go-cmp/cmp"
	"github.com/ipfs/go-cid"
	"github.com/rs/xid"
	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/testing/protocmp"
)

func TestFlattenBlockRefList(t *testing.T) {
	l := &v2.BlockRefList{
		Refs: []*v2.BlockRef{
			{Ref: "block-1"},
			{
				Ref: "block-list-parent",
				BlockRefList: &v2.BlockRefList{
					Refs: []*v2.BlockRef{
						{Ref: "block-list-child-1"},
						{Ref: "block-list-child-2"},
					},
				},
			},
			{Ref: "block-2"},
		},
	}

	expected := []string{"block-1", "block-list-parent", "block-2", "block-list-child-1", "block-list-child-2"}
	require.Equal(t, expected, flattenBlockRefs(l))
}

func TestBlocksFromProto(t *testing.T) {
	var expected document

	expected.RefList = &RefList{
		Refs: []BlockRef{
			{Pointer: "#/blocks/block-1"},
			{
				Pointer: "#/blocks/block-list-parent",
				RefList: &RefList{
					ListStyle: v2.BlockRefList_BULLET,
					Refs: []BlockRef{
						{Pointer: "#/blocks/block-list-child-1"},
						{Pointer: "#/blocks/block-list-child-2"},
					},
				},
			},
			{Pointer: "#/blocks/block-2"},
		},
	}
	expected.Blocks = map[string]Block{
		"block-1": {
			ID:   "block-1",
			Text: "I'm just a line of text.",
		},
		"block-list-parent": {
			ID:   "block-list-parent",
			Text: "I'm a parent of a list.",
		},
		"block-list-child-1": {
			ID:   "block-list-child-1",
			Text: "I'm the first list item.",
		},
		"block-list-child-2": {
			ID:   "block-list-child-2",
			Text: "I'm the second list item.",
		},
		"block-2": {
			ID:   "block-2",
			Text: "I'm just a line of text with some formatting!",
			StyleRanges: []StyleRange{
				{Offset: 24, Length: 4, Style: StyleBold},
				{Offset: 29, Length: 4, Style: StyleItalic},
				{Offset: 34, Length: 10, Style: StyleBold | StyleUnderline},
			},
		},
	}

	var d document
	_, err := blocksFromProto(&d, testRefList(), testBlockMap())
	require.NoError(t, err)

	require.Equal(t, expected.RefList, d.RefList, "ref list must match")
	require.Equal(t, expected.Blocks, d.Blocks, "block map must match")
}

func TestBlockProtoEncoding(t *testing.T) {
	tests := []struct {
		Proto  *v2.Block
		Struct Block
	}{
		{
			Proto: &v2.Block{
				Id: "block-1",
				Content: &v2.Block_Paragraph{
					Paragraph: &v2.Paragraph{
						InlineElements: []*v2.InlineElement{
							{Text: "Hello World!"},
						},
					},
				},
			},
			Struct: Block{
				ID:   "block-1",
				Text: "Hello World!",
			},
		},
		{
			Proto: &v2.Block{
				Id: "block-2",
				Content: &v2.Block_Paragraph{
					Paragraph: &v2.Paragraph{
						InlineElements: []*v2.InlineElement{
							{Text: "Hello "},
							{Text: "World", TextStyle: &v2.TextStyle{Bold: true, Italic: true}},
							{Text: "!"},
						},
					},
				},
			},
			Struct: Block{
				ID:   "block-2",
				Text: "Hello World!",
				StyleRanges: []StyleRange{
					{
						Offset: 6,
						Length: 5,
						Style:  StyleBold | StyleItalic,
					},
				},
			},
		},
		{
			Proto: &v2.Block{
				Id: "block-3",
				Content: &v2.Block_Paragraph{
					Paragraph: &v2.Paragraph{
						InlineElements: []*v2.InlineElement{
							{Text: "Hello "},
							{Text: "W", TextStyle: &v2.TextStyle{Bold: true, Italic: true}},
							{Text: "orld", TextStyle: &v2.TextStyle{Underline: true, Bold: true}},
							{Text: "!"},
						},
					},
				},
			},
			Struct: Block{
				ID:   "block-3",
				Text: "Hello World!",
				StyleRanges: []StyleRange{
					{Offset: 6, Length: 1, Style: StyleBold | StyleItalic},
					{Offset: 7, Length: 4, Style: StyleBold | StyleUnderline},
				},
			},
		},
		{
			Proto: &v2.Block{
				Id: "block-formatting",
				Content: &v2.Block_Paragraph{
					Paragraph: &v2.Paragraph{
						InlineElements: []*v2.InlineElement{
							{Text: "I'm just a line of text "},
							{Text: "with", TextStyle: &v2.TextStyle{Bold: true}},
							{Text: " "},
							{Text: "some", TextStyle: &v2.TextStyle{Italic: true}},
							{Text: " "},
							{Text: "formatting", TextStyle: &v2.TextStyle{Bold: true, Underline: true}},
							{Text: "!"},
						},
					},
				},
			},
			Struct: Block{
				ID:   "block-formatting",
				Text: "I'm just a line of text with some formatting!",
				StyleRanges: []StyleRange{
					{Offset: 24, Length: 4, Style: StyleBold},
					{Offset: 29, Length: 4, Style: StyleItalic},
					{Offset: 34, Length: 10, Style: StyleBold | StyleUnderline},
				},
			},
		},
	}

	for i, tt := range tests {
		b := blockFromProto(tt.Proto)
		require.Equalf(t, tt.Struct, b, "from proto %d block %s failed", i, tt.Proto.Id)
	}

	// Reverse
	for _, tt := range tests {
		b := blockToProto(tt.Struct)
		require.Equalf(t, "", cmp.Diff(tt.Proto, b, protocmp.Transform()), "block %s to proto failed", tt.Struct.ID)
	}
}

func testRefList() *v2.BlockRefList {
	return &v2.BlockRefList{
		Refs: []*v2.BlockRef{
			{Ref: "block-1"},
			{
				Ref: "block-list-parent",
				BlockRefList: &v2.BlockRefList{
					Style: v2.BlockRefList_BULLET,
					Refs: []*v2.BlockRef{
						{Ref: "block-list-child-1"},
						{Ref: "block-list-child-2"},
					},
				},
			},
			{Ref: "block-2"},
		},
	}
}

func testBlockMap() map[string]*v2.Block {
	return map[string]*v2.Block{
		"block-1": {
			Id: "block-1",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm just a line of text."},
					},
				},
			},
		},
		"block-2": {
			Id: "block-2",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm just a line of text "},
						{Text: "with", TextStyle: &v2.TextStyle{Bold: true}},
						{Text: " "},
						{Text: "some", TextStyle: &v2.TextStyle{Italic: true}},
						{Text: " "},
						{Text: "formatting", TextStyle: &v2.TextStyle{Bold: true, Underline: true}},
						{Text: "!"},
					},
				},
			},
		},
		"block-list-parent": {
			Id: "block-list-parent",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm a parent of a list."},
					},
				},
			},
		},
		"block-list-child-1": {
			Id: "block-list-child-1",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm the first list item."},
					},
				},
			},
		},
		"block-list-child-2": {
			Id: "block-list-child-2",
			Content: &v2.Block_Paragraph{
				Paragraph: &v2.Paragraph{
					InlineElements: []*v2.InlineElement{
						{Text: "I'm the second list item."},
					},
				},
			},
		},
	}
}

func TestResolveDocument(t *testing.T) {
	var docstore *docStore
	{
		alice := testutil.MakeProfile(t, "alice")
		bob := testutil.MakeProfile(t, "bob")
		docstore = &docStore{
			bs: testutil.MakeBlockStore(t),
			db: testutil.MakeDatastore(t),
			profstore: &mockProfileStore{
				cur: alice,
				profiles: map[identity.ProfileID]identity.Profile{
					alice.ID: alice,
					bob.ID:   bob,
				},
			},
		}
	}

	doc1 := testDoc1(t, docstore)
	docid1, err := docstore.Store(context.TODO(), doc1)
	require.NoError(t, err)
	doc1again, err := docstore.Get(context.TODO(), docid1)
	require.NoError(t, err)
	require.Equal(t, doc1, doc1again.document)

	require.NoError(t, err)
	doc2 := testDoc2(t, docstore, docid1)
	docid2, err := docstore.Store(context.TODO(), doc2)
	require.NoError(t, err)

	docpb, blockMap, err := resolveDocument(context.TODO(), docid2, docstore)
	require.NoError(t, err)

	litter.Dump(docpb)
	litter.Dump(blockMap)
}

func testDoc1(t *testing.T, docstore *docStore) document {
	t.Helper()
	permanode := permanode{
		Random: xid.New().Bytes(),
	}

	perma, err := ipldutil.CreateSignedBlock(context.TODO(), docstore.profstore, permanode)
	require.NoError(t, err)

	require.NoError(t, docstore.bs.Put(perma))

	prof, err := docstore.profstore.CurrentProfile(context.TODO())
	require.NoError(t, err)

	var timestamp time.Time

	timestamp.Add(1 * time.Hour)

	return document{
		ID:       perma.Cid(),
		Title:    "First Mintter document",
		Subtitle: "This is the first mintter document",
		Author:   prof.ID,
		RefList: &RefList{
			ListStyle: v2.BlockRefList_NONE,
			Refs: []BlockRef{
				{Pointer: "#/blocks/block-1"},
				{
					Pointer: "#/blocks/block-list-parent",
					RefList: &RefList{
						ListStyle: v2.BlockRefList_BULLET,
						Refs: []BlockRef{
							{Pointer: "#/blocks/block-list-child-1"},
							{Pointer: "#/blocks/block-list-child-2"},
						},
					},
				},
			},
		},
		Blocks: map[string]Block{
			"block-1": {
				ID:   "block-1",
				Text: "I'm just a line.",
			},
			"block-list-parent": {
				ID:   "block-list-parent",
				Text: "I'm a line with children.",
			},
			"block-list-child-1": {
				ID:   "block-list-child-1",
				Text: "I'm the first child.",
			},
			"block-list-child-2": {
				ID:   "block-list-child-2",
				Text: "I'm the second child.",
			},
		},
		CreateTime:  timestamp,
		UpdateTime:  timestamp,
		PublishTime: timestamp,
	}
}

func testDoc2(t *testing.T, docstore *docStore, source cid.Cid) document {
	t.Helper()
	permanode := permanode{
		Random: xid.New().Bytes(),
	}

	perma, err := ipldutil.CreateSignedBlock(context.TODO(), docstore.profstore, permanode)
	require.NoError(t, err)

	prof, err := docstore.profstore.CurrentProfile(context.TODO())
	require.NoError(t, err)

	var timestamp time.Time

	timestamp.Add(1 * time.Hour)

	return document{
		ID:       perma.Cid(),
		Title:    "Second Mintter document",
		Subtitle: "This is where we reuse the block",
		Author:   prof.ID,
		RefList: &RefList{
			ListStyle: v2.BlockRefList_NONE,
			Refs: []BlockRef{
				{Pointer: "#/blocks/block-1"},
				{
					Pointer: "#/sources/src-1/blocks/block-list-parent",
					RefList: &RefList{
						ListStyle: v2.BlockRefList_BULLET,
						Refs: []BlockRef{
							{Pointer: "#/sources/src-1/blocks/block-list-child-1"},
							{Pointer: "#/sources/src-1/blocks/block-list-child-2"},
						},
					},
				},
			},
		},
		Blocks: map[string]Block{
			"block-1": {
				ID:   "block-1",
				Text: "I'm just a line. Again!",
			},
		},
		Sources: map[string]cid.Cid{
			"src-1": source,
		},
		CreateTime:  timestamp,
		UpdateTime:  timestamp,
		PublishTime: timestamp,
	}
}

type mockProfileStore struct {
	cur      identity.Profile
	profiles map[identity.ProfileID]identity.Profile
}

func (mock *mockProfileStore) CurrentProfile(context.Context) (identity.Profile, error) {
	return mock.cur, nil
}
func (mock *mockProfileStore) GetProfile(ctx context.Context, id identity.ProfileID) (identity.Profile, error) {
	return mock.profiles[id], nil
}
