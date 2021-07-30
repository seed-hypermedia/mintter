package mttdoc

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"testing"

	libjson "encoding/json"

	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

var _ = litter.Config

func TestAST(t *testing.T) {

	data, err := ioutil.ReadFile("./testdata/in.json")
	require.NoError(t, err)

	json := gjson.ParseBytes(data)

	var doc Doc

	doc.Title = json.Get("title").String()
	doc.Subtitle = json.Get("subtitle").String()
	doc.Author = json.Get("author").String()
	doc.CreateTime = json.Get("createdAt").Time()
	doc.ID = json.Get("id").String()

	doc.List = walkList(json.Get("children.0"))

	var buf bytes.Buffer
	m := libjson.NewEncoder(&buf)
	m.SetIndent("", "  ")
	require.NoError(t, m.Encode(doc))

	fmt.Println(buf.String())
}

func walkList(json gjson.Result) *List {
	var l *List
	json.ForEach(func(k, v gjson.Result) bool {
		if l == nil {
			l = &List{}
		}

		switch k.String() {
		case "type":
			l.Type = v.String()
		case "children":
			fillStatements(l, v)
		}
		return true
	})
	return l
}

func fillStatements(l *List, json gjson.Result) {
	json.ForEach(func(_, each gjson.Result) bool {
		var s Statement
		each.ForEach(func(k, v gjson.Result) bool {
			key := k.String()

			switch key {
			case "id":
				s.ID = v.String()
			case "type":
				s.Type = v.String()
			case "children":
				fillStatementChildren(&s, v)
			default:
				if s.Attributes == nil {
					s.Attributes = make(map[string]interface{})
				}

				s.Attributes[key] = v.Value()
			}

			return true
		})

		l.Statements = append(l.Statements, s)

		return true
	})
}

func fillStatementChildren(s *Statement, json gjson.Result) {
	if !json.IsArray() {
		panic("Statement children is not array")
	}

	var i int
	json.ForEach(func(_, child gjson.Result) bool {
		switch i {
		case 0:
			s.Content = fillContent(child)
		case 1:
			s.List = walkList(child)
		default:
			panic("Unexpected children")
		}

		i++

		return true
	})
}

func fillContent(json gjson.Result) *Content {
	var c *Content
	json.ForEach(func(k, v gjson.Result) bool {
		if c == nil {
			c = &Content{}
		}
		key := k.String()

		switch key {
		case "type":
			c.Type = v.String()
		case "children":
			fillPhrasing(c, v)
		}

		return true
	})

	return c
}

func fillPhrasing(c *Content, json gjson.Result) {
	json.ForEach(func(_, child gjson.Result) bool {

		var p Phrasing

		t := child.Get("type").String()

		if t == "text" {
			var text Literal
			child.ForEach(func(k, v gjson.Result) bool {
				key := k.String()
				switch key {
				case "type":
					text.Type = v.String()
				case "value":
					text.Value = v.String()
				default:
					if text.Attributes == nil {
						text.Attributes = make(map[string]interface{})
					}

					text.Attributes[key] = v.Value()
				}
				return true
			})
			p = text
		} else {
			// Handle entity
			var entity Entity
			child.ForEach(func(k, v gjson.Result) bool {
				key := k.String()
				switch key {
				case "type":
					entity.Type = v.String()
				case "children":
					entity.Children = fillLiterals(v)
				default:
					if entity.Attributes == nil {
						entity.Attributes = make(map[string]interface{})
					}
					entity.Attributes[key] = v.Value()
				}

				return true
			})
			p = entity
		}

		c.Children = append(c.Children, p)

		return true
	})
}

func fillLiterals(json gjson.Result) (l []Literal) {
	json.ForEach(func(_, each gjson.Result) bool {
		var text Literal
		each.ForEach(func(k, v gjson.Result) bool {
			key := k.String()
			switch key {
			case "type":
				text.Type = v.String()
			case "value":
				text.Value = v.String()
			default:
				if text.Attributes == nil {
					text.Attributes = make(map[string]interface{})
				}

				text.Attributes[key] = v.Value()
			}
			return true
		})
		l = append(l, text)
		return true
	})
	return l
}
