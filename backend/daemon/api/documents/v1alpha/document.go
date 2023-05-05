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
	e           *hyper.Entity
	ts          hlc.Time
	signer      core.KeyPair
	delegation  cid.Cid
	draft       cid.Cid
	tree        *crdt.Tree
	patch       map[string]any
	moveLog     []string // block being moved
	oldBlockPos map[string]*crdt.Position
	done        bool
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
		oldBlockPos: make(map[string]*crdt.Position),
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

	// It's ok if we haven't found block in tree,
	// we only need this to compare with the resulting position
	// to detect if the block was actually moved or not.
	prevPos, _ := dm.tree.FindNodePosition(block)
	if _, ok := dm.oldBlockPos[block]; !ok {
		dm.oldBlockPos[block] = prevPos
	}

	ref, err := dm.tree.FindChildPosition(parent, left)
	if err != nil {
		return err
	}

	if err := dm.tree.Integrate(crdt.ID{
		Clock: int(dm.ts.Pack()),
		Idx:   len(dm.moveLog),
	}, block, parent, ref); err != nil {
		return err
	}

	nowPos, err := dm.tree.FindNodePosition(block)
	if err != nil {
		return fmt.Errorf("can't find block position after move: %w", err)
	}

	moved := prevPos != nowPos
	if !moved {
		return nil
	}

	dm.moveLog = append(dm.moveLog, block)

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

func (dm *documentMutation) compressMoves() []any {
	out := make([]any, len(dm.moveLog))
	j := len(out)

	seen := make(map[string]struct{}, len(dm.moveLog))
	for i := len(dm.moveLog) - 1; i >= 0; i-- {
		blk := dm.moveLog[i]
		if _, ok := seen[blk]; ok {
			continue
		}
		seen[blk] = struct{}{}
		// check if really moved
		pos, err := dm.tree.FindNodePosition(blk)
		if err != nil {
			panic("BUG: can't find node position in the tree")
		}

		// Check if really moved or not.
		oldPos := dm.oldBlockPos[blk]
		if oldPos != nil &&
			(oldPos.List() == pos.List() && oldPos.Ref() == pos.Ref()) {
			continue
		}

		ref := pos.Ref()

		parent := pos.ListID()
		if parent == crdt.RootNodeID {
			parent = ""
		}

		at := ref.Site

		moveOp := map[string]any{"b": blk}
		if parent != "" {
			moveOp["p"] = parent
		}
		if at != "" {
			moveOp["@"] = at
		}
		fmt.Println("block", blk, "was really moved", pos.Ref())

		j--
		out[j] = []any{moveOp}
	}
	return out[j:]
}

func (dm *documentMutation) Commit(ctx context.Context, bs *hyper.Storage) (hb hyper.Blob, err error) {
	// TODO(burdiyan): we should make them reusable.
	if dm.done {
		return hb, fmt.Errorf("using already committed mutation")
	}

	dm.done = true

	panic("TODO add moves")

	hb, err = dm.e.CreateChange(dm.ts, dm.signer, dm.delegation, dm.patch)
	if err != nil {
		return hb, err
	}

	return hb, bs.SaveDraftBlob(ctx, hb)
}
