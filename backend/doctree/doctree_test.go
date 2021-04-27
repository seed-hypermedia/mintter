package doctree_test

import (
	"testing"

	"mintter/backend/doctree"

	"github.com/stretchr/testify/require"
)

func TestTree_Add(t *testing.T) {
	tests := [...]struct {
		name     string
		in       [][3]string
		expected []block
	}{
		{
			name:     "top level append",
			in:       [][3]string{{"b1", "", ""}, {"b2", "", "b1"}, {"b3", "", "b2"}, {"b4", "", "b3"}},
			expected: []block{{0, "b1"}, {0, "b2"}, {0, "b3"}, {0, "b4"}},
		},
		{
			name:     "prepend",
			in:       [][3]string{{"b1", "", ""}, {"b2", "", ""}, {"b3", "", ""}},
			expected: []block{{0, "b3"}, {0, "b2"}, {0, "b1"}},
		},
		{
			name:     "nesting",
			in:       [][3]string{{"b1", "", ""}, {"b2", "", "b1"}, {"b11", "b1", ""}, {"b12", "b1", "b11"}, {"b13", "b1", ""}, {"b3", "", ""}},
			expected: []block{{0, "b3"}, {0, "b1"}, {1, "b13"}, {1, "b11"}, {1, "b12"}, {0, "b2"}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tree := doctree.New()
			for _, in := range tt.in {
				require.NoError(t, tree.Add(in[0], in[1], in[2]))
			}
			checkTree(t, tree, tt.expected)
			var i int
			tree.Walk(func(blockID string, depth int) bool {
				e := tt.expected[i]
				require.Equal(t, e.id, blockID)
				require.Equal(t, e.depth, depth)
				i++
				return true
			})
		})
	}
}

func TestTree_Errors(t *testing.T) {
	tree := doctree.New()

	require.NoError(t, tree.Add("b1", "", ""))
	require.Error(t, tree.Add("b1", "", ""), "must fail adding block twice")
	require.Error(t, tree.Add("b3", "b2", ""), "non-existing parent must fail")
	require.Error(t, tree.Add("b3", "", "b2"), "non-existing left must fail")
	require.Error(t, tree.Add("b2", "b1", "b1"))
	require.Error(t, tree.Add("b2", "b2", "b2"))
	require.Error(t, tree.Move("b3", "b2", "b3"))
	require.Error(t, tree.Remove("b10"))
}

func TestTree_Move(t *testing.T) {
	tree := doctree.New()
	/*
		b3
		b1
		  b2
		    b21
		    b22
		      b221
		    b23
	*/
	require.NoError(t, tree.Add("b1", "", ""))
	require.NoError(t, tree.Add("b2", "", "b1"))
	require.NoError(t, tree.Add("b3", "", "b2"))
	require.NoError(t, tree.Add("b21", "b2", ""))
	require.NoError(t, tree.Add("b22", "b2", "b21"))
	require.NoError(t, tree.Add("b221", "b22", ""))
	require.NoError(t, tree.Add("b23", "b2", "b22"))
	require.NoError(t, tree.Move("b2", "b1", ""))
	require.NoError(t, tree.Move("b1", "", "b3"))

	checkTree(t, tree, []block{
		{0, "b3"},
		{0, "b1"},
		{1, "b2"},
		{2, "b21"},
		{2, "b22"},
		{3, "b221"},
		{2, "b23"},
	})
}

func TestTree_Remove(t *testing.T) {
	tree := doctree.New()
	require.NoError(t, tree.Add("b1", "", ""))
	require.NoError(t, tree.Add("b11", "b1", ""))
	require.NoError(t, tree.Add("b12", "b11", ""))
	require.NoError(t, tree.Add("b13", "b12", ""))
	require.NoError(t, tree.Add("b14", "b13", ""))
	require.NoError(t, tree.Add("b2", "", "b1"))

	/*
		b1
		  b11
		    b12
		      b13
		        b14
		b2
	*/
	checkTree(t, tree, []block{{0, "b1"}, {1, "b11"}, {2, "b12"}, {3, "b13"}, {4, "b14"}, {0, "b2"}})

	require.NoError(t, tree.Remove("b1"))

	checkTree(t, tree, []block{{0, "b2"}})

	for _, b := range []string{"b1", "b11", "b12", "b13", "b14"} {
		require.False(t, tree.Has(b))
	}
}

type block struct {
	depth int
	id    string
}

func checkTree(t *testing.T, tree *doctree.Tree, expected []block) {
	t.Helper()
	var i int
	tree.Walk(func(blockID string, depth int) bool {
		e := expected[i]
		require.Equal(t, e.id, blockID)
		require.Equal(t, e.depth, depth, blockID)
		i++
		return true
	})
}
