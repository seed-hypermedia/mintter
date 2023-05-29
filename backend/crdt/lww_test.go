package crdt

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLWW(t *testing.T) {
	var lww LWW[string]
	lww.Set("a", 1, "A")
	lww.Set("a", 2, "B")
	lww.Set("a", 3, "C")
	lww.Set("b", 1, "D")

	want := LWW[string]{ID: ID{"a", 3, 0}, Value: "C"}
	require.Equal(t, want, lww)
}
