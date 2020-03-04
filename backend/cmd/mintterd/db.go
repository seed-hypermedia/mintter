package main

import (
	"context"
	"fmt"

	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
	coreservice "github.com/textileio/go-threads/core/service"
	"github.com/textileio/go-threads/core/thread"
)

var (
	storePrefix   = datastore.NewKey("store")
	storeThreadID = storePrefix.ChildString("thread_id")
)

type store struct {
	tid thread.ID
	ts  coreservice.Service
	ds  datastore.TxnDatastore
}

func (s *store) ListThreads(ctx context.Context) error {
	res, err := s.ds.Query(query.Query{Prefix: storeThreadID.String()})
	if err != nil {
		return err
	}
	defer res.Close()

	for i := range res.Next() {
		fmt.Printf("%+v", i)
	}

	return nil
}
