package backend

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewPermanode(t *testing.T) {
	pn := newPermanode()
	require.Greater(t, len(pn.Random), 5)
	require.False(t, pn.CreateTime.IsZero(), "permanode create time is not correct")
}
