package document

import (
	"mintter/backend/crdt"
	"time"
)

type DocumentHandle struct {
	ID         string
	Author     string
	CreateTime time.Time
}

type DocumentState struct {
	ID         string
	Author     string
	Title      string
	Subtitle   string
	Blocks     map[string]Block
	Tree       *crdt.Tree
	CreateTime time.Time
	UpdateTime time.Time
	Version    int
}

func NewDocumentState(id, author string, createTime time.Time) *DocumentState {
	return &DocumentState{
		ID:         id,
		Title:      "",
		Subtitle:   "",
		Blocks:     make(map[string]Block),
		Tree:       crdt.NewTree(crdt.NewVectorClock()),
		CreateTime: createTime,
		UpdateTime: createTime,
		Version:    0,
	}
}

type Block struct {
	ID          string
	Type        string
	Attributes  map[string]string
	Annotations []Annotation
}

type Annotation struct {
	Type       string
	Attributes map[string]string
	Starts     int32
	Ends       int32
}

type DocumentOperation struct {
	SetTitle    string
	SetSubtitle string
	MoveBlock   struct {
		Block  string
		Parent string
		Left   string
	}
	DeleteBlock  string
	ReplaceBlock Block
}
