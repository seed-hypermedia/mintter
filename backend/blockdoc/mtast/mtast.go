// Package mtast provides tools for working with UnifiedJS-compatible Mintter AST.
package mtast

import (
	"fmt"

	"mintter/backend/blockdoc"

	"github.com/tidwall/gjson"
)

func Walk(ast string, wlk blockdoc.WalkHandlers) error {
	list := gjson.Parse(ast)
	if !list.IsObject() {
		return fmt.Errorf("root AST node must be object")
	}

	return walkList(wlk, "", list, 0)
}

func walkList(wlk blockdoc.WalkHandlers, id string, list gjson.Result, depth int) error {
	if err := wlk.HandleListStart(id); err != nil {
		return err
	}

	var children gjson.Result

	err := forEach(list, func(k, v gjson.Result) error {
		ks := k.String()

		if ks == "children" {
			children = v
			return nil
		}

		return wlk.HandleListAttribute(id, ks, v.Value())
	})
	if err != nil {
		return err
	}

	err = forEach(children, func(k, v gjson.Result) error {
		return walkStatement(wlk, v, id, depth)
	})
	if err != nil {
		return err
	}

	return nil
}

func walkStatement(wlk blockdoc.WalkHandlers, blk gjson.Result, parent string, depth int) (err error) {
	id := blk.Get("id").String()

	defer func() {
		if err != nil {
			err = fmt.Errorf("failed to parse statement %s: %w", id, err)
		}
	}()

	if err := wlk.HandleBlockStart(id, parent, depth); err != nil {
		return err
	}

	if id == "" {
		return fmt.Errorf("statements must have IDs")
	}

	var children gjson.Result

	err = forEach(blk, func(k, v gjson.Result) error {
		ks := k.String()
		if ks == "id" {
			return nil
		}

		if ks == "children" {
			children = v
			return nil
		}

		return wlk.HandleBlockAttribute(id, ks, v.Value())
	})
	if err != nil {
		return err
	}

	var childCount int
	err = forEach(children, func(k, v gjson.Result) error {
		childCount++

		switch childCount {
		case 1:
			return wlk.HandleBlockContent(id, v.Get("@ugly").Raw)
		case 2:
			return walkList(wlk, id, v, depth+1)
		default:
			return fmt.Errorf("statements must not have more than 2 children")
		}
	})
	if err != nil {
		return err
	}

	return nil
}

// forEach is a convenience function on top of the default gjson's ForEach method.
// This one uses error instead of a boolean to stop the execution, which is
// more convenient to bubble errors up.
func forEach(obj gjson.Result, fn func(k, v gjson.Result) error) (err error) {
	obj.ForEach(func(k, v gjson.Result) bool {
		err = fn(k, v)
		return err == nil
	})

	return err
}
