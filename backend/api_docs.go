package backend

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/crypto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	documents "mintter/backend/api/documents/v1alpha"
	"mintter/backend/core"
	"mintter/backend/crdt"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
)

// DocsServer combines Drafts and Publications servers.
type DocsServer interface {
	documents.DraftsServer
	documents.PublicationsServer
	documents.ContentGraphServer
}
type docsAPI struct {
	feedMu   sync.Mutex
	back     *backend
	draftsMu sync.Mutex
	drafts   map[string]*draftState

	*vcstypes.DocsAPI
}

func newDocsAPI(back *backend) DocsServer {
	srv := &docsAPI{
		back:   back,
		drafts: map[string]*draftState{},
	}

	// This is ugly as hell, and racy. It's all mess right now while we're refactoring.
	// The problem here is lazy account initialization. We start up all the things
	// before actually having an account, so lots of things are messy because of that.
	go func() {
		<-back.repo.Ready()
		acc, err := back.Account()
		if err != nil {
			panic(err)
		}

		aid := cid.Cid(acc.id)

		device, err := core.NewKeyPair(core.CodecDeviceKey, back.repo.Device().priv.(*crypto.Ed25519PrivateKey))
		if err != nil {
			panic(err)
		}

		id := core.NewIdentity(aid, device)

		vcs := vcs.New(back.pool)

		docsapi := vcstypes.NewDocsAPI(id, back.pool, vcs)
		srv.DocsAPI = docsapi

	}()

	return srv
}

// func (srv *docsAPI) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
// 	// This will be changed when we switched to granular draft updates everywhere.
// 	{
// 		var ds *draftState
// 		srv.draftsMu.Lock()
// 		ds = srv.drafts[in.DocumentId]
// 		srv.draftsMu.Unlock()
// 		if ds != nil {
// 			return ds.toProto(), nil
// 		}
// 	}

// 	c, err := srv.parseDocumentID(in.DocumentId)
// 	if err != nil {
// 		return nil, err
// 	}

// 	draft, err := srv.back.GetDraft(ctx, c)
// 	if err != nil {
// 		return nil, err
// 	}

// 	acc, err := srv.back.Account()
// 	if err != nil {
// 		return nil, err
// 	}

// 	doc := &documents.Document{
// 		Id:         in.DocumentId,
// 		Title:      draft.Title,
// 		Subtitle:   draft.Subtitle,
// 		Author:     acc.id.String(),
// 		Content:    string(draft.Content),
// 		CreateTime: timestamppb.New(draft.CreateTime),
// 		UpdateTime: timestamppb.New(draft.UpdateTime),
// 	}

// 	return doc, nil
// }

// func (srv *docsAPI) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
// 	if in.ExistingDocumentId != "" {
// 		docid, err := srv.parseDocumentID(in.ExistingDocumentId)
// 		if err != nil {
// 			return nil, err
// 		}

// 		draft, err := srv.back.CreateDraftFromPublication(ctx, docid)
// 		if err != nil {
// 			return nil, err
// 		}

// 		return draftToProto(draft), nil
// 	}

// 	d, err := srv.back.CreateDraft(ctx)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return draftToProto(d), nil
// }

func draftToProto(d Draft) *documents.Document {
	return &documents.Document{
		Id:         d.ID.String(),
		Author:     d.Author.String(),
		Title:      d.Title,
		Subtitle:   d.Subtitle,
		Content:    string(d.Content),
		CreateTime: timestamppb.New(d.CreateTime),
		UpdateTime: timestamppb.New(d.UpdateTime),
	}
}

func (srv *docsAPI) UpdateDraft(ctx context.Context, in *documents.UpdateDraftRequest) (*documents.Document, error) {
	return nil, status.Error(codes.Unimplemented, "deprecated")

	c, err := srv.parseDocumentID(in.Document.Id)
	if err != nil {
		return nil, err
	}

	cwl := ContentWithLinks{
		Content: []byte(in.Document.Content),
	}
	if in.Links != nil {
		cwl.Links = make(map[Link]struct{}, len(in.Links))
	}

	for _, l := range in.Links {
		target, err := cid.Decode(l.GetTarget().DocumentId)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "failed to parse target document ID: %v", err)
		}

		// TODO: improve input validation here and return meaningful errors.
		ll := Link{
			SourceBlockID:    l.GetSource().GetBlockId(),
			TargetDocumentID: target,
			TargetBlockID:    l.GetTarget().BlockId,
			TargetVersion:    Version(l.GetTarget().Version),
		}

		cwl.Links[ll] = struct{}{}
	}

	d, err := srv.back.UpdateDraft(ctx, c, in.Document.Title, in.Document.Subtitle, cwl)
	if err != nil {
		return nil, err
	}

	return draftToProto(d), nil
}

func (srv *docsAPI) DeleteDraft(ctx context.Context, in *documents.DeleteDraftRequest) (*emptypb.Empty, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, srv.back.DeleteDraft(ctx, c)
}

// func (srv *docsAPI) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
// 	c, err := srv.parseDocumentID(in.DocumentId)
// 	if err != nil {
// 		return nil, err
// 	}

// 	// TODO: rethink so that this lock is not necessary.
// 	// For some stupid thing we can't publish drafts concurrently.
// 	// Remove this lock and see how the tests will fail. Not a biggie though.
// 	srv.feedMu.Lock()
// 	defer srv.feedMu.Unlock()

// 	pub, err := srv.back.PublishDraft(ctx, c)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return pubToProto(in.DocumentId, pub), nil
// }

func pubToProto(id string, pub Publication) *documents.Publication {
	return &documents.Publication{
		Document: &documents.Document{
			Id:          id,
			Title:       pub.Title,
			Subtitle:    pub.Subtitle,
			Author:      pub.Author.String(),
			Content:     string(pub.Content),
			CreateTime:  timestamppb.New(pub.CreateTime),
			UpdateTime:  timestamppb.New(pub.UpdateTime),
			PublishTime: timestamppb.New(pub.PublishTime),
		},
		Version:       pub.Version.String(),
		LatestVersion: pub.Version.String(),
	}
}

// func (srv *docsAPI) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (*documents.Publication, error) {
// 	// TODO: implement getting specific version of the publication.

// 	c, err := srv.parseDocumentID(in.DocumentId)
// 	if err != nil {
// 		return nil, err
// 	}

// 	pub, err := srv.back.GetPublication(ctx, c)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return pubToProto(in.DocumentId, pub), nil
// }

func (srv *docsAPI) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	list, err := srv.back.ListPublications(ctx)
	if err != nil {
		return nil, err
	}

	out := &documents.ListPublicationsResponse{
		Publications: make([]*documents.Publication, len(list)),
	}

	for i, l := range list {
		if l.AccountsCodec != int(codecAccountID) {
			panic("BUG: wrong codec for account")
		}
		aid := cid.NewCidV1(uint64(l.AccountsCodec), l.AccountsMultihash)
		pubid := cid.NewCidV1(uint64(l.ObjectsCodec), l.ObjectsMultihash).String()
		out.Publications[i] = &documents.Publication{
			Document: &documents.Document{
				Id:          pubid,
				Author:      aid.String(),
				Title:       l.PublicationsTitle,
				Subtitle:    l.PublicationsSubtitle,
				CreateTime:  timestamppb.New(timeFromSeconds(l.PublicationsCreateTime)),
				UpdateTime:  timestamppb.New(timeFromSeconds(l.PublicationsUpdateTime)),
				PublishTime: timestamppb.New(timeFromSeconds(l.PublicationsPublishTime)),
			},
			Version:       l.PublicationsLatestVersion,
			LatestVersion: l.PublicationsLatestVersion,
		}
	}

	return out, nil
}

func (srv *docsAPI) DeletePublication(ctx context.Context, in *documents.DeletePublicationRequest) (*emptypb.Empty, error) {
	c, err := srv.parseDocumentID(in.DocumentId)
	if err != nil {
		return nil, err
	}

	err = srv.back.DeletePublication(ctx, c)

	return &emptypb.Empty{}, err
}

// func (srv *docsAPI) UpdateDraftV2(ctx context.Context, in *documents.UpdateDraftRequestV2) (*emptypb.Empty, error) {
// 	// This is work in progress, and quite a mess.

// 	if in.DocumentId == "" {
// 		return nil, status.Errorf(codes.InvalidArgument, "document_id must be specified")
// 	}

// 	if len(in.Changes) == 0 {
// 		return nil, status.Errorf(codes.InvalidArgument, "must send changes to update a draft")
// 	}

// 	// We should only be able to update one draft at a time anyway. Will keep the lock here,
// 	// although it's probably too pessimistic. Locking a single document should be enough.
// 	srv.draftsMu.Lock()
// 	defer srv.draftsMu.Unlock()

// 	acc, err := srv.back.Account()
// 	if err != nil {
// 		return nil, err
// 	}

// 	ds, ok := srv.drafts[in.DocumentId]
// 	if !ok {
// 		c, err := srv.parseDocumentID(in.DocumentId)
// 		if err != nil {
// 			return nil, err
// 		}

// 		draft, err := srv.back.GetDraft(ctx, c)
// 		if err != nil {
// 			return nil, err
// 		}

// 		ds, err = newDraftState(&documents.Document{
// 			Id:         in.DocumentId,
// 			Author:     acc.id.String(),
// 			CreateTime: timestamppb.New(draft.CreateTime),
// 			UpdateTime: timestamppb.New(draft.UpdateTime),
// 		})
// 		if err != nil {
// 			return nil, fmt.Errorf("failed to create draft state: %w", err)
// 		}

// 		srv.drafts[in.DocumentId] = ds
// 	}

// 	for _, c := range in.Changes {
// 		switch op := c.Op.(type) {
// 		case *documents.DocumentChange_SetTitle:
// 			ds.SetTitle(op.SetTitle)
// 		case *documents.DocumentChange_SetSubtitle:
// 			ds.SetSubtitle(op.SetSubtitle)
// 		case *documents.DocumentChange_MoveBlock_:
// 			if err := ds.MoveBlock(op.MoveBlock.BlockId, op.MoveBlock.Parent, op.MoveBlock.LeftSibling); err != nil {
// 				return nil, err
// 			}
// 		case *documents.DocumentChange_ReplaceBlock:
// 			if err := ds.ReplaceBlock(op.ReplaceBlock); err != nil {
// 				return nil, err
// 			}
// 		case *documents.DocumentChange_DeleteBlock:
// 			if err := ds.DeleteBlock(op.DeleteBlock); err != nil {
// 				return nil, err
// 			}
// 		default:
// 			return nil, fmt.Errorf("invalid draft update operation %T: %+v", c, c)
// 		}
// 	}
// 	ds.updateTime = nowTruncated()

// 	return &emptypb.Empty{}, nil
// }

type draftState struct {
	id         string
	author     string
	title      string
	subtitle   string
	createTime time.Time
	updateTime time.Time
	tree       *crdt.Tree
	blocks     map[string]*documents.Block
}

func newDraftState(d *documents.Document) (*draftState, error) {
	ds := &draftState{
		id:         d.Id,
		author:     d.Author,
		title:      d.Title,
		subtitle:   d.Subtitle,
		createTime: d.CreateTime.AsTime(),
		updateTime: d.UpdateTime.AsTime(),
		tree:       crdt.NewTree(crdt.NewVectorClock()),
		blocks:     map[string]*documents.Block{},
	}

	if err := ds.fillBlocks(crdt.RootNodeID, d.Children); err != nil {
		return nil, err
	}

	return ds, nil
}

func (ds *draftState) SetTitle(title string) {
	ds.title = title
}

func (ds *draftState) SetSubtitle(subtitle string) {
	ds.subtitle = subtitle
}

func (ds *draftState) MoveBlock(blockID, parent, left string) error {
	if parent == "" {
		parent = crdt.RootNodeID
	}

	if blockID == "" {
		return fmt.Errorf("blocks without ID are not allowed")
	}

	if err := ds.tree.SetNodePosition(ds.author, blockID, parent, left); err != nil {
		return err
	}

	if ds.blocks[blockID] == nil {
		ds.blocks[blockID] = &documents.Block{
			Id: blockID,
		}
	}

	return nil
}

func (ds *draftState) ReplaceBlock(blk *documents.Block) error {
	if _, ok := ds.blocks[blk.Id]; !ok {
		return fmt.Errorf("can't replace block %s: not found", blk.Id)
	}

	ds.blocks[blk.Id] = blk

	return nil
}

func (ds *draftState) DeleteBlock(blockID string) error {
	if _, ok := ds.blocks[blockID]; !ok {
		return fmt.Errorf("can't delete block %s: not found", blockID)
	}

	return ds.tree.DeleteNode(ds.author, blockID)
}

func (ds *draftState) toProto() *documents.Document {
	d := &documents.Document{
		Id:         ds.id,
		Title:      ds.title,
		Subtitle:   ds.subtitle,
		Author:     ds.author,
		CreateTime: timestamppb.New(ds.createTime),
		UpdateTime: timestamppb.New(ds.updateTime),
	}

	blockMap := map[string]*documents.BlockNode{}

	appendChild := func(parent string, child *documents.BlockNode) {
		if parent == crdt.RootNodeID {
			d.Children = append(d.Children, child)
			return
		}

		blk, ok := blockMap[parent]
		if !ok {
			panic("BUG: no parent " + parent + " was found yet while iterating")
		}

		blk.Children = append(blk.Children, child)
	}

	it := ds.tree.Iterator()

	for cur := it.NextItem(); !cur.IsZero(); cur = it.NextItem() {
		blk, ok := ds.blocks[cur.NodeID]
		if !ok {
			panic("BUG: node id " + cur.NodeID + " doesn't have block in the map")
		}

		child := &documents.BlockNode{Block: blk}
		appendChild(cur.Parent, child)
		blockMap[cur.NodeID] = child
	}

	return d
}

func (ds *draftState) fillBlocks(parent string, blocks []*documents.BlockNode) error {
	var left string
	for _, blk := range blocks {
		if err := ds.tree.SetNodePosition("me", blk.Block.Id, parent, left); err != nil {
			return err
		}

		left = blk.Block.Id

		if blk.Children != nil {
			if err := ds.fillBlocks(blk.Block.Id, blk.Children); err != nil {
				return err
			}
		}
	}

	return nil
}

func (srv *docsAPI) parseDocumentID(id string) (cid.Cid, error) {
	c, err := cid.Decode(id)
	if err != nil {
		return cid.Undef, status.Errorf(codes.InvalidArgument, "failed to parse document id %s: %v", id, err)
	}
	return c, nil
}
