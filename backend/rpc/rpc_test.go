package rpc

import (
	"context"
	"fmt"
	"mintter/backend/daemon"
	"mintter/proto"
	"os"
	"testing"
	"time"
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
	}
}

func newServer(t *testing.T) *Server {
	t.Helper()

	repoPath := fmt.Sprintf("test-repo-%d", time.Now().UnixNano())
	t.Cleanup(func() {
		os.RemoveAll(repoPath)
	})

	d, err := daemon.New(daemon.WithRepoPath(repoPath))
	if err != nil {
		t.Fatal(err)
	}

	srv, err := NewServer(d)
	if err != nil {
		t.Fatal(err)
	}

	return srv
}
