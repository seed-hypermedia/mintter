package document

import (
	"time"

	"mintter/backend/identity"
	v2 "mintter/proto/v2"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/polydawn/refmt/obj/atlas"
)

var pidAtlas = atlas.BuildEntry(identity.ProfileID{}).Transform().
	TransformMarshal(atlas.MakeMarshalTransformFunc(func(pid identity.ProfileID) ([]byte, error) {
		return pid.MarshalBinary()
	})).
	TransformUnmarshal(atlas.MakeUnmarshalTransformFunc(func(x []byte) (identity.ProfileID, error) {
		var pid identity.ProfileID
		return pid, pid.UnmarshalBinary(x)
	})).
	Complete()

var timeAtlas = atlas.BuildEntry(time.Time{}).Transform().
	TransformMarshal(atlas.MakeMarshalTransformFunc(func(t time.Time) (string, error) {
		return t.UTC().Format(time.RFC3339), nil
	})).
	TransformUnmarshal(atlas.MakeUnmarshalTransformFunc(func(in string) (time.Time, error) {
		return time.ParseInLocation(time.RFC3339, in, time.UTC)
	})).
	Complete()

func init() {
	cbornode.RegisterCborType(pidAtlas)
	cbornode.RegisterCborType(timeAtlas)

	cbornode.RegisterCborType(document{})
	cbornode.RegisterCborType(block{})
	cbornode.RegisterCborType(refList{})
	cbornode.RegisterCborType(blockRef{})
	cbornode.RegisterCborType(permanode{})
	cbornode.RegisterCborType(styleRange{})
}

type listStyle = v2.BlockRefList_Style

type versionedDoc struct {
	document
	Version cid.Cid
}

type document struct {
	ID          cid.Cid
	Title       string
	Subtitle    string
	Author      identity.ProfileID
	Parent      cid.Cid `refmt:",omitempty"`
	RefList     *refList
	Blocks      map[string]block   `refmt:",omitempty"`
	Sources     map[string]cid.Cid `refmt:",omitempty"`
	CreateTime  time.Time
	UpdateTime  time.Time
	PublishTime time.Time
}

type refList struct {
	ListStyle listStyle `refmt:",omitempty"`
	Refs      []blockRef
}

func (bl *refList) IsEmpty() bool {
	return bl == nil || len(bl.Refs) == 0
}

type blockRef struct {
	Pointer string
	RefList *refList `refmt:",omitempty"`
}

type block struct {
	ID          string       `refmt:",omitempty"`
	Text        string       `refmt:",omitempty"`
	StyleRanges []styleRange `refmt:",omitempty"`
}

type style int

const (
	styleUndefined style = 0
	styleBold      style = 1 << iota
	styleItalic
	styleMonospace
	styleUnderline
)

type styleRange struct {
	Offset int
	Length int
	Style  style
}

type permanode struct {
	Random     []byte
	CreateTime time.Time
}
