package backend

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	documents "mintter/backend/api/documents/v1alpha"
	"mintter/backend/badgergraph"
)

// DocsServer combines Drafts and Publications servers.
type DocsServer interface {
	documents.DraftsServer
	documents.PublicationsServer
}

type docsAPI struct {
	documents.UnimplementedPublicationsServer

	feedMu sync.Mutex
	back   *backend
}

func newDocsAPI(back *backend) DocsServer {
	return &docsAPI{
		back: back,
	}
}

func (srv *docsAPI) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	data, err := srv.back.drafts.GetDraft(c)
	if err != nil {
		return nil, err
	}

	doc := &documents.Document{}
	if err := proto.Unmarshal(data, doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal draft: %w", err)
	}

	return doc, nil
}

func (srv *docsAPI) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
	if in.ExistingDocumentId != "" {
		pub, err := srv.GetPublication(ctx, &documents.GetPublicationRequest{
			DocumentId: in.ExistingDocumentId,
		})
		if err != nil {
			return nil, err
		}

		docid, err := srv.parseDocumentID(in.ExistingDocumentId)
		if err != nil {
			return nil, err
		}

		pub.Document.PublishTime = nil

		data, err := proto.Marshal(pub.Document)
		if err != nil {
			return nil, err
		}

		if _, err := srv.back.patches.UpsertObjectID(ctx, docid); err != nil {
			return nil, fmt.Errorf("failed to register object id for draft: %w", err)
		}

		if err := srv.back.drafts.StoreDraft(docid, data); err != nil {
			return nil, fmt.Errorf("failed to store draft content: %w", err)
		}

		if err := srv.back.db.IndexDocument(ctx, docid, srv.back.repo.acc.id, "", "", pub.Document.CreateTime.AsTime(), pub.Document.UpdateTime.AsTime()); err != nil {
			return nil, err
		}

		return pub.Document, nil
	}

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

func (srv *docsAPI) ListDrafts(ctx context.Context, in *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
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

				title, err := txn.GetPropertyString(duid, pDocumentTitle)
				if err != nil {
					return err
				}

				subtitle, err := txn.GetPropertyString(duid, pDocumentSubtitle)
				if err != nil {
					return err
				}

				auid, err := txn.GetPropertyUID(duid, pDocumentAuthor)
				if err != nil {
					return err
				}

				ahash, err := txn.XID(typeAccount, auid)
				if err != nil {
					return err
				}

				createTime, err := txn.GetPropertyTime(duid, pDocumentCreateTime)
				if err != nil {
					return err
				}

				updateTime, err := txn.GetPropertyTime(duid, pDocumentUpdateTime)
				if err != nil {
					return err
				}

				resp.Documents[i] = &documents.Document{
					Id:         c.String(),
					Author:     cid.NewCidV1(codecAccountID, ahash).String(),
					Title:      title,
					Subtitle:   subtitle,
					CreateTime: timestamppb.New(createTime),
					UpdateTime: timestamppb.New(updateTime),
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

func (srv *docsAPI) UpdateDraft(ctx context.Context, in *documents.UpdateDraftRequest) (*documents.Document, error) {
	c, err := srv.parseDocumentID(in.Document.Id)
	if err != nil {
		return nil, err
	}

	data, err := srv.back.drafts.GetDraft(c)
	if err != nil {
		return nil, fmt.Errorf("failed to get draft from store: %w", err)
	}

	old := &documents.Document{}
	if err := proto.Unmarshal(data, old); err != nil {
		return nil, fmt.Errorf("failed to unmarshal draft proto: %w", err)
	}

	// We don't use proto.Merge here, because we have arrays, in which case their contents will be duplicated.
	merged := proto.Clone(old).(*documents.Document)
	merged.Title = in.Document.Title
	merged.Subtitle = in.Document.Subtitle
	merged.Content = in.Document.Content

	// If updated document didn't change, we don't need to hit the database or file system.
	if proto.Equal(merged, old) {
		return merged, nil
	}

	now := nowTruncated()
	merged.UpdateTime = timestamppb.New(now)

	mergedData, err := proto.Marshal(merged)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal merged proto: %w", err)
	}

	if err := srv.back.drafts.StoreDraft(c, mergedData); err != nil {
		return nil, fmt.Errorf("failed to store updated draft: %w", err)
	}

	// We overwrite title in the index only if it's changed. This implies that
	// users won't be able to remove title and subtitle.
	//
	// TODO: There should be a better way of avoiding database writes
	// for values that don't change. Or is it even worth it?

	title := merged.Title
	if title == old.Title {
		title = ""
	}

	subtitle := merged.Subtitle
	if subtitle == old.Subtitle {
		subtitle = ""
	}

	if err := srv.back.db.TouchDocument(ctx, c, title, subtitle, now); err != nil {
		return nil, fmt.Errorf("failed to touch document index: %w", err)
	}

	return merged, nil
}

func (srv *docsAPI) DeleteDraft(ctx context.Context, in *documents.DeleteDraftRequest) (*emptypb.Empty, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	if err := srv.back.db.db.Update(func(txn *badgergraph.Txn) error {
		duid, err := txn.UIDRead(typeDocument, c.Hash())
		if err != nil {
			return err
		}
		return txn.DeleteNode(typeDocument, duid)
	}); err != nil {
		return nil, fmt.Errorf("failed to delete document %s from index: %w", in.DocumentId, err)
	}

	if err := srv.back.drafts.DeleteDraft(c); err != nil {
		return nil, fmt.Errorf("failed to delete document content: %w", err)
	}

	return &emptypb.Empty{}, nil
}

func (srv *docsAPI) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
	p2p, err := srv.back.readyIPFS()
	if err != nil {
		return nil, err
	}

	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	data, err := srv.back.drafts.GetDraft(c)
	if err != nil {
		return nil, err
	}

	doc := &documents.Document{}
	if err := proto.Unmarshal(data, doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal draft: %w", err)
	}

	now := nowTruncated()
	doc.PublishTime = timestamppb.New(now)

	author, err := cid.Decode(doc.Author)
	if err != nil {
		return nil, fmt.Errorf("failed to parse author %s: %w", doc.Author, err)
	}

	// TODO: this needs some more love. It's ugly as hell.
	state, err := srv.back.patches.LoadState(ctx, c)
	if err != nil {
		if errors.Is(err, badger.ErrKeyNotFound) {
			state = newState(c, nil)
		} else {
			return nil, fmt.Errorf("failed to load state for draft %s: %w", c.String(), err)
		}
	}

	// Right now we don't do any merging with previous states. Just replace with the new state.
	// We need to read the current state so that we can create a new patch.
	if state.size > 0 {
		_, err = documentFromState(state)
		if err != nil {
			return nil, err
		}
	}

	sp, err := state.NewProtoPatch(author, srv.back.repo.Device().priv, doc)
	if err != nil {
		return nil, fmt.Errorf("failed to create patch from draft: %w", err)
	}

	if err := srv.back.patches.AddPatch(ctx, sp); err != nil {
		return nil, fmt.Errorf("failed to add patch: %w", err)
	}

	if err := srv.back.drafts.DeleteDraft(c); err != nil {
		return nil, fmt.Errorf("failed to remove draft content: %w", err)
	}

	// TODO: DRY this mutation.

	if err := srv.back.db.db.Update(func(txn *badgergraph.Txn) error {
		uid, err := txn.UIDRead(typeDocument, c.Hash())
		if err != nil {
			return err
		}
		return txn.WriteTriple(uid, pDocumentPublishTime, now)
	}); err != nil {
		return nil, err
	}

	docfeed := newDocumentFeedID(AccountID(author))

	// TODO: rethink so that this lock is not necessary.
	srv.feedMu.Lock()
	defer srv.feedMu.Unlock()

	feedstate, err := srv.back.patches.LoadState(ctx, docfeed)
	if err != nil {
		return nil, fmt.Errorf("failed to get document feed state: %w", err)
	}

	// TODO: this should not be necessary, but it is, so that we can get the next seq no.
	_ = feedstate.Merge()

	feedsp, err := feedstate.NewProtoPatch(author, srv.back.repo.Device().priv, &documents.DocumentPublished{
		DocumentId: doc.Id,
		Title:      doc.Title,
		Subtitle:   doc.Subtitle,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create document feed patch: %w", err)
	}

	// To avoid transaction errors we allow only one writer for document feed object.
	if err := srv.back.patches.AddPatch(ctx, feedsp); err != nil {
		return nil, fmt.Errorf("failed to add document feed patch: %w", err)
	}

	p2p.prov.EnqueueProvide(ctx, c)
	p2p.prov.EnqueueProvide(ctx, sp.cid)
	p2p.prov.EnqueueProvide(ctx, feedsp.cid)

	return &documents.Publication{
		Version:  sp.cid.String(),
		Document: doc,
	}, nil
}

func (srv *docsAPI) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (*documents.Publication, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	state, err := srv.back.patches.LoadState(ctx, c)
	if err != nil {
		return nil, fmt.Errorf("failed to load state: %w", err)
	}

	doc, err := documentFromState(state)
	if err != nil {
		return nil, err
	}

	return &documents.Publication{
		Version:  state.deps[0].String(), // TODO: implement case with multiple heads.
		Document: doc,
	}, nil
}

func (srv *docsAPI) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	var uids []uint64
	if err := srv.back.db.db.View(func(txn *badgergraph.Txn) error {
		nodes, err := txn.ListIndexedNodes(pDocumentPublishTime, nil)
		if err != nil && err != badger.ErrKeyNotFound {
			return err
		}

		if err == badger.ErrKeyNotFound {
			return nil
		}

		uids = nodes

		return nil
	}); err != nil {
		return nil, err
	}

	if uids == nil {
		return &documents.ListPublicationsResponse{}, nil
	}

	resp := &documents.ListPublicationsResponse{
		Publications: make([]*documents.Publication, len(uids)),
	}

	var g errgroup.Group
	for i, uid := range uids {
		i, duid := i, uid
		g.Go(func() error {
			return srv.back.db.db.View(func(txn *badgergraph.Txn) error {
				title, err := txn.GetPropertyString(duid, pDocumentTitle)
				if err != nil {
					return err
				}

				subtitle, err := txn.GetPropertyString(duid, pDocumentSubtitle)
				if err != nil {
					return err
				}

				auid, err := txn.GetPropertyUID(duid, pDocumentAuthor)
				if err != nil {
					return err
				}

				ahash, err := txn.XID(typeAccount, auid)
				if err != nil {
					return err
				}

				createTime, err := txn.GetPropertyTime(duid, pDocumentCreateTime)
				if err != nil {
					return err
				}

				updateTime, err := txn.GetPropertyTime(duid, pDocumentUpdateTime)
				if err != nil {
					return err
				}

				publishTime, err := txn.GetPropertyTime(duid, pDocumentPublishTime)
				if err != nil {
					return err
				}

				dhash, err := txn.XID(typeDocument, duid)
				if err != nil {
					return err
				}

				c := cid.NewCidV1(codecDocumentID, dhash)

				resp.Publications[i] = &documents.Publication{
					Document: &documents.Document{
						Id:          c.String(),
						Author:      cid.NewCidV1(codecAccountID, ahash).String(),
						Title:       title,
						Subtitle:    subtitle,
						CreateTime:  timestamppb.New(createTime),
						UpdateTime:  timestamppb.New(updateTime),
						PublishTime: timestamppb.New(publishTime),
					},
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

func (srv *docsAPI) DeletePublication(ctx context.Context, in *documents.DeletePublicationRequest) (*emptypb.Empty, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	state, err := srv.back.patches.LoadState(ctx, c)
	if err != nil {
		return nil, err
	}

	// It doesn't matter if these deletes are not atomic, because we're deleting patches from the beginning,
	// and we still keep the head around. Although eventually we should do this in a single transaction when possible.
	for _, p := range state.Merge() {
		if err := srv.back.patches.bs.DeleteBlock(p.cid); err != nil {
			return nil, fmt.Errorf("failed to delete patch %s: %w", p.cid, err)
		}
	}

	if err := srv.back.db.db.Update(func(txn *badgergraph.Txn) error {
		h := c.Hash()

		duid, err := txn.UIDRead(typeDocument, h)
		if err != nil {
			return err
		}

		if err := txn.DeleteNode(typeDocument, duid); err != nil {
			return err
		}

		ouid, err := txn.UIDRead(typeObject, c.Bytes())
		if err != nil {
			return err
		}

		heads, err := txn.ListReverseRelations(pHeadObject, ouid)
		if err != nil {
			return err
		}

		for _, huid := range heads {
			if err := txn.DeleteNode(typeHead, huid); err != nil {
				return err
			}
		}

		if err := txn.DeleteNode(typeObject, ouid); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, fmt.Errorf("failed to delete publication %s from index: %w", in.DocumentId, err)
	}

	return &emptypb.Empty{}, nil
}

// TODO(burdiyan): implement a delete publication.
// How can we delete if there's no single version?

func (srv *docsAPI) parseDocumentID(id string) (cid.Cid, error) {
	c, err := cid.Decode(id)
	if err != nil {
		return cid.Undef, status.Errorf(codes.InvalidArgument, "failed to parse document id %s: %v", id, err)
	}
	return c, nil
}

func documentFromState(state *state) (*documents.Document, error) {
	if state.size == 0 {
		return nil, status.Errorf(codes.NotFound, "not found patches for document ID %s", state.obj.String())
	}

	// TODO: handle multiple patches.
	if state.size > 1 {
		return nil, status.Errorf(codes.Unimplemented, "documents with more than 1 patch are not supported yet")
	}

	sp := state.Item()

	doc := &documents.Document{}
	if err := proto.Unmarshal(sp.Body, doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal document: %w", err)
	}

	return doc, nil
}
