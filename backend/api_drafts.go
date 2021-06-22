package backend

import (
	"context"
	"fmt"
	"time"

	"github.com/ipfs/go-cid"
	"golang.org/x/sync/errgroup"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	documents "mintter/api/go/documents/v1alpha"
	"mintter/backend/badgergraph"
)

type draftsAPI struct {
	documents.UnimplementedDraftsServer
	back *backend
}

func newDraftsAPI(back *backend) documents.DraftsServer {
	return &draftsAPI{
		back: back,
	}
}

func (srv *draftsAPI) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
	pn, err := srv.back.NewDocumentPermanode()
	if err != nil {
		return nil, fmt.Errorf("failed to create permanode: %v", err)
	}

	acc, err := srv.back.repo.Account()
	if err != nil {
		return nil, err
	}

	doc := &documents.Document{
		Id:         pn.blk.Cid().String(),
		Author:     acc.id.String(),
		CreateTime: timestamppb.New(pn.perma.CreateTime),
		UpdateTime: timestamppb.New(pn.perma.CreateTime),
	}

	data, err := proto.Marshal(doc)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal document: %w", err)
	}

	if _, err := srv.back.CreateDraft(ctx, pn, data); err != nil {
		return nil, fmt.Errorf("failed to store draft: %w", err)
	}

	return doc, nil
}

func (srv *draftsAPI) ListDrafts(ctx context.Context, in *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	cids, err := srv.back.drafts.ListDrafts()
	if err != nil {
		return nil, err
	}

	resp := &documents.ListDraftsResponse{
		Documents: make([]*documents.Document, len(cids)),
	}

	// TODO: as we're reading all records, we can take advantage of the sorted nature of Badger.
	// But we need to test if it's actually better.
	// The idea is to use a single transaction with multiple iterators that would iterate concurrently
	// and populate the corresponding field each. Similar to a SELECT statement in a columnar database.
	// NOTICE that it would only work if all the nodes have all the selected predicates, otherwise the ordering
	// would be screwed up.
	//
	// Intuitively this should be better because:
	// 1. We'd do sequential reads instead of random ones.
	// 2. We'd launch a lot less goroutines: one per predicate instead of one per node.

	var g errgroup.Group
	for i, c := range cids {
		i, c := i, c
		g.Go(func() error {
			return srv.back.db.db.View(func(txn *badgergraph.Txn) error {
				duid, err := txn.UID(typeDocument, c.Hash())
				if err != nil {
					return err
				}

				title, err := txn.GetProperty(duid, pDocumentTitle.FullName())
				if err != nil {
					return err
				}

				auid, err := txn.GetProperty(duid, pDocumentAuthor.FullName())
				if err != nil {
					return err
				}

				ahash, err := txn.XID(typeAccount, auid.(uint64))
				if err != nil {
					return err
				}

				createTime, err := txn.GetProperty(duid, pDocumentCreateTime.FullName())
				if err != nil {
					return err
				}

				createTimeParsed, err := time.Parse(time.RFC3339, createTime.(string))
				if err != nil {
					return err
				}

				updateTime, err := txn.GetProperty(duid, pDocumentUpdateTime.FullName())
				if err != nil {
					return err
				}

				updateTimeParsed, err := time.Parse(time.RFC3339, updateTime.(string))
				if err != nil {
					return err
				}

				resp.Documents[i] = &documents.Document{
					Id:         c.String(),
					Author:     cid.NewCidV1(codecAccountID, ahash).String(),
					Title:      title.(string),
					CreateTime: timestamppb.New(createTimeParsed),
					UpdateTime: timestamppb.New(updateTimeParsed),
				}

				return nil
			})
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return resp, nil
}
