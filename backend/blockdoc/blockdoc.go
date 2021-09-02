// Package blockdoc provides access to the low-level Mintter Document data model.
// It cares about the structure of the document more than its semantics, hence
// one can think of it as even more abstract than the Mintter AST.
// It also implements a CRDT which allows multiple versions of a document to be merged.
//
// The data mode can be expressed in this pseudo-grammar (à la Ragel):
//
// DOCUMENT = LIST;
// LIST = BLOCK*;
// BLOCK = CONTENT LIST?;
// CONTENT = any*;
//
// Notice the recursion: list has blocks, and each block can have another list inside.
package blockdoc

import (
	"mintter/backend/crdt"
)

// Document is the root data type for the Mintter Document. It wraps a CRDT and it is itself a CRDT.
type Document struct {
	id     string
	siteID string
	tree   *crdt.Tree
	front  *crdt.Frontier
}

func NewDocument(docID, siteID string) *Document {
	front := crdt.NewFrontier()
	tree := crdt.NewTree(front)

	return &Document{
		id:     docID,
		siteID: siteID,
		tree:   tree,
		front:  front,
	}
}
