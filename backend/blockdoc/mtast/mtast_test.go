package mtast

import (
	"io/ioutil"
	"testing"

	"mintter/backend/blockdoc"
	"mintter/backend/crdt"

	"github.com/stretchr/testify/require"
)

func TestWalker(t *testing.T) {
	type (
		listStart struct {
			ID string
		}

		listAttr struct {
			ID    string
			Key   string
			Value interface{}
		}

		blockStart struct {
			ID     string
			Parent string
			Depth  int
		}

		blockAttr struct {
			ID    string
			Key   string
			Value interface{}
		}

		blockContent struct {
			ID      string
			Content string
		}
	)

	want := []interface{}{
		listStart{ID: ""},
		listAttr{ID: "", Key: "type", Value: "group"},
		blockStart{ID: "0ozzkCQG", Parent: "", Depth: 0},
		blockAttr{ID: "0ozzkCQG", Key: "type", Value: "statement"},
		blockContent{ID: "0ozzkCQG", Content: `{"type":"paragraph","children":[{"type":"text","value":"Now let look into the document."}]}`},
		blockStart{ID: "lcKwgIFx", Parent: "", Depth: 0},
		blockAttr{ID: "lcKwgIFx", Key: "type", Value: "statement"},
		blockContent{ID: "lcKwgIFx", Content: `{"type":"paragraph","children":[{"type":"text","value":"I can write"}]}`},
		listStart{ID: "lcKwgIFx"},
		listAttr{ID: "lcKwgIFx", Key: "type", Value: "group"},
		blockStart{ID: "-U05oyCe", Parent: "lcKwgIFx", Depth: 1},
		blockAttr{ID: "-U05oyCe", Key: "type", Value: "statement"},
		blockContent{ID: "-U05oyCe", Content: `{"type":"paragraph","children":[{"type":"text","value":"And nest things"}]}`},
		blockStart{ID: "193HuRrG", Parent: "lcKwgIFx", Depth: 1},
		blockAttr{ID: "193HuRrG", Key: "type", Value: "statement"},
		blockContent{ID: "193HuRrG", Content: `{"type":"paragraph","children":[{"type":"text","value":"Under "},{"type":"text","value":"each","strong":true},{"type":"text","value":" other"}]}`},
		listStart{ID: "193HuRrG"},
		listAttr{ID: "193HuRrG", Key: "type", Value: "group"},
		blockStart{ID: "lFXQ1dmo", Parent: "193HuRrG", Depth: 2},
		blockAttr{ID: "lFXQ1dmo", Key: "type", Value: "statement"},
		blockContent{ID: "lFXQ1dmo", Content: `{"type":"paragraph","children":[{"type":"text","value":"And even "},{"type":"text","value":"further","underline":true}]}`},
	}

	var log []interface{}

	wlk := blockdoc.NewWalkHandlers()
	wlk.HandleListStart = func(id string) error {
		log = append(log, listStart{ID: id})
		return nil
	}
	wlk.HandleBlockContent = func(id, content string) error {
		log = append(log, blockContent{ID: id, Content: content})
		return nil
	}
	wlk.HandleListAttribute = func(id, k string, v interface{}) error {
		log = append(log, listAttr{ID: id, Key: k, Value: v})
		return nil
	}
	wlk.HandleBlockStart = func(id, parent string, depth int) error {
		log = append(log, blockStart{ID: id, Parent: parent, Depth: depth})
		return nil
	}
	wlk.HandleBlockAttribute = func(id, k string, v interface{}) error {
		log = append(log, blockAttr{ID: id, Key: k, Value: v})
		return nil
	}

	data, err := ioutil.ReadFile("./testdata/simple-nested.json")
	require.NoError(t, err)

	err = Walk(string(data), wlk)
	require.NoError(t, err)

	require.Equal(t, want, log)
}

func TestDiff(t *testing.T) {
	data, err := ioutil.ReadFile("./testdata/simple-nested.json")
	require.NoError(t, err)

	doc := blockdoc.NewDocument("simple-nested", "alice")

	wlk := blockdoc.NewReconciler(doc)
	err = Walk(string(data), wlk)
	require.NoError(t, err)

	crdt.NodePositionsTest(t, []crdt.TestPosition{
		{Node: "0ozzkCQG", Parent: crdt.RootNodeID, Left: ""},
		{Node: "lcKwgIFx", Parent: crdt.RootNodeID, Left: "0ozzkCQG"},
		{Node: "-U05oyCe", Parent: "lcKwgIFx", Left: ""},
		{Node: "193HuRrG", Parent: "lcKwgIFx", Left: "-U05oyCe"},
		{Node: "lFXQ1dmo", Parent: "193HuRrG", Left: ""},
	}, doc.Tree().Iterator())
}
