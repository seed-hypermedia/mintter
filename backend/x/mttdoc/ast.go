package mttdoc

import (
	"fmt"

	"github.com/tidwall/gjson"
)

func parseAST(list gjson.Result, doc *doc, l *list) (err error) {
	if !list.IsObject() {
		return fmt.Errorf("passed list that is not JSON object")
	}

	if doc.Blocks == nil {
		doc.Blocks = make(map[string]*block)
	}

	list.ForEach(func(k, v gjson.Result) bool {
		ks := k.String()
		switch ks {
		case "type":
			l.Type = v.String()
		case "children":
			if !v.IsArray() {
				err = fmt.Errorf("blocks array is not a JSON array")
				return false
			}

			v.ForEach(func(_, blk gjson.Result) bool {
				err = parseBlock(blk, doc, l)
				return err == nil
			})
		default:
			if l.Attributes == nil {
				l.Attributes = make(map[string]gjson.Result)
			}
			l.Attributes[ks] = v
		}
		return true
	})

	return
}

func parseBlock(blk gjson.Result, doc *doc, l *list) (err error) {
	if !blk.IsObject() {
		return fmt.Errorf("passed JSON block is not a JSON object")
	}

	b := &block{
		Parent: l,
		Left:   listHeadBlock,
	}

	if size := len(l.Children); size > 0 {
		b.Left = l.Children[size-1]
	}

	blk.ForEach(func(k, v gjson.Result) bool {
		ks := k.String()
		switch ks {
		case "type":
			b.Type = v.String()
		case "id":
			b.ID = v.String()
			if doc.Blocks[v.String()] != nil {
				err = fmt.Errorf("block %s is already in the document", b.ID)
				return false
			}
		case "children":
			var idx int
			v.ForEach(func(_, child gjson.Result) bool {
				switch idx {
				case 0:
					b.Content = child.Get("@ugly").Raw
					// TODO parse content
				case 1:
					err = parseAST(child, doc, b.list())
					if err != nil {
						return false
					}
				default:
					err = fmt.Errorf("block %s has more than 2 children", blk.Get("id").String())
					return false
				}

				idx++

				return true
			})
			if err != nil {
				return false
			}
		default:
			if b.Attributes == nil {
				b.Attributes = make(map[string]gjson.Result)
			}

			b.Attributes[ks] = v
		}

		return true
	})

	doc.Blocks[b.ID] = b
	l.Children = append(l.Children, b)

	return
}
