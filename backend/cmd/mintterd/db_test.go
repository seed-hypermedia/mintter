package main

import (
	"context"
	"os"
	"testing"

	badger "github.com/ipfs/go-ds-badger"
)

func TestStore(t *testing.T) {
	defer func() {
		os.RemoveAll("tmp")
	}()

	os.RemoveAll("tmp")
	opts := badger.DefaultOptions
	ds, err := badger.NewDatastore("tmp", &opts)
	if err != nil {
		t.Fatal(err)
	}
	defer ds.Close()

	s := &store{ds: ds}

	if err := s.ds.Put(storeThreadID.ChildString("foo"), []byte("foo-thread")); err != nil {
		t.Fatal(err)
	}

	if err := s.ds.Put(storeThreadID.ChildString("bar"), []byte("bar-thread")); err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	if err := s.ListThreads(ctx); err != nil {
		t.Error(err)
	}
}
