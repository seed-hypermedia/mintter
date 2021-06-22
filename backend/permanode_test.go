package backend

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestNewPermanode(t *testing.T) {
	start := time.Now()

	pn := newPermanode()

	require.Greater(t, len(pn.Random), 5)
	require.True(t, start.Before(pn.CreateTime), "permanode create time is not correct")
}
