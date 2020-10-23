package daemon

import (
	"context"
	v2 "mintter/api/go/v2"
	"mintter/backend/config"
	"mintter/backend/testutil"
	"testing"
	"time"

	"github.com/burdiyan/go/mainutil"
	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
)

func TestDaemon(t *testing.T) {
	t.SkipNow()

	ctx, cancel := context.WithCancel(mainutil.TrapSignals())
	defer cancel()

	cfg := config.Config{
		HTTPPort:      "55001",
		GRPCPort:      "55002",
		NoOpenBrowser: true,
		// RepoPath:      "~/.mtt",
		RepoPath: testutil.MakeRepoPath(t),
		P2P: config.P2P{
			Addr:        "/ip4/0.0.0.0/tcp/0",
			NoBootstrap: true,
			NoRelay:     true,
			NoTLS:       true,
		},
	}

	done := make(chan struct{}, 1)
	go func() {
		require.NoError(t, Run(ctx, cfg))
		done <- struct{}{}
	}()
	time.Sleep(2 * time.Second)
	conn, err := grpc.DialContext(ctx, "localhost:55002", grpc.WithInsecure())
	require.NoError(t, err)
	client := v2.NewDocumentsClient(conn)
	resp, err := client.ListDocuments(ctx, &v2.ListDocumentsRequest{})
	require.NoError(t, err)

	litter.Dump(resp)

	cancel()
	<-done
}
