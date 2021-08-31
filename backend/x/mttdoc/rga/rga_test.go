package rga

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRGA(t *testing.T) {
	t.SkipNow()
	abc := []atom{
		{ID: ID{Site: "a", Clock: 1}, Ref: root.ID, Value: 'A'},
		{ID: ID{Site: "a", Clock: 2}, Ref: ID{Site: "a", Clock: 1}, Value: 'B'},
		{ID: ID{Site: "a", Clock: 3}, Ref: ID{Site: "a", Clock: 2}, Value: 'C'},
	}

	dog := []atom{
		{ID: ID{Site: "b", Clock: 3}, Ref: ID{Site: "a", Clock: 1}, Value: 'D'},
		{ID: ID{Site: "b", Clock: 4}, Ref: ID{Site: "b", Clock: 3}, Value: 'O'},
		{ID: ID{Site: "b", Clock: 5}, Ref: ID{Site: "b", Clock: 4}, Value: 'G'},
	}

	cat := []atom{
		{ID: ID{Site: "c", Clock: 4}, Ref: ID{Site: "a", Clock: 1}, Value: 'C'},
		{ID: ID{Site: "c", Clock: 5}, Ref: ID{Site: "c", Clock: 4}, Value: 'A'},
		{ID: ID{Site: "c", Clock: 6}, Ref: ID{Site: "ce", Clock: 5}, Value: 'T'},
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
		rga := newRGA()
		for _, a := range tt {
			rga.Insert(a)
		}

		require.Equal(t, want, rga.String())
	}
}
