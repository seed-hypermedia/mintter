package crdt

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestList(t *testing.T) {
	l := newList("testing")

	in := []struct {
		value string
		posid ID
	}{
		{value: "b1", posid: ID{"a", 1, 0}},
		{value: "b2", posid: ID{"a", 2, 0}},
		{value: "b3", posid: ID{"a", 3, 0}},
		{value: "b4", posid: ID{"a", 4, 0}},
	}

	for _, tt := range in {
		_, err := l.append(tt.posid, tt.value)
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
		id    ID
		ref   ID
		value string
	}

	abc := []atom{
		{id: ID{Origin: "a", Clock: 1}, ref: listStart, value: "A"},
		{id: ID{Origin: "a", Clock: 2}, ref: ID{Origin: "a", Clock: 1}, value: "B"},
		{id: ID{Origin: "a", Clock: 3}, ref: ID{Origin: "a", Clock: 2}, value: "C"},
	}

	dog := []atom{
		{id: ID{Origin: "b", Clock: 3}, ref: ID{Origin: "a", Clock: 1}, value: "D"},
		{id: ID{Origin: "b", Clock: 4}, ref: ID{Origin: "b", Clock: 3}, value: "O"},
		{id: ID{Origin: "b", Clock: 5}, ref: ID{Origin: "b", Clock: 4}, value: "G"},
	}

	cat := []atom{
		{id: ID{Origin: "c", Clock: 4}, ref: ID{Origin: "a", Clock: 1}, value: "C"},
		{id: ID{Origin: "c", Clock: 5}, ref: ID{Origin: "c", Clock: 4}, value: "A"},
		{id: ID{Origin: "c", Clock: 6}, ref: ID{Origin: "c", Clock: 5}, value: "T"},
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
		rga := newList("rga")
		for _, a := range tt {
			p, err := rga.findPos(a.ref)
			require.NoError(t, err)
			_, err = rga.integrate(a.id, p, a.value)
			require.NoError(t, err)
		}

		var b strings.Builder
		for el := rga.root.right; el != &rga.root; el = el.right {
			b.WriteString(el.value.(string))
		}
		require.Equal(t, want, b.String())
	}
}
