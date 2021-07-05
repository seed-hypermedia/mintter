package document

import (
	"context"
	"fmt"
	"strings"
	"time"

	v2 "mintter/backend/api/v2"
	"mintter/backend/identity"

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

func init() {
	cbornode.RegisterCborType(pidAtlas)

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
	documentMeta
	RefList *refList
	Blocks  map[string]block   `refmt:",omitempty"`
	Sources map[string]cid.Cid `refmt:",omitempty"`
}

type documentMeta struct {
	ID          cid.Cid
	Title       string
	Subtitle    string
	Author      identity.ProfileID
	Parent      cid.Cid `refmt:",omitempty"`
	CreateTime  time.Time
	UpdateTime  time.Time
	PublishTime time.Time
}

func (doc document) resolveBlock(ctx context.Context, store *store, ref fullBlockRef) (block, error) {
	if ref.IsTransclusion {
		src, err := store.Get(ctx, ref.Version)
		if err != nil {
			return block{}, err
		}

		blk, ok := src.Blocks[ref.BlockID]
		if !ok {
			return block{}, fmt.Errorf("no block with ID '%s' in the source doc blocks map", ref.BlockID)
		}

		return blk, nil
	}

	blk, ok := doc.Blocks[ref.MapKey]
	if !ok {
		return block{}, fmt.Errorf("no block with ID '%s' in the local blocks map", ref.BlockID)
	}

	return blk, nil
}

func (doc document) parseRefPointer(p string) (fullBlockRef, error) {
	parts := strings.Split(p, "/")

	if parts[0] != "#" {
		return fullBlockRef{}, fmt.Errorf("invalid ref '%s': first segment must be '#'", p)
	}

	space := parts[1]

	switch space {
	case "blocks": // #/blocks/<block-id>
		if len(parts) != 3 {
			return fullBlockRef{}, fmt.Errorf("invalid ref pointer '%s': local pointers must follow this patter '#/blocks/<block-id>'", p)
		}
		key := parts[2]
		blk, ok := doc.Blocks[key]
		if !ok {
			return fullBlockRef{}, fmt.Errorf("failed to resolve ref pointer '%s': no such key in the blocks map '%s'", p, key)
		}

		return fullBlockRef{
			Version: cid.Undef,
			BlockID: blk.ID,
			MapKey:  key,
		}, nil
	case "sources": // #/sources/<version>/blocks/<block-id>
		if len(parts) != 5 {
			return fullBlockRef{}, fmt.Errorf("invalid ref pointer '%s': sources must follow this pattern '#/sources/<version>/blocks/<block-id>'", p)
		}
		key := parts[2]
		srcid, ok := doc.Sources[key]
		if !ok {
			return fullBlockRef{}, fmt.Errorf("failed to resolve ref pointer '%s': no such key in the sources map '%s", p, key)
		}

		if parts[3] != "blocks" {
			return fullBlockRef{}, fmt.Errorf("invalid ref '%s': can only resolve 'blocks' after 'sources'", p)
		}

		blkID := parts[4]

		return fullBlockRef{
			Version:        srcid,
			BlockID:        blkID,
			IsTransclusion: true,
			MapKey:         key,
		}, nil
	default:
		return fullBlockRef{}, fmt.Errorf("invalid ref '%s': space '%s' is unknown: must be either 'blocks' or 'sources'", p, space)
	}
}

type refList struct {
	ListStyle listStyle `refmt:",omitempty"`
	Refs      []blockRef
}

func (rl *refList) ForEachRef(fn func(ref blockRef) error) error {
	if rl == nil {
		return nil
	}

	for _, ref := range rl.Refs {
		if err := fn(ref); err != nil {
			return err
		}

		if err := ref.RefList.ForEachRef(fn); err != nil {
			return err
		}
	}

	return nil
}

func (rl *refList) IsEmpty() bool {
	return rl == nil || len(rl.Refs) == 0
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

type fullBlockRef struct {
	Version        cid.Cid
	BlockID        string
	IsTransclusion bool
	MapKey         string
}

func (fbr fullBlockRef) String() string {
	if fbr.Version.Defined() {
		return fbr.Version.String() + "/" + fbr.BlockID
	}

	return fbr.BlockID
}
