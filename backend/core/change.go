package core

import (
	"bytes"
	"context"
	"mintter/backend/sqlitedb"
	"time"

	"github.com/ipfs/go-cid"
)

type BlockGetter interface{}

func ResolveChanges(existing *Changes, heads []cid.Cid, bg BlockGetter) (*Changes, error) {

	// Calculate missing changes
	// Fetch missing changes.
	// Verify signatures.
	// Merge changesets and return.

	return nil, nil
}

type ObjectDeclaration struct {
	Kind       string
	Rand       []byte
	CreateTime time.Time
}

type Change struct {
	Author      AccountID
	ObjectID    cid.Cid
	Parents     []cid.Cid
	Seq         uint64
	LamportTime uint64
	LogTime     uint64
	Kind        string
	Body        []byte
	Message     string
	CreateTime  time.Time
}

func (c Change) Less(cc Change) bool {
	if c.LamportTime == cc.LamportTime {
		return bytes.Compare(c.Author.Bytes(), cc.Author.Bytes()) == -1
	}

	return c.LamportTime < cc.LamportTime
}

type Changes struct {
	ObjectID cid.Cid

	existing []Change
	ditry    []Change
}

func (cs *Changes) HasChange(c cid.Cid) bool {
	// TODO
	return true
}

/*
TODO
Latest idea. Changes is the ultimate domain entity. Everything else is index.
Define functions to convert entities to/from Changes.
type ChangeStore interface {
	SaveChanges(context.Context, Changes) error
	Load heads for this object. Determine new change/s to be inserted. Insert changes.

}
*/

type ChangeSaver interface {
	SaveChanges(context.Context, Changes) error
}

type sqliteChangeSaver struct {
	db *sqlitedb.Store
}

func (s *sqliteChangeSaver) SaveChanges(ctx context.Context, c Changes) error {

	return nil
}
