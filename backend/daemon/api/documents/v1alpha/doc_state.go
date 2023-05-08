package documents

import (
	"context"
	"encoding/json"
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/pkg/maputil"
	"mintter/backend/vcs/hlc"
	"strings"
	"time"

	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/encoding/protojson"
)

// WARNING! There's some very ugly type-unsafe code in here.
// Can do better, but no time for that now.

type draftMutation struct {
	e          *hyper.Entity
	ts         hlc.Time
	signer     core.KeyPair
	delegation cid.Cid
	prevDraft  cid.Cid
	tree       *Tree
	patch      map[string]any
	done       bool
}

func newDraftMutation(e *hyper.Entity, signer core.KeyPair, delegation cid.Cid) (*draftMutation, error) {
	if !delegation.Defined() {
		return nil, fmt.Errorf("must provide delegation to mutate a document")
	}

	if len(e.AppliedChanges()) > 1 {
		panic("TODO: mutate with existing changes")
	}

	if len(e.Heads()) > 1 {
		panic("BUG: more than one draft head")
	}

	var prevDraft cid.Cid
	for k := range e.Heads() {
		prevDraft = k
	}

	dm := &draftMutation{
		e:          e,
		ts:         e.NextTimestamp(),
		prevDraft:  prevDraft,
		signer:     signer,
		delegation: delegation,
		tree:       NewTree(),
		patch:      map[string]any{},
	}

	if err := dm.restorePrevDraft(); err != nil {
		return nil, fmt.Errorf("failed to replay moves: %w", err)
	}

	return dm, nil
}

func (dm *draftMutation) restorePrevDraft() (err error) {
	// We need to "unapply" the previous draft from the CRDT state.
	// There should be a better way to do it.
	if dm.prevDraft.Defined() {
		ch := dm.e.AppliedChanges()[dm.prevDraft]
		dm.e.State().ForgetState(ch.HLCTime.Pack(), hyper.OriginFromCID(dm.prevDraft))
	}

	dm.e.State().ForEachListChunk([]string{"moves"}, func(time int64, origin string, items []any) bool {
		for idx, move := range items {
			mm := move.(map[string]any)
			block := mm["b"].(string)
			parent := mm["p"].(string)
			leftShadow := mm["l"].(string)
			if strings.HasSuffix(leftShadow, "@") {
				leftShadow += origin
			}
			_, err = dm.tree.MoveRemote(NewOpID(time, origin, idx), block, parent, leftShadow)
			if err != nil {
				return false
			}
		}
		return true
	})
	if err != nil {
		return fmt.Errorf("failed to replay previous moves: %w", err)
	}

	if !dm.prevDraft.Defined() {
		return nil
	}

	oldDraft := dm.e.AppliedChanges()[dm.prevDraft]
	dm.patch = oldDraft.Patch
	if dm.patch["moves"] != nil {
		moves := dm.patch["moves"].(map[string]any)["#list"].(map[string]any)["#ins"].([]any)
		for _, move := range moves {
			mm := move.(map[string]any)
			block := mm["b"].(string)
			parent := mm["p"].(string)
			left := mm["l"].(string)
			parts := strings.Split(left, "@")
			if len(parts) > 0 {
				left = parts[0]
			}

			if err := dm.MoveBlock(block, parent, left); err != nil {
				return fmt.Errorf("failed to replay local moves: %w", err)
			}
		}
	}

	delete(dm.patch, "moves")

	return err
}

func (dm *draftMutation) SetCreateTime(ct time.Time) error {
	_, ok := dm.e.Get("createTime")
	if ok {
		return fmt.Errorf("create time is already set")
	}

	dm.patch["createTime"] = ct.Unix()

	return nil
}

func (dm *draftMutation) SetAuthor(author core.Principal) error {
	_, ok := dm.e.Get("author")
	if ok {
		return fmt.Errorf("author is already set")
	}

	dm.patch["author"] = []byte(author)

	return nil
}

func (dm *draftMutation) SetTitle(title string) error {
	v, ok := dm.e.Get("title")
	if ok && v.(string) == title {
		return nil
	}

	dm.patch["title"] = title
	return nil
}

func (dm *draftMutation) SetWebURL(url string) error {
	v, ok := dm.e.Get("webURL")
	if ok && v.(string) == url {
		return nil
	}

	dm.patch["webURL"] = url
	return nil
}

func (dm *draftMutation) DeleteBlock(block string) error {
	_, err := dm.tree.MoveLocal(dm.ts.Pack(), len(dm.tree.localMoves), block, TrashNodeID, "")
	return err
}

func (dm *draftMutation) ReplaceBlock(blk *documents.Block) error {
	if blk.Id == "" {
		return fmt.Errorf("blocks must have ID")
	}
	v, err := blockToMap(blk)
	if err != nil {
		return err
	}

	maputil.Set(dm.patch, []string{"blocks", blk.Id, "#map"}, v)

	return nil
}

func (dm *draftMutation) MoveBlock(block, parent, left string) error {
	_, err := dm.tree.MoveLocal(dm.ts.Pack(), len(dm.tree.localMoves), block, parent, left)
	if err != nil {
		return err
	}
	return nil
}

func (dm *draftMutation) Commit(ctx context.Context, bs *hyper.Storage) (hb hyper.Blob, err error) {
	// TODO(burdiyan): we should make them reusable.
	if dm.done {
		return hb, fmt.Errorf("using already committed mutation")
	}

	dm.done = true

	dm.cleanupPatch()

	hb, err = dm.e.CreateChange(dm.ts, dm.signer, dm.delegation, dm.patch)
	if err != nil {
		return hb, err
	}

	if dm.prevDraft.Defined() {
		return hb, bs.ReplaceDraftBlob(ctx, dm.e.ID(), dm.prevDraft, hb)
	}

	return hb, bs.SaveDraftBlob(ctx, dm.e.ID(), hb)
}

func (dm *draftMutation) cleanupPatch() {
	// We want to only keep last move per each block touched in this change.
	// If blocks were moved but end up where they initially were - we don't want any moves.
	// If blocks were created and then deleted within the same change - we don't want to leave any traces.

	touchedBlocks := dm.tree.CompressLocalMoves()
	if len(touchedBlocks) == 0 {
		return
	}
	moves := make([]any, 0, len(touchedBlocks))
	for _, blk := range touchedBlocks {
		left := dm.tree.nodes[blk].pos.Prev().Value.(ShadowPosition)
		if left.parent == TrashNodeID && dm.tree.initialLefts[blk].Value.(ShadowPosition).opid.Origin == "" {
			maputil.Delete(dm.patch, []string{"blocks", blk})
			continue
		}
		moves = append(moves, map[string]any{
			"b": blk,
			"p": left.parent,
			"l": left.shadowID,
		})
	}

	if len(moves) == 0 {
		return
	}

	dm.patch["moves"] = map[string]any{
		"#list": map[string]any{
			"#ins": moves,
		},
	}
}

func blockToMap(blk *documents.Block) (map[string]any, error) {
	// This is a very bad way to convert something into a map,
	// but mapstructure package could have problems here,
	// because protobuf have peculiar encoding of oneof fields into JSON,
	// which mapstructure doesn't know about. Although in fact we don't have
	// any oneof fields in this structure, but just in case.
	data, err := protojson.Marshal(blk)
	if err != nil {
		return nil, err
	}

	var v map[string]any
	if err := json.Unmarshal(data, &v); err != nil {
		return nil, err
	}

	// We don't want those fields, because they can be inferred.
	delete(v, "revision")
	delete(v, "id")

	return v, nil
}
