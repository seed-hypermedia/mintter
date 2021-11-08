package core

import (
	"context"
	"time"

	"github.com/ipfs/go-cid"
)

type DraftRepository interface {
	LoadDraft(context.Context, cid.Cid) (*Document, error)
	SaveDraft(context.Context, *Document) error
	ListDrafts(ctx context.Context, limit int, cursor string)
}

type DraftList struct {
	Drafts     []*Document
	NextCursor string
}

type Document struct {
	Title      string
	Subtitle   string
	Author     AccountID
	Content    AST
	CreateTime time.Time
	UpdateTime time.Time
}

type Publication struct {
	Document
	Version     Version
	PublishTime time.Time
}

type Version interface{}

type AST interface{}
