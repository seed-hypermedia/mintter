package providing

import (
	"context"

	"github.com/ipfs/go-cid"
	"github.com/tidwall/tinyqueue"
)

type heapItem struct {
	cid cid.Cid
	idx int
}

func (h heapItem) Less(hh tinyqueue.Item) bool {
	a, b := h.cid, hh.(heapItem).cid
	return a.KeyString() < b.KeyString()
}

// merge multiple cid channels into one. It assumes sources are sorted using IPFS blockstore semantics,
// see github.com/ipfs/go-ipfs-ds-help#MultihashToDsKey, which is used by blockstore.Blockstore for
// generating datastore keys. It's important to keep consistent sorting rules among different sources.
func merge(ctx context.Context, sources ...<-chan cid.Cid) <-chan cid.Cid {
	if len(sources) == 0 {
		panic("BUG: must provide at least one source")
	}

	if len(sources) == 1 {
		return sources[0]
	}

	// Using tinyqueue package here instead of container/heap, because its API is much more complex.
	heap := tinyqueue.New(make([]tinyqueue.Item, 0, len(sources)))

	advance := func(ctx context.Context, idx int) {
		select {
		case <-ctx.Done():
			return
		case c, ok := <-sources[idx]:
			if !ok {
				return
			}
			heap.Push(heapItem{cid: c, idx: idx})
		}
	}

	for i := range sources {
		advance(ctx, i)
	}

	out := make(chan cid.Cid)

	go func() {
		defer close(out)

		for {
			select {
			case <-ctx.Done():
				return
			default:
				v := heap.Pop()
				if v == nil {
					return
				}

				cur := v.(heapItem)
				out <- cur.cid

				advance(ctx, cur.idx)
			}
		}
	}()

	return out
}
