package document

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRefListForEach(t *testing.T) {
	l := &refList{
		Refs: []blockRef{
			{Pointer: "#/blocks/block-1"},
			{
				Pointer: "#/blocks/block-list-parent",
				RefList: &refList{
					Refs: []blockRef{
						{Pointer: "#/blocks/block-list-child-1"},
						{Pointer: "#/blocks/block-list-child-2"},
					},
				},
			},
			{Pointer: "#/blocks/block-2"},
		},
	}

	var refs []string
	err := l.ForEachRef(func(br blockRef) error {
		refs = append(refs, br.Pointer)
		return nil
	})
	require.NoError(t, err)
	expected := []string{"#/blocks/block-1", "#/blocks/block-list-parent", "#/blocks/block-list-child-1", "#/blocks/block-list-child-2", "#/blocks/block-2"}
	require.Equal(t, expected, refs)
}
