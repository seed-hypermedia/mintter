package mttdoc

import "github.com/tidwall/gjson"

const nullString = "<null>"

var gjsonNull = gjson.Result{Type: gjson.Null}

type docChange struct {
	SetTitle     string
	SetSubtitle  string
	BlockChanges []blockChange
}

type blockChange struct {
	ID string
	Op blockOp

	SetPosition   blockPosition
	SetType       string
	SetAttributes map[string]gjson.Result
	SetContent    string

	SetChildListType       string
	SetChildListAttributes map[string]gjson.Result
}

type blockPosition struct {
	Parent string
	Left   string
}

type blockOp byte

const (
	blockOpInsert blockOp = iota
	blockOpRetain
	blockOpDelete
)

func diff(source, target *doc) (res docChange) {
	if source.ID != target.ID {
		panic("diffing unrelated docs")
	}

	if source.Author != target.Author {
		panic("author can't change")
	}

	res.SetTitle = diffString(source.Title, target.Title)
	res.SetSubtitle = diffString(source.Subtitle, target.Subtitle)

	visited := make(map[string]struct{}, len(target.Blocks))

	it := newIterator(target)
	for blk := it.Next(); blk != nil; blk = it.Next() {
		visited[blk.ID] = struct{}{}
		old := source.Blocks[blk.ID]
		res.BlockChanges = append(res.BlockChanges, diffBlocks(old, blk))
	}

	it = newIterator(source)
	for blk := it.Next(); blk != nil; blk = it.Next() {
		if _, ok := visited[blk.ID]; ok {
			continue
		}
		res.BlockChanges = append(res.BlockChanges, diffBlocks(blk, nil))
	}

	return
}

func diffBlocks(source, target *block) blockChange {
	if source == nil && target == nil {
		panic("at least one block must be present for diffing")
	}

	var bc blockChange
	if source != nil {
		if source.ID == "" {
			panic("source block must have ID")
		} else {
			bc.ID = source.ID
		}
	}

	if target != nil {
		if target.ID == "" {
			panic("target block must have ID")
		}

		if bc.ID == "" {
			bc.ID = target.ID
		} else if bc.ID != target.ID {
			panic("diffing unrelated blocks")
		}
	}

	if source == nil {
		bc.Op = blockOpInsert
		bc.SetPosition.Parent = target.Parent.Block.ID
		bc.SetPosition.Left = target.Left.ID
		bc.SetType = target.Type
		bc.SetAttributes = copyAttributes(target.Attributes)
		bc.SetContent = target.Content

		if target.Children != nil {
			bc.SetChildListType = target.Children.Type
			bc.SetChildListAttributes = copyAttributes(target.Children.Attributes)
		}

		return bc
	}

	if target == nil {
		bc.Op = blockOpDelete
		return bc
	}

	bc.Op = blockOpRetain
	bc.SetPosition.Parent = target.Parent.Block.ID
	bc.SetPosition.Left = target.Left.ID
	bc.SetType = diffString(source.Type, target.Type)
	bc.SetAttributes = diffAttributes(source.Attributes, target.Attributes)
	bc.SetContent = diffString(source.Content, target.Content)

	if target.Children != nil {
		if source.Children == nil {
			bc.SetChildListType = target.Children.Type
			bc.SetChildListAttributes = copyAttributes(target.Children.Attributes)
		} else {
			bc.SetChildListType = diffString(source.Children.Type, target.Children.Type)
			bc.SetChildListAttributes = diffAttributes(source.Children.Attributes, target.Children.Attributes)
		}
	}

	return bc
}

func diffString(source, target string) string {
	if source == target {
		return ""
	}

	if target == "" {
		return nullString
	}

	return target
}

func patchString(source, target string) string {
	if target == nullString {
		return ""
	}

	if source == target {
		return source
	}

	return target
}

func diffAttributes(source, target map[string]gjson.Result) map[string]gjson.Result {
	if source == nil {
		return copyAttributes(target)
	}

	if target == nil {
		out := make(map[string]gjson.Result, len(source))

		for k := range source {
			out[k] = gjsonNull
		}

		return out
	}

	out := make(map[string]gjson.Result)

	for k, v := range target {
		s := source[k]

		if s.Raw == v.Raw {
			continue
		}

		out[k] = v
	}

	for k := range source {
		if _, ok := out[k]; ok {
			continue
		}

		out[k] = gjsonNull
	}

	return out
}

func copyAttributes(m map[string]gjson.Result) map[string]gjson.Result {
	if m == nil {
		return nil
	}

	out := make(map[string]gjson.Result, len(m))

	for k, v := range m {
		out[k] = v
	}

	return out
}
