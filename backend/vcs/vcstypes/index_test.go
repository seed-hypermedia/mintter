package vcstypes

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseMintterLink(t *testing.T) {
	l := "mtt://docid/versionid/blockid"

	got := linkRegex.FindStringSubmatch(l)
	want := []string{l, "docid", "versionid", "blockid"}
	require.Equal(t, want, got)
}
