// Package server is the serve to monitor site status.
package server

import (
	"testing"
	"time"

	logging "github.com/ipfs/go-log/v2"
	"github.com/stretchr/testify/require"
)

func TestChecks(t *testing.T) {
	t.Skip("Using external infra")
	var log = logging.Logger("monitord")
	srv, err := NewServer(8081, 0, log.Desugar(), "../sites.csv")
	require.NoError(t, err)
	srv.Start(5, time.Second*5, time.Second*3, "../template.html")
	defer srv.Stop()
	time.Sleep(time.Second * 120)
}
