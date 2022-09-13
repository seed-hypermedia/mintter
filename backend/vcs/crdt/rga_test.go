package crdt

import (
	"mintter/backend/pkg/must"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestList(t *testing.T) {
	l := NewRGA[string](opidLess)

	in := []struct {
		value string
		posid OpID
	}{
		{value: "b1", posid: makeOpID("a", 1)},
		{value: "b2", posid: makeOpID("a", 2)},
		{value: "b3", posid: makeOpID("a", 3)},
		{value: "b4", posid: makeOpID("a", 4)},
	}

	for _, tt := range in {
		_, err := l.Append(tt.posid, tt.value)
		require.NoError(t, err)
	}

	var count int
	for el := l.root.right; el != &l.root; el = el.right {
		count++
		require.Equal(t, in[count-1].value, el.value)
	}

	require.Equal(t, len(in), count)
}

func TestRGA(t *testing.T) {
	type atom struct {
		id    OpID
		ref   OpID
		value string
	}

	abc := []atom{
		{id: makeOpID("a", 1), ref: ListStart, value: "A"},
		{id: makeOpID("a", 2), ref: makeOpID("a", 1), value: "B"},
		{id: makeOpID("a", 3), ref: makeOpID("a", 2), value: "C"},
	}

	dog := []atom{
		{id: makeOpID("b", 3), ref: makeOpID("a", 1), value: "D"},
		{id: makeOpID("b", 4), ref: makeOpID("b", 3), value: "O"},
		{id: makeOpID("b", 5), ref: makeOpID("b", 4), value: "G"},
	}

	cat := []atom{
		{id: makeOpID("c", 4), ref: makeOpID("a", 1), value: "C"},
		{id: makeOpID("c", 5), ref: makeOpID("c", 4), value: "A"},
		{id: makeOpID("c", 6), ref: makeOpID("c", 5), value: "T"},
	}

	tests := [...][]atom{
		// AB D C C O A G T
		{abc[0], abc[1], dog[0], abc[2], cat[0], dog[1], cat[1], dog[2], cat[2]},
		// ABC DOG CAT
		{abc[0], abc[1], abc[2], dog[0], dog[1], dog[2], cat[0], cat[1], cat[2]},
		// ABC CAT DOG
		{abc[0], abc[1], abc[2], cat[0], cat[1], cat[2], dog[0], dog[1], dog[2]},
		// AB CA DO C T G
		{abc[0], abc[1], cat[0], cat[1], dog[0], dog[1], abc[2], cat[2], dog[2]},
	}

	want := "ACATDOGBC"

	for _, tt := range tests {
		rga := NewRGA[string](opidLess)
		for _, a := range tt {
			p, err := rga.findPos(a.ref)
			require.NoError(t, err)
			_, err = rga.integrate(a.id, p, a.value)
			require.NoError(t, err)
		}

		var b strings.Builder
		for el := rga.root.right; el != &rga.root; el = el.right {
			b.WriteString(el.value)
		}
		require.Equal(t, want, b.String())
	}
}

func TestRGADelete(t *testing.T) {
	l := NewRGA[string](opidLess)

	a := must.Do2(l.Insert(makeOpID("a", 1), ListStart, "a"))
	b := must.Do2(l.InsertAfter(makeOpID("a", 2), a, "b"))
	must.Do(l.Delete(a))
	require.Nil(t, b.PrevAlive())
}
