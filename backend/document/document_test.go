package document

import (
	"context"
	"fmt"
	"testing"

	"github.com/ipfs/go-ipfs/dagutils"
	format "github.com/ipfs/go-ipld-format"
	"github.com/sergi/go-diff/diffmatchpatch"
	"github.com/stretchr/testify/require"
)

func TestDiff(t *testing.T) {
	ops := []operation{
		newOperation(&createDocument{
			ID:       "doc-1",
			Author:   "burdiyan",
			Title:    "This is how Mintter works",
			Subtitle: "The result of several weeks of headache",
		}),
		newOperation(&createBlock{
			ID:   "block-1",
			Text: `Mintter documents are IPLD objects on IPFS`,
		}),
	}

	var v1 State

	require.NoError(t, v1.apply(ops))

	expected := State{
		ID:       "doc-1",
		Author:   "burdiyan",
		Title:    "This is how Mintter works",
		Subtitle: "The result of several weeks of headache",
		Blocks: []Block{
			{
				ID:   "block-1",
				Text: "Mintter documents are IPLD objects on IPFS",
			},
		},
	}

	require.Equal(t, expected, v1)

	dmp := diffmatchpatch.New()
	diff := dmp.DiffMain(v1.Blocks[0].Text, "Mintter documents are built from events written as IPLD objects on IPFS", true)
	delta := dmp.DiffToDelta(diff)
	fmt.Println(delta)

	ops = append(ops, newOperation(&applyDelta{
		BlockID: "block-1",
		Delta:   delta,
	}))

	var v2 State
	require.NoError(t, v2.apply(ops))

	expectedv2 := State{
		ID:       "doc-1",
		Author:   "burdiyan",
		Title:    "This is how Mintter works",
		Subtitle: "The result of several weeks of headache",
		Blocks: []Block{
			{
				ID:   "block-1",
				Text: "Mintter documents are built from events written as IPLD objects on IPFS",
			},
		},
	}

	require.Equal(t, expectedv2, v2)
}

func TestDiffBug(t *testing.T) {
	// This test corrects flakiness in diff generation where blocks would sometimes be created after
	// blocks that were not yet processed. Run it with high count to test for flakiness.
	old := State{}
	new := State{
		ID:     "doc-1",
		Author: "burdiyan",
		Title:  "That's a Mintter Doc",
		Blocks: []Block{
			{
				ID:   "block-1",
				Text: "Hello",
			},
			{
				ID:   "block-2",
				Text: "World",
			},
		},
	}

	ops, err := old.diff(new)
	require.NoError(t, err)

	require.NoError(t, old.apply(ops))
	require.Equal(t, new, old)
}

func TestDiffDocs(t *testing.T) {
	old := State{}
	new := State{
		ID:     "doc-1",
		Author: "burdiyan",
		Title:  "That's a Mintter Doc",
		Blocks: []Block{
			{
				ID:   "block-1",
				Text: "Hello",
			},
			{
				ID:   "block-2",
				Text: "World",
			},
		},
	}

	exp1 := []operation{
		newOperation(&createDocument{
			ID:     "doc-1",
			Author: "burdiyan",
			Title:  "That's a Mintter Doc",
		}),
		newOperation(&createBlock{
			ID:    "block-1",
			Text:  "Hello",
			After: "",
		}),
		// TODO: test create two blocks after the same one or empty one.
		newOperation(&createBlock{
			ID:    "block-2",
			Text:  "World",
			After: "block-1",
		}),
	}

	ops, err := old.diff(new)
	require.NoError(t, err)
	require.Equal(t, exp1, ops)

	err = old.apply(ops)
	require.NoError(t, err)
	require.Equal(t, new, old)

	old.Blocks[1].Text = "World!"

	ops, err = new.diff(old)
	require.NoError(t, err)
	exp2 := []operation{newOperation(&applyDelta{
		BlockID: "block-2",
		Delta:   "=5\t+!",
	})}
	require.Equal(t, exp2, ops)
}

func TestDocumentService(t *testing.T) {
	dag := dagutils.NewMemoryDagService()
	svc := NewService(dag)
	ctx := context.Background()

	v1 := &State{
		ID:     "doc-1",
		Author: "burdiyan",
		Title:  "That's a Mintter Doc",
		Blocks: []Block{
			{
				ID:   "block-1",
				Text: "Hello",
			},
			{
				ID:   "block-2",
				Text: "World",
			},
		},
	}

	v2 := &State{
		ID:     "doc-1",
		Author: "burdiyan",
		Title:  "That's a Mintter Doc",
		Blocks: []Block{
			{
				ID:   "block-1",
				Text: "Hello",
			},
			{
				ID:   "block-2",
				Text: "World!",
			},
		},
	}

	v1cid, err := svc.PublishDocument(ctx, v1)
	require.NoError(t, err)

	v2cid, err := svc.PublishDocument(ctx, v2)
	require.NoError(t, err)

	v2node, err := dag.Get(ctx, v2cid)
	require.NoError(t, err)

	obj, _, err := v2node.Resolve([]string{"parent"})
	require.NoError(t, err)
	require.Equal(t, v1cid, obj.(*format.Link).Cid)

	v1doc, err := svc.GetDocument(ctx, v1cid)
	require.NoError(t, err)
	require.Equal(t, v1, v1doc)

	v2doc, err := svc.GetDocument(ctx, v2cid)
	require.NoError(t, err)
	require.Equal(t, v2, v2doc)
}
