package documents

import (
	"context"
	"encoding/json"
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/hlc"
	"mintter/backend/hyper"
	"mintter/backend/pkg/maputil"
	"sort"
	"strings"
	"time"

	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// WARNING! There's some very ugly type-unsafe code in here.
// Can do better, but no time for that now.

type docModel struct {
	e          *hyper.Entity
	signer     core.KeyPair
	delegation cid.Cid
	tree       *Tree
	patch      map[string]any
	oldDraft   cid.Cid
	oldChange  hyper.Change
	done       bool
	nextHLC    hlc.Time
	origins    map[string]cid.Cid // map of abbreviated origin hashes to actual cids; workaround, should not be necessary.
}

func newDocModel(e *hyper.Entity, signer core.KeyPair, delegation cid.Cid) (*docModel, error) {
	if !delegation.Defined() {
		return nil, fmt.Errorf("must provide delegation to mutate a document")
	}

	dm := &docModel{
		e:          e,
		signer:     signer,
		delegation: delegation,
		tree:       NewTree(),
		patch:      map[string]any{},
		origins:    make(map[string]cid.Cid),
	}

	for _, c := range e.AppliedChanges() {
		o := hyper.OriginFromCID(c.CID)
		dm.origins[o] = c.CID
	}

	if err := dm.replayMoves(); err != nil {
		return nil, err
	}

	return dm, nil
}

func (dm *docModel) restoreDraft(c cid.Cid, ch hyper.Change) (err error) {
	if len(dm.patch) != 0 {
		panic("BUG: restoring draft when patch is not empty")
	}
	dm.oldDraft = c
	dm.oldChange = ch

	if len(dm.e.Heads()) != len(ch.Deps) {
		return fmt.Errorf("failed to restore draft: state has %d heads while draft change has %d deps", len(dm.e.Heads()), len(ch.Deps))
	}

	for _, dep := range ch.Deps {
		_, ok := dm.e.Heads()[dep]
		if !ok {
			return fmt.Errorf("failed to restore draft: state doesn't have draft's dependency %s in its heads", dep)
		}
	}

	if ch.Patch != nil {
		dm.patch = ch.Patch
	}

	dm.nextHLC = dm.e.NextTimestamp()

	moves := dm.patch["moves"]
	delete(dm.patch, "moves")

	dm.e.State().ApplyPatch(dm.nextHLC.Pack(), "", dm.patch)

	if moves != nil {
		ops := moves.(map[string]any)["#list"].(map[string]any)["#ins"].([]any)
		for _, move := range ops {
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

	return nil
}

func (dm *docModel) replayMoves() (err error) {
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
				err = fmt.Errorf("failed move %v: %w", move, err)
				return false
			}
		}
		return true
	})
	if err != nil {
		return fmt.Errorf("failed to replay previous moves: %w", err)
	}

	return nil
}

func (dm *docModel) SetCreateTime(ct time.Time) error {
	_, ok := dm.e.Get("createTime")
	if ok {
		return fmt.Errorf("create time is already set")
	}

	dm.patch["createTime"] = int(ct.Unix())

	return nil
}

func (dm *docModel) SetAuthor(author core.Principal) error {
	_, ok := dm.e.Get("owner")
	if ok {
		return fmt.Errorf("author is already set")
	}

	dm.patch["owner"] = []byte(author)

	return nil
}

func (dm *docModel) SetTitle(title string) error {
	v, ok := dm.e.Get("title")
	if ok && v.(string) == title {
		return nil
	}

	dm.patch["title"] = title
	return nil
}

func (dm *docModel) SetWebURL(url string) error {
	v, ok := dm.e.Get("webURL")
	if ok && v.(string) == url {
		return nil
	}

	dm.patch["webURL"] = url
	return nil
}

func (dm *docModel) DeleteBlock(block string) error {
	_, err := dm.tree.MoveLocal(dm.nextHLC.Pack(), len(dm.tree.localMoves), block, TrashNodeID, "")
	return err
}

func (dm *docModel) ReplaceBlock(blk *documents.Block) error {
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

func (dm *docModel) MoveBlock(block, parent, left string) error {
	_, err := dm.tree.MoveLocal(dm.nextHLC.Pack(), len(dm.tree.localMoves), block, parent, left)
	return err
}

func (dm *docModel) Change() (hb hyper.Blob, err error) {
	// TODO(burdiyan): we should make them reusable.
	if dm.done {
		return hb, fmt.Errorf("using already committed mutation")
	}

	if dm.nextHLC.IsZero() {
		panic("BUG: next HLC time is zero")
	}

	dm.done = true

	dm.cleanupPatch()

	action := dm.oldChange.Action
	if action == "" {
		action = "Create"
	}

	return dm.e.CreateChange(dm.nextHLC, dm.signer, dm.delegation, dm.patch, hyper.WithAction(action))
}

func (dm *docModel) Commit(ctx context.Context, bs *hyper.Storage) (hb hyper.Blob, err error) {
	hb, err = dm.Change()
	if err != nil {
		return hb, err
	}

	if dm.oldDraft.Defined() {
		return hb, bs.ReplaceDraftBlob(ctx, dm.e.ID(), dm.oldDraft, hb)
	}

	return hb, bs.SaveDraftBlob(ctx, dm.e.ID(), hb)
}

func (dm *docModel) cleanupPatch() {
	// We want to only keep last move per each block touched in this change.
	// If blocks were moved but end up where they initially were - we don't want any moves.
	// If blocks were created and then deleted within the same change - we don't want to leave any traces.
	touched := make(map[string]struct{}, len(dm.tree.localMoves))
	for _, blk := range dm.tree.localMoves {
		if _, ok := touched[blk]; ok {
			continue
		}
		touched[blk] = struct{}{}
	}

	var moves []any

	it := dm.tree.Iterator()
	for n := it.Next(); n != nil; n = it.Next() {
		if _, ok := touched[n.id]; !ok {
			continue
		}

		// Handle move turnaround. If we move the block but it ends up in the same place
		// we don't need to generate move operations.
		curLeft := dm.tree.nodes[n.id].pos.Prev().Value.(ShadowPosition)
		oldPos := dm.tree.initialLefts[n.id]
		if oldPos != nil {
			oldLeft := oldPos.Value.(ShadowPosition)
			if curLeft.parent == oldLeft.parent && curLeft.shadowID == oldLeft.shadowID {
				continue
			}
		}

		parent := n.pos.Value.(ShadowPosition).parent
		leftShadow := n.pos.Prev().Value.(ShadowPosition).shadowID

		moves = append(moves, map[string]any{
			"b": n.id,
			"p": parent,
			"l": leftShadow,
		})
	}

	// Handle delete turnaround. If we created the block and then removed it
	// in the same change, then we don't want any trace of them.

	for next := dm.tree.nodes[TrashNodeID].children.Front().Next(); next != nil; next = next.Next() {
		blk, _, _ := strings.Cut(next.Value.(ShadowPosition).shadowID, "@")
		if _, ok := touched[blk]; !ok {
			continue
		}

		left := dm.tree.nodes[blk].pos.Prev().Value.(ShadowPosition)
		initialLeft := dm.tree.initialLefts[blk]
		if left.parent == TrashNodeID && initialLeft != nil && initialLeft.Value.(ShadowPosition).opid.Origin == "" {
			maputil.Delete(dm.patch, []string{"blocks", blk})
			continue
		}

		moves = append(moves, map[string]any{
			"b": blk,
			"p": TrashNodeID,
			"l": "",
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

func (dm *docModel) hydrate(ctx context.Context, blobs *hyper.Storage) (*documents.Document, error) {
	e := dm.e

	first := e.AppliedChanges()[0]

	createTime, ok := first.Data.Patch["createTime"].(int)
	if !ok {
		return nil, fmt.Errorf("document must have createTime field")
	}

	owner, ok := first.Data.Patch["owner"].([]byte)
	if !ok {
		return nil, fmt.Errorf("document must have owner field")
	}

	docpb := &documents.Document{
		Id:         e.ID().TrimPrefix("hm://d/"),
		Eid:        string(e.ID()),
		CreateTime: timestamppb.New(time.Unix(int64(createTime), 0)),
		Author:     core.Principal(owner).String(),
	}

	docpb.UpdateTime = timestamppb.New(e.LastChangeTime().Time())

	{
		v, ok := e.Get("title")
		if ok {
			docpb.Title = v.(string)
		}
	}

	{
		v, ok := e.Get("webURL")
		if ok {
			docpb.WebUrl = v.(string)
		}
	}

	// Loading editors is a bit cumbersome because we need to go over key delegations.
	{
		seenAccounts := map[string]struct{}{}
		seenDelegations := map[cid.Cid]struct{}{}
		for _, blob := range e.AppliedChanges() {
			ch := blob.Data
			del := ch.Delegation
			if !del.Defined() {
				return nil, fmt.Errorf("all document changes must have delegations")
			}
			if _, ok := seenDelegations[del]; ok {
				continue
			}

			var kd hyper.KeyDelegation
			if err := blobs.LoadBlob(ctx, del, &kd); err != nil {
				return nil, fmt.Errorf("failed to load key delegation: %w", err)
			}

			acc := kd.Issuer.String()
			if _, ok := seenAccounts[acc]; ok {
				continue
			}

			docpb.Editors = append(docpb.Editors, kd.Issuer.String())
			seenDelegations[del] = struct{}{}
			seenAccounts[acc] = struct{}{}
		}
		sort.Strings(docpb.Editors)
	}

	blockMap := map[string]*documents.BlockNode{}
	appendChild := func(parent string, child *documents.BlockNode) {
		if parent == "" {
			docpb.Children = append(docpb.Children, child)
			return
		}
		blk, ok := blockMap[parent]
		if !ok {
			panic("BUG: no parent " + parent + " was found yet while iterating")
		}
		blk.Children = append(blk.Children, child)
	}

	it := dm.tree.Iterator()
	for n := it.Next(); n != nil; n = it.Next() {
		sp := n.pos.Value.(ShadowPosition)
		parent := sp.parent
		id := n.id
		// TODO(burdiyan): block revision would change only if block itself was change.
		// If block is only moved it's revision won't change. Need to check if that's what we want.
		mm, origin, ok := dm.e.State().GetWithOrigin("blocks", id)
		if !ok {
			// If we got some moves but no block state
			// we just skip them, we don't want to blow up here.
			continue
		}

		oo := dm.origins[origin]
		if !oo.Defined() {
			oo = dm.oldDraft
		}

		blk, err := blockFromMap(id, oo.String(), mm.(map[string]any))
		if err != nil {
			return nil, err
		}
		child := &documents.BlockNode{Block: blk}
		appendChild(parent, child)
		blockMap[id] = child
	}

	return docpb, nil
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

func blockFromMap(id, revision string, v map[string]any) (*documents.Block, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}

	pb := &documents.Block{}
	if err := protojson.Unmarshal(data, pb); err != nil {
		return nil, err
	}
	pb.Id = id
	pb.Revision = revision

	return pb, nil
}
