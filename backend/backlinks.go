package backend

import (
	"context"
	"mintter/backend/blockdoc"
)

type link struct {
	SourceDocID   string
	SourceBlockID string
	TargetDocID   string
	TargetBlockID string
}

type linkSet map[link]struct{}

func linksFromContent(ctx context.Context, data []byte) {
	walker := blockdoc.NewWalkHandlers()
	walker.HandleBlockContent = func(id, raw string) error {
		return nil
	}
}
