package backend

import (
	"bytes"
)

type patchHeapItem struct {
	signedData [][]signedPatch
	data       [][]Patch
	arr        int
	idx        int
}

func (i patchHeapItem) SignedValue() signedPatch {
	return i.signedData[i.arr][i.idx]
}

func (i patchHeapItem) Value() Patch {
	if i.signedData != nil {
		return i.signedData[i.arr][i.idx].Patch
	}
	return i.data[i.arr][i.idx]
}

type patchHeap []patchHeapItem

func (h patchHeap) Len() int { return len(h) }
func (h patchHeap) Less(i, j int) bool {
	if h[i].signedData != nil {
		ii := h[i].SignedValue()
		jj := h[j].SignedValue()

		if ii.LamportTime == jj.LamportTime {
			return bytes.Compare(ii.peer.Bytes(), jj.peer.Bytes()) == -1
		}

		return ii.LamportTime < jj.LamportTime
	}
	return h[i].Value().Less(h[j].Value())
}
func (h patchHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }

func (h *patchHeap) Push(x interface{}) {
	*h = append(*h, x.(patchHeapItem))
}

func (h *patchHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}
