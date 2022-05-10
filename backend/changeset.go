package backend

import (
	"container/heap"
	"fmt"
	"mintter/backend/core"

	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/proto"
)

type changeset struct {
	obj  cid.Cid
	size int
	pos  int
	// TODO: patch body can contain multiple operations. Should we consider them as a separate lamport clock value?
	lamportTime uint64
	logTime     uint64
	heap        heap.Interface
	byPeer      [][]signedPatch
	deps        []cid.Cid
	seqs        map[cid.Cid]uint64
}

func newChangeset(obj cid.Cid, byPeer [][]signedPatch) *changeset {
	s := changeset{
		obj:    obj,
		byPeer: byPeer,
		seqs:   make(map[cid.Cid]uint64, len(byPeer)),
	}

	if len(byPeer) > 0 {
		s.deps = make([]cid.Cid, len(byPeer))
	}

	h := make(patchHeap, 0, len(byPeer))
	s.heap = &h
	heap.Init(s.heap)

	for i, p := range byPeer {
		heap.Push(s.heap, patchHeapItem{signedData: byPeer, arr: i, idx: 0})
		s.size += len(p)
		s.deps[i] = p[len(p)-1].cid
	}

	return &s
}

// IsEmpty checks wether CRDT state is empty.
func (s *changeset) IsEmpty() bool {
	return s.size == 0
}

// Merge the underlying logs from multiple peers according to their logical timestamps.
// This is a convenience function. For more efficiency use the iterator methods provided by this type.
func (s *changeset) Merge() []signedPatch {
	if s.size == 0 {
		return nil
	}

	out := make([]signedPatch, s.size)
	var i int
	for s.Next() {
		out[i] = s.Item()
		i++
	}

	return out
}

// Next checks if there's another item in the iterator.
func (s *changeset) Next() bool {
	return s.heap.Len() != 0
}

// Item returns the item on the current position of the iterator.
func (s *changeset) Item() signedPatch {
	curr := heap.Pop(s.heap).(patchHeapItem)

	if !curr.SignedValue().ObjectID.Equals(s.obj) {
		panic("BUG: not the same object want: " + s.obj.String() + " got: " + curr.SignedValue().ObjectID.String())
	}

	sp := curr.SignedValue()

	if sp.LamportTime > s.lamportTime {
		s.lamportTime = sp.LamportTime
	}

	if curr.idx+1 < len(curr.signedData[curr.arr]) {
		heap.Push(s.heap, patchHeapItem{signedData: curr.signedData, arr: curr.arr, idx: curr.idx + 1})
	}

	s.pos++
	s.seqs[sp.peer] = sp.Seq
	s.logTime++

	return sp
}

// NewPatch creates a new patch with the dependencies and logical timestamps that were in the CRDT state.
// This must only be called after iterating over all the existing patches, otherwise it will panic.
func (s *changeset) NewPatch(author cid.Cid, key core.KeyPair, k PatchKind, body []byte) (signedPatch, error) {
	if s.pos != s.size {
		panic("BUG: must call new patch only after iterating over all the existing patches")
	}

	peer := key.CID()

	p := Patch{
		Author:      author,
		ObjectID:    s.obj,
		Seq:         s.seqs[peer] + 1,
		LamportTime: s.lamportTime + 1,
		LogTime:     s.logTime + 1,
		Kind:        k,
		Body:        body,
		CreateTime:  nowFunc(),
	}

	if len(s.deps) > 0 {
		p.Deps = make([]cid.Cid, len(s.deps))
		copy(p.Deps, s.deps)
	}

	signed, err := signPatch(p, key)
	if err != nil {
		return signedPatch{}, fmt.Errorf("failed to save patch: %w", err)
	}

	s.lamportTime++
	s.logTime++
	s.seqs[peer]++
	s.deps = s.deps[:0]
	s.deps = append(s.deps, signed.cid)

	return signed, nil
}

func (s *changeset) NewProtoPatch(author cid.Cid, key core.KeyPair, msg proto.Message) (signedPatch, error) {
	var (
		data []byte
		err  error
	)

	if vtmsg, ok := msg.(interface{ MarshalVT() ([]byte, error) }); ok {
		data, err = vtmsg.MarshalVT()
	} else {
		data, err = proto.Marshal(msg)
	}

	if err != nil {
		return signedPatch{}, err
	}

	return s.NewPatch(author, key, PatchKind(proto.MessageName(msg)), data)
}
