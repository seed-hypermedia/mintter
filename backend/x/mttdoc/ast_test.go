package mttdoc

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

const docA = `{
	"type": "group",
	"children": [
		{
			"type": "statement",
			"id": "block-1",
			"children": [
				{
					"type": "content",
					"children": [ {"type": "text", "value": "Hello"} ]
				}
			]
		},
		{
			"type": "statement",
			"id": "block-2",
			"children": [
				{
					"type": "content",
					"children": [ {"type": "text", "value": "World"} ]
				}
			]
		},
		{
			"type": "statement",
			"id": "block-3",
			"children": [
				{
					"type": "content",
					"children": [ {"type": "text", "value": "!"} ]
				}
			]
		},
		{
			"type": "statement",
			"id": "deleted-block",
			"children": [
				{
					"type": "content",
					"children": [ {"type": "text", "value": "DELETED CONTENT"} ]
				}
			]
		}
	]
}`

const docB = `{
	"type": "group",
	"children": [
		{
			"type": "statement",
			"id": "block-4",
			"children": [
				{
					"type": "content",
					"children": [ {"type": "text", "value": "New Parent"} ]
				},
				{
					"type": "group",
					"children": [
						{
							"type": "statement",
							"id": "block-2",
							"children": [
								{
									"type": "content",
									"children": [ {"type": "text", "value": "World"} ]
								}
							]
						},
						{
							"type": "statement",
							"id": "block-3",
							"children": [
								{
									"type": "content",
									"children": [ {"type": "text", "value": "!"} ]
								}
							]
						},
						{
							"type": "statement",
							"id": "block-1",
							"children": [
								{
									"type": "content",
									"children": [ {"type": "text", "value": "Hello"} ]
								}
							]
						}
					]
				}
			]
		},
	]
}`

func TestParse(t *testing.T) {
	a, b := new(doc), new(doc)

	err := parseAST(gjson.Parse(docA), a, a.list())
	require.NoError(t, err)

	err = parseAST(gjson.Parse(docB), b, b.list())
	require.NoError(t, err)

	its := []*iterator{newIterator(a), newIterator(b)}

	for _, it := range its {
		for blk := it.Next(); blk != nil; blk = it.Next() {
			fmt.Println(blk.ID, blk.Parent.Block.ID, blk.Left.ID)
		}
	}
}
