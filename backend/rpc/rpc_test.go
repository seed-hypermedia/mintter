package rpc_test

import (
	"context"
	"fmt"
	"mintter/backend/rpc"
	"mintter/proto"
	"os"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestGenSeed(t *testing.T) {
	srv := newServer(t)
	ctx := context.Background()

	resp, err := srv.GenSeed(ctx, &proto.GenSeedRequest{})
	if err != nil {
		t.Fatal(err)
	}

	if len(resp.Mnemonic) != 24 {
		t.Fatalf("aezeed mnemonic must have 24 words, got = %v", len(resp.Mnemonic))
	}
}

func TestInitWallet(t *testing.T) {
	srv := newServer(t)
	ctx := context.Background()

	resp, err := srv.GenSeed(ctx, &proto.GenSeedRequest{})
	if err != nil {
		t.Fatal(err)
	}

	if _, err := srv.InitWallet(ctx, &proto.InitWalletRequest{
		Mnemonic: resp.Mnemonic,
	}); err != nil {
		t.Fatal(err)
	}

	if _, err := srv.InitWallet(ctx, &proto.InitWalletRequest{
		Mnemonic: resp.Mnemonic,
	}); err == nil {
		t.Fatal("IniWallet with existing seed must fail")
	} else {
		perr, ok := status.FromError(err)
		if !ok {
			t.Fatal("must be grpc error")
		}

		if code := perr.Code(); code != codes.FailedPrecondition {
			t.Fatalf("got = %v, want = %v", code, codes.FailedPrecondition)
		}
	}
}

func newServer(t *testing.T) *rpc.Server {
	t.Helper()

	repoPath := fmt.Sprintf("test-repo-%d", time.Now().UnixNano())
	t.Cleanup(func() {
		os.RemoveAll(repoPath)
	})

	srv, err := rpc.NewServer(repoPath)
	if err != nil {
		t.Fatal(err)
	}

	return srv
}
