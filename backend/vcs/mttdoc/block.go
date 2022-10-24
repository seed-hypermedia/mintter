package mttdoc

import (
	"mintter/backend/crdt"
	"mintter/backend/vcs"
)

type BlockInfo struct {
	Type        string
	Text        string
	Attributes  map[string]any
	Annotations []Annotation
}

type Annotation struct {
	Type       string
	Attributes map[string]any
	Starts     []int32
	Ends       []int32
}

type BlockMove struct {
	Block    vcs.NodeID
	Parent   vcs.NodeID
	Position crdt.ID
}
