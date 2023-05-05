package documents

import (
	"context"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/crdt"
	"mintter/backend/hyper"
	"mintter/backend/vcs/hlc"
	"time"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

// This is very ugly and type-unsafe code.
// Can do better, but no time.

type documentMutation struct {
	e            *hyper.Entity
	ts           hlc.Time
	signer       core.KeyPair
	delegation   cid.Cid
	draft        cid.Cid
	tree         *crdt.Tree
	patch        map[string]any
	currentMoves []moveOp
	movedBlocks  map[string]any

	done bool
}

func newDocumentMutation(e *hyper.Entity, signer core.KeyPair, delegation cid.Cid, draft cid.Cid) (*documentMutation, error) {
	if !draft.Defined() && len(e.AppliedChanges()) > 0 {
		return nil, fmt.Errorf("must specify draft when mutating document with existing changes")
	}

	if len(e.AppliedChanges()) > 0 {
		panic("TODO mutate with existing changes")
	}

	if draft.Defined() {
		panic("TODO mutate existing draft")
	}

	if draft.Defined() {
		_, ok := e.AppliedChanges()[draft]
		if !ok {
			return nil, fmt.Errorf("draft %s is not applied to entity %s", draft, e.ID())
		}

		heads := e.Heads()
		if len(heads) > 1 {
			panic("TODO: implement concurrent heads")
		}

		if _, ok := heads[draft]; !ok {
			return nil, fmt.Errorf("specified draft must be the head change")
		}
	}

	if !delegation.Defined() {
		return nil, fmt.Errorf("must provide delegation to mutate a document")
	}

	dm := &documentMutation{
		e:           e,
		ts:          e.NextTimestamp(),
		draft:       draft,
		signer:      signer,
		delegation:  delegation,
		tree:        crdt.NewTree(crdt.NewVectorClock()),
		patch:       map[string]any{},
		movedBlocks: map[string]any{},
	}

	return dm, nil
}

func (dm *documentMutation) SetCreateTime(ct time.Time) error {
	_, ok := dm.e.Get("createTime")
	if ok {
		return fmt.Errorf("create time is already set")
	}

	dm.patch["createTime"] = ct.Unix()

	return nil
}

func (dm *documentMutation) SetAuthor(author core.Principal) error {
	_, ok := dm.e.Get("author")
	if ok {
		return fmt.Errorf("author is already set")
	}

	dm.patch["author"] = []byte(author)

	return nil
}

func (dm *documentMutation) SetTitle(title string) error {
	v, ok := dm.e.Get("title")
	if ok && v.(string) == title {
		return nil
	}

	dm.patch["title"] = title
	return nil
}

func (dm *documentMutation) MoveBlock(block, parent, left string) error {
	if dm.draft.Defined() {
		panic("TODO set block position with existing changes")
	}

	prevParent, prevPos, _ := dm.tree.FindNodePositionOld(block)

	ref, err := dm.tree.FindChildPosition(parent, left)
	if err != nil {
		return err
	}

	if err := dm.tree.Integrate(crdt.ID{
		Clock: int(dm.ts.Pack()),
		Idx:   len(dm.currentMoves),
	}, block, parent, ref); err != nil {
		return err
	}

	nowParent, nowPos, err := dm.tree.FindNodePositionOld(block)
	if err != nil {
		return fmt.Errorf("can't find block position after move: %w", err)
	}

	moved := prevParent != nowParent || prevPos != nowPos
	if !moved {
		return nil
	}

	if ref.Site != "" {
		panic("TODO: anchor moves to other changes")
	}

	dm.currentMoves = append(dm.currentMoves, moveOp{
		Block:  block,
		Parent: parent,
		Left:   left,
	})

	return nil
}

type moveOp struct {
	Block  string `refmt:"b,omitempty"`
	Parent string `refmt:"p,omitempty"`
	Left   string `refmt:"l,omitempty"`
}

func init() {
	cbornode.RegisterCborType(moveOp{})
}

func (dm *documentMutation) cleanupMoves() []moveOp {
	cleanMoves := make([]moveOp, len(dm.currentMoves))
	seen := make(map[string]struct{}, len(dm.currentMoves))
	j := len(dm.currentMoves) - 1

	for i := len(dm.currentMoves) - 1; i >= 0; i-- {
		move := dm.currentMoves[i]
		if _, ok := seen[move.Block]; ok {
			continue
		}
		cleanMoves[j] = move
		seen[move.Block] = struct{}{}
		j--
	}

	dm.currentMoves = cleanMoves[j+1:]
	return dm.currentMoves
}

func (dm *documentMutation) Commit(ctx context.Context, bs *hyper.Storage) (hb hyper.Blob, err error) {
	// TODO(burdiyan): we should make them reusable.
	if dm.done {
		return hb, fmt.Errorf("using already committed mutation")
	}

	dm.done = true

	dm.patch["moves"] = map[string]any{
		"#list": dm.currentMoves,
	}

	hb, err = dm.e.Patch(dm.ts, dm.signer, dm.delegation, dm.patch)
	if err != nil {
		return hb, err
	}

	return hb, bs.SaveDraftBlob(ctx, hb)
}
