package docmodel

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"seed/backend/core"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/hlc"
	"seed/backend/hyper"
	"seed/backend/pkg/colx"
	"sort"
	"strings"
	"time"

	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// WARNING! There's some very ugly type-unsafe code in here.
// Can do better, but no time for that now.

// Document is a mutable document.
type Document struct {
	e          *hyper.Entity
	signer     core.KeyPair
	delegation cid.Cid
	tree       *treeCRDT
	mut        *treeMutation
	patch      map[string]any
	oldDraft   cid.Cid
	oldChange  hyper.Change
	done       bool
	nextHLC    hlc.Timestamp
	origins    map[string]cid.Cid // map of abbreviated origin hashes to actual cids; workaround, should not be necessary.
	// Index for blocks that we've created in this change.
	createdBlocks map[string]struct{}
	// Blocks that we've deleted in this change.
	deletedBlocks map[string]struct{}
}

// Create a new document.
func Create(owner core.Identity, delegation cid.Cid) (*Document, error) {
	clock := hlc.NewClock()
	ts := clock.MustNow()
	now := ts.Time().Unix()

	docid, nonce := hyper.NewUnforgeableID("hm://d/", owner.Account().Principal(), nil, now)
	eid := hyper.EntityID(docid)

	entity := hyper.NewEntityWithClock(eid, clock)

	dm, err := New(entity, owner.DeviceKey(), delegation)
	if err != nil {
		return nil, err
	}

	dm.nextHLC = ts
	dm.patch["nonce"] = nonce
	dm.patch["createTime"] = int(now)
	dm.patch["owner"] = []byte(owner.Account().Principal())

	return dm, nil
}

// New creates a new mutable document.
func New(e *hyper.Entity, signer core.KeyPair, delegation cid.Cid) (*Document, error) {
	if !delegation.Defined() {
		return nil, fmt.Errorf("must provide delegation to mutate a document")
	}

	dm := &Document{
		e:             e,
		signer:        signer,
		delegation:    delegation,
		tree:          newTreeCRDT(),
		patch:         map[string]any{},
		origins:       make(map[string]cid.Cid),
		createdBlocks: make(map[string]struct{}),
		deletedBlocks: make(map[string]struct{}),
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

// RestoreDraft restores a draft from a change.
func (dm *Document) RestoreDraft(c cid.Cid, ch hyper.Change) (err error) {
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

	dm.e.State().ApplyPatch(int64(dm.nextHLC), "", dm.patch)

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

			if parent == TrashNodeID {
				if err := dm.DeleteBlock(block); err != nil {
					return fmt.Errorf("failed to replay a delete: %w", err)
				}
			} else {
				if err := dm.MoveBlock(block, parent, left); err != nil {
					return fmt.Errorf("failed to replay local moves: %w", err)
				}
			}
		}
	}

	return nil
}

func (dm *Document) replayMoves() (err error) {
	dm.e.State().ForEachListChunk([]string{"moves"}, func(time int64, origin string, items []any) bool {
		for idx, move := range items {
			mm := move.(map[string]any)
			block := mm["b"].(string)
			parent := mm["p"].(string)
			leftShadow := mm["l"].(string)
			left, leftOrigin, _ := strings.Cut(leftShadow, "@")
			if left != "" && leftOrigin == "" {
				leftOrigin = origin
			}

			if err = dm.tree.integrate(newOpID(origin, time, idx), block, parent, left, leftOrigin); err != nil {
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

// SetCreateTime sets the create time of the document.
func (dm *Document) SetCreateTime(ct time.Time) error {
	_, ok := dm.e.Get("createTime")
	if ok {
		return fmt.Errorf("create time is already set")
	}

	dm.patch["createTime"] = int(ct.Unix())

	return nil
}

// SetAuthor sets the author of the document.
func (dm *Document) SetAuthor(author core.Principal) error {
	_, ok := dm.e.Get("owner")
	if ok {
		return fmt.Errorf("author is already set")
	}

	dm.patch["owner"] = []byte(author)

	return nil
}

// SetTitle sets the title of the document.
func (dm *Document) SetTitle(title string) error {
	v, ok := dm.e.Get("title")
	if ok && v.(string) == title {
		return nil
	}

	dm.patch["title"] = title
	return nil
}

// DeleteBlock deletes a block.
func (dm *Document) DeleteBlock(block string) error {
	mut := dm.ensureMutation()
	me, err := mut.move(block, TrashNodeID, "")
	if err != nil {
		return err
	}

	if me == moveEffectMoved {
		dm.deletedBlocks[block] = struct{}{}
	}

	return nil
}

// ReplaceBlock replaces a block.
func (dm *Document) ReplaceBlock(blk *documents.Block) error {
	if blk.Id == "" {
		return fmt.Errorf("blocks must have ID")
	}

	blockMap, err := blockToMap(blk)
	if err != nil {
		return err
	}

	oldBlock, ok := dm.e.Get("blocks", blk.Id)
	if ok && reflect.DeepEqual(oldBlock, blockMap) {
		return nil
	}

	colx.ObjectSet(dm.patch, []string{"blocks", blk.Id, "#map"}, blockMap)

	return nil
}

// MoveBlock moves a block.
func (dm *Document) MoveBlock(block, parent, left string) error {
	if parent == TrashNodeID {
		panic("BUG: use DeleteBlock to delete a block")
	}

	mut := dm.ensureMutation()

	me, err := mut.move(block, parent, left)
	if err != nil {
		return err
	}

	switch me {
	case moveEffectCreated:
		dm.createdBlocks[block] = struct{}{}
	case moveEffectMoved:
		// We might move a block out of trash.
		delete(dm.deletedBlocks, block)
	}

	return nil
}

func (dm *Document) ensureMutation() *treeMutation {
	if dm.mut == nil {
		dm.mut = dm.tree.mutate()
	}

	return dm.mut
}

// Change creates a change.
func (dm *Document) Change() (hb hyper.Blob, err error) {
	// TODO(burdiyan): we should make them reusable.
	if dm.done {
		return hb, fmt.Errorf("using already committed mutation")
	}

	if dm.nextHLC == 0 {
		panic("BUG: next HLC time is zero")
	}

	dm.done = true

	dm.cleanupPatch()

	action := dm.oldChange.Action
	if action == "" {
		action = "Create"
	}

	if len(dm.patch) == 0 {
		dm.patch["isDraft"] = true
	}

	// Make sure to remove the dummy field created in the initial draft change.
	if len(dm.patch) > 1 {
		delete(dm.patch, "isDraft")
	}

	return dm.e.CreateChange(dm.nextHLC, dm.signer, dm.delegation, dm.patch, hyper.WithAction(action))
}

// Commit commits a change.
func (dm *Document) Commit(ctx context.Context, bs *hyper.Storage) (hb hyper.Blob, err error) {
	hb, err = dm.Change()
	if err != nil {
		return hb, err
	}

	if dm.oldDraft.Defined() {
		return hb, bs.ReplaceDraftBlob(ctx, dm.e.ID(), dm.oldDraft, hb)
	}

	return hb, bs.SaveDraftBlob(ctx, dm.e.ID(), hb)
}

func (dm *Document) cleanupPatch() {
	if dm.mut == nil {
		return
	}

	var moves []any
	dm.mut.forEachMove(func(block, parent, left, leftOrigin string) bool {
		var l string
		if left != "" {
			l = left + "@" + leftOrigin
		}
		moves = append(moves, map[string]any{
			"b": block,
			"p": parent,
			"l": l,
		})

		return true
	})

	// If we have some moves after cleaning up, add them to the patch.
	if moves != nil {
		dm.patch["moves"] = map[string]any{
			"#list": map[string]any{
				"#ins": moves,
			},
		}
	}

	// Remove state of those blocks that we created and deleted in the same change.
	for blk := range dm.deletedBlocks {
		if _, mustIgnore := dm.createdBlocks[blk]; mustIgnore {
			colx.ObjectDelete(dm.patch, []string{"blocks", blk})
			continue
		}
	}

	// Remove the blocks key from the patch if we end up with no blocks after cleanup.
	if blocks, ok := dm.patch["blocks"].(map[string]any); ok {
		if len(blocks) == 0 {
			delete(dm.patch, "blocks")
		}
	}
}

// Entity returns the underlying entity.
func (dm *Document) Entity() *hyper.Entity {
	return dm.e
}

// Hydrate hydrates a document.
func (dm *Document) Hydrate(ctx context.Context, blobs *hyper.Storage) (*documents.Document, error) {
	if dm.mut != nil {
		panic("BUG: can't hydrate a document with uncommitted changes")
	}

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
		Id:              string(e.ID()),
		CreateTime:      timestamppb.New(time.Unix(int64(createTime), 0)),
		Author:          core.Principal(owner).String(),
		Version:         e.Version().String(),
		PreviousVersion: hyper.NewVersion(e.Deps()...).String(),
	}

	docpb.UpdateTime = timestamppb.New(e.LastChangeTime().Time())

	{
		v, ok := e.Get("title")
		if ok {
			docpb.Title = v.(string)
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

	var err error
	dm.tree.mutate().walkDFT(func(m *move) bool {
		// TODO(burdiyan): block revision would change only if block itself was changed.
		// If block is only moved it's revision won't change. Need to check if that's what we want.
		mm, origin, ok := dm.e.State().GetWithOrigin("blocks", m.Block)
		if !ok {
			// If we got some moves but no block state
			// we just skip them, we don't want to blow up here.
			return true
		}

		oo := dm.origins[origin]
		if !oo.Defined() {
			oo = dm.oldDraft
		}

		var blk *documents.Block
		blk, err = blockFromMap(m.Block, oo.String(), mm.(map[string]any))
		if err != nil {
			return false
		}

		child := &documents.BlockNode{Block: blk}
		appendChild(m.Parent, child)
		blockMap[m.Block] = child

		return true
	})
	if err != nil {
		return nil, err
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
