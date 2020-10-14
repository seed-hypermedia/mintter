package document

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSmallStringSet(t *testing.T) {
	var set smallStringSet

	set = set.Add("0001")
	set = set.Add("0001")
	set = set.Add("0002")
	set = set.Add("0004")
	set = set.Add("0005")

	require.Equal(t, smallStringSet{"0001", "0002", "0004", "0005"}, set)

	set = set.Add("0003")
	require.Equal(t, smallStringSet{"0001", "0002", "0003", "0004", "0005"}, set)

	set = set.Remove("0003")
	require.Equal(t, smallStringSet{"0001", "0002", "0004", "0005"}, set)

	set = set.Remove("0004")
	require.Equal(t, smallStringSet{"0001", "0002", "0005"}, set)

	set = set.Remove("0001")
	require.Equal(t, smallStringSet{"0002", "0005"}, set)

	set = set.Remove("0002")
	require.Equal(t, smallStringSet{"0005"}, set)

	set = set.Remove("0005")
	require.Equal(t, smallStringSet{}, set)
	require.Equal(t, 0, len(set))
}
