package documents

import (
	"context"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/crdt"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/maps"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"
	"mintter/backend/vcs/vcstypes"
	"sort"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Server struct {
	me   *future.ReadOnly[core.Identity]
	db   *sqlitex.Pool
	vcs  *vcs.SQLite
	repo *vcstypes.Repo
	// TODO: take it as a dependency.
	index *vcstypes.Index
}

func NewServer(me *future.ReadOnly[core.Identity], db *sqlitex.Pool, vcs *vcs.SQLite) *Server {
	srv := &Server{
		me:    me,
		db:    db,
		vcs:   vcs,
		index: vcstypes.NewIndex(db),
	}

	// TODO: this is racy, but should never actually happen.
	// Get rid of this when it's known to work properly.
	go func() {
		id, err := me.Await(context.Background())
		if err != nil {
			panic(err)
		}

		srv.repo = vcstypes.NewRepo(id, vcs)
	}()

	return srv
}

func (api *Server) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
	if in.ExistingDocumentId != "" {
		// Load time dag.
		// Create working copy.
		return nil, status.Errorf(codes.Unimplemented, "updating publications is not implemented yet")
	}

	me, ok := api.me.Get()
	if !ok {
		return nil, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}

	p := vcstypes.NewDocumentPermanode(me.AccountID())

	permablk, err := vcs.EncodeBlock[vcs.Permanode](p)
	if err != nil {
		return nil, err
	}

	if err := api.vcs.StorePermanode(ctx, permablk.Block, permablk.Value); err != nil {
		return nil, err
	}

	wc := vcs.NewWorkingCopy(permablk.Cid(), "main")

	if err := api.vcs.SaveWorkingCopy(ctx, wc); err != nil {
		return nil, err
	}

	{
		conn, release, err := api.db.Conn(ctx)
		if err != nil {
			return nil, err
		}
		defer release()

		ohash := permablk.Cid().Hash()

		if err := vcssql.DraftsInsert(conn, ohash, "", "", int(p.CreateTime.Unix()), int(p.CreateTime.Unix())); err != nil {
			return nil, err
		}
	}

	return &documents.Document{
		Id:         permablk.Cid().String(),
		Author:     me.AccountID().String(),
		CreateTime: timestamppb.New(p.CreateTime),
		UpdateTime: timestamppb.New(p.CreateTime),
	}, nil
}

func (api *Server) UpdateDraftV2(ctx context.Context, in *documents.UpdateDraftRequestV2) (*emptypb.Empty, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, fmt.Errorf("failed to decode document id: %w", err)
	}

	if in.Changes == nil {
		return nil, status.Errorf(codes.InvalidArgument, "must send some changes to apply to the document")
	}

	draft, err := api.getDraft(ctx, oid, "main")
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve old draft: %w", err)
	}

	doc := draft.doc
	wc := draft.wc

	for _, c := range in.Changes {
		switch op := c.Op.(type) {
		case *documents.DocumentChange_SetTitle:
			doc.ChangeTitle(op.SetTitle)
		case *documents.DocumentChange_SetSubtitle:
			doc.ChangeSubtitle(op.SetSubtitle)
		case *documents.DocumentChange_MoveBlock_:
			if err := doc.MoveBlock(op.MoveBlock.BlockId, op.MoveBlock.Parent, op.MoveBlock.LeftSibling); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_ReplaceBlock:
			blk, err := blockFromProto(op.ReplaceBlock)
			if err != nil {
				return nil, err
			}
			if err := doc.ReplaceBlock(blk); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_DeleteBlock:
			if err := doc.DeleteBlock(op.DeleteBlock); err != nil {
				return nil, err
			}
		default:
			return nil, fmt.Errorf("invalid draft update operation %T: %+v", c, c)
		}
	}

	oldEvents := draft.oldEvents
	newEvents := doc.Events()

	draftEvents := make([]vcstypes.DocumentEvent, len(oldEvents)+len(newEvents))
	n := copy(draftEvents, draft.oldEvents)
	copy(draftEvents[n:], doc.Events())

	data, err := cbornode.DumpObject(draftEvents)
	if err != nil {
		return nil, fmt.Errorf("failed to encode merged draft events: %w", err)
	}

	wc.SetData(data)

	if err := api.vcs.SaveWorkingCopy(ctx, wc); err != nil {
		return nil, fmt.Errorf("failed to save draft working copy: %w", err)
	}

	{
		conn, release, err := api.db.Conn(ctx)
		if err != nil {
			return nil, err
		}
		defer release()

		ohash := oid.Hash()

		if err := vcssql.DraftsUpdate(conn, doc.State().Title, doc.State().Subtitle, int(doc.State().UpdateTime.Unix()), ohash); err != nil {
			return nil, err
		}
	}

	// TODO: index links.
	// Move old links insert new links.

	return &emptypb.Empty{}, nil
}

func (api *Server) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	draft, err := api.getDraft(ctx, oid, "main")
	if err != nil {
		return nil, err
	}

	return docToProto(draft.doc)
}

func (api *Server) ListDrafts(ctx context.Context, in *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	conn, release, err := api.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	res, err := vcssql.DraftsList(conn)
	if err != nil {
		return nil, err
	}

	out := &documents.ListDraftsResponse{
		Documents: make([]*documents.Document, len(res)),
	}

	me, ok := api.me.Get()
	if !ok {
		return nil, status.Error(codes.FailedPrecondition, "account is not initialized yet")
	}

	aid := me.AccountID().String()

	for i, l := range res {
		out.Documents[i] = &documents.Document{
			Id:         cid.NewCidV1(uint64(l.IPFSBlocksCodec), l.IPFSBlocksMultihash).String(),
			Author:     aid,
			Title:      l.DraftsTitle,
			Subtitle:   l.DraftsSubtitle,
			CreateTime: &timestamppb.Timestamp{Seconds: int64(l.DraftsCreateTime)},
			UpdateTime: &timestamppb.Timestamp{Seconds: int64(l.DraftsUpdateTime)},
		}
	}

	return out, nil
}

func (api *Server) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	wc, err := api.vcs.LoadWorkingCopy(ctx, oid, "main")
	if err != nil {
		return nil, err
	}

	me, ok := api.me.Get()
	if !ok {
		return nil, status.Error(codes.FailedPrecondition, "account is not initialized yet")
	}

	// TODO: ensure transactionality here.
	recorded, err := api.vcs.RecordChange(ctx, oid, me, wc.Version(), "mintter.Document", wc.Data())
	if err != nil {
		return nil, err
	}

	if err := api.vcs.RemoveWorkingCopy(ctx, oid, "main"); err != nil {
		return nil, err
	}

	newVer := vcs.NewVersion(recorded.LamportTime, recorded.ID)

	// TODO: implement optimistic concurrency control here.
	if err := api.vcs.StoreNamedVersion(ctx, oid, me, "main", newVer); err != nil {
		return nil, err
	}

	doc, err := api.repo.LoadPublication(ctx, oid, newVer)
	if err != nil {
		return nil, err
	}

	docpb, err := docToProto(doc)
	if err != nil {
		return nil, err
	}
	docpb.PublishTime = timestamppb.New(recorded.CreateTime)

	pub := &documents.Publication{
		Version:  newVer.String(),
		Document: docpb,
	}

	// TODO: move this elsewhere. Combine db writes into one transaction.
	{
		conn, release, err := api.db.Conn(ctx)
		if err != nil {
			return nil, err
		}
		defer release()

		ohash := oid.Hash()

		if err := vcssql.DraftsDelete(conn, ohash); err != nil {
			return nil, err
		}

		// TODO: avoid this redundant
		var recordedEvts []vcstypes.DocumentEvent
		if err := cbornode.DecodeInto(recorded.Body, &recordedEvts); err != nil {
			return nil, err
		}

		if err := api.index.IndexDocumentChange(ctx, recorded.ID, recorded.Change, recordedEvts); err != nil {
			return nil, err
		}
	}

	return pub, nil
}

func (api *Server) DeleteDraft(ctx context.Context, in *documents.DeleteDraftRequest) (*emptypb.Empty, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	// if err := vcssql.DraftsDelete(conn, ohash); err != nil {
	// 	return nil, err
	// }

	// TODO: we need to be careful here, we don't want to delete permanode actually,
	// because there might be other changes that were published. We just want to delete the working copy and the index entry.
	// This will break when we implement versioning.

	if err := api.vcs.DeletePermanode(ctx, oid); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

func (api *Server) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (*documents.Publication, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	me, ok := api.me.Get()
	if !ok {
		return nil, status.Error(codes.FailedPrecondition, "account is not initialized yet")
	}

	var ver vcs.Version
	if in.Version == "" {
		ver, err = api.vcs.LoadNamedVersion(ctx, oid, me.AccountID(), me.DeviceKey().CID(), "main")
		if err != nil {
			return nil, err
		}
	} else {
		ver, err = vcs.ParseVersion(in.Version)
		if err != nil {
			return nil, err
		}
	}

	doc, err := api.repo.LoadPublication(ctx, oid, ver)
	if err != nil {
		return nil, err
	}

	docpb, err := docToProto(doc)
	if err != nil {
		return nil, err
	}
	docpb.PublishTime = timestamppb.New(doc.State().UpdateTime)

	return &documents.Publication{
		Version:  ver.String(),
		Document: docpb,
	}, nil
}

func (api *Server) DeletePublication(ctx context.Context, in *documents.DeletePublicationRequest) (*emptypb.Empty, error) {
	c, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	var dp vcstypes.DocumentPermanode
	if err := api.vcs.GetPermanode(ctx, c, &dp); err != nil {
		if vcs.IsErrNotFound(err) {
			return nil, status.Errorf(codes.NotFound, "%v", err)
		}

		return nil, err
	}

	if dp.PermanodeType() != vcstypes.DocumentType {
		return nil, status.Error(codes.NotFound, "not a document")
	}

	if err := api.vcs.DeletePermanode(ctx, c); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

func (api *Server) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	me, ok := api.me.Get()
	if !ok {
		return nil, fmt.Errorf("account is not initialized yet")
	}

	conn, release, err := api.db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	pubs, err := vcssql.PermanodesListWithVersionsByType(conn, string(vcstypes.DocumentType))
	if err != nil {
		return nil, err
	}

	indexed, err := vcssql.DocumentsListIndexed(conn)
	if err != nil {
		return nil, err
	}

	combined := map[int]*documents.Publication{}

	for _, p := range pubs {
		if p.PermanodeCodec != cid.DagCBOR {
			panic("BUG: bad cid codec for document permanode")
		}

		// If we got more than one row when listing permanodes it means that it has
		// more than one owner, because we join permanodes with their owners in the query.
		// While this is something we made possible for the future, right now it's not implemented,
		// nor supported anywhere beyond the database schema.
		if _, ok := combined[p.PermanodesID]; ok {
			panic("BUG: permanodes with multiple owners are not supported yet")
		}

		oid := cid.NewCidV1(uint64(p.PermanodeCodec), p.PermanodeMultihash)
		aid := cid.NewCidV1(core.CodecAccountKey, p.AccountsMultihash)

		// TODO: we should be storing versions for each device separately and combine the version set into one on demand.
		ver, err := api.vcs.LoadNamedVersion(ctx, oid, me.AccountID(), me.DeviceKey().CID(), "main")
		if err != nil {
			return nil, err
		}

		combined[p.PermanodesID] = &documents.Publication{
			Document: &documents.Document{
				Id:         oid.String(),
				Author:     aid.String(),
				CreateTime: &timestamppb.Timestamp{Seconds: int64(p.PermanodesCreateTime)},
			},
			Version: ver.String(),
		}
	}

	for _, d := range indexed {
		pubpb, ok := combined[d.DocumentsID]
		if !ok {
			continue
		}

		if d.DocumentsTitle != "" {
			pubpb.Document.Title = d.DocumentsTitle
		}

		if d.DocumentsSubtitle != "" {
			pubpb.Document.Subtitle = d.DocumentsSubtitle
		}

		// TODO: get rid of this. Index required fields of changes in a separate table.
		// Otherwise the cost of serialization for each list item is going to be huge.
		var sc vcs.SignedCBOR[vcs.Change]
		if err := cbornode.DecodeInto(d.ChangeData, &sc); err != nil {
			return nil, err
		}

		pubpb.Document.UpdateTime = timestamppb.New(sc.Payload.CreateTime)
	}

	out := maps.Values(combined)
	sort.Slice(out, func(i, j int) bool {
		return out[i].Document.CreateTime.Seconds < out[j].Document.CreateTime.Seconds
	})

	return &documents.ListPublicationsResponse{
		Publications: out,
	}, nil
}

type draft struct {
	doc       *vcstypes.Document
	wc        vcs.WorkingCopy
	oldEvents []vcstypes.DocumentEvent
}

func (api *Server) getDraft(ctx context.Context, oid cid.Cid, channel string) (*draft, error) {
	pblk, err := vcs.LoadPermanode[vcstypes.DocumentPermanode](ctx, api.vcs.BlockGetter(), oid)
	if err != nil {
		return nil, err
	}

	p := pblk.Value

	wc, err := api.vcs.LoadWorkingCopy(ctx, oid, "main")
	if err != nil {
		return nil, fmt.Errorf("failed to load working copy: %w", err)
	}

	doc := vcstypes.NewDocument(oid, p.Owner, p.CreateTime)

	if err := api.vcs.IterateChanges(ctx, oid, wc.Version(), func(c vcs.RecordedChange) error {
		var evt []vcstypes.DocumentEvent
		if err := cbornode.DecodeInto(c.Body, &evt); err != nil {
			return fmt.Errorf("failed to decode document change: %w", err)
		}

		for _, e := range evt {
			if err := doc.Apply(e, c.CreateTime); err != nil {
				return fmt.Errorf("failed to apply document event: %w", err)
			}
		}

		return nil
	}); err != nil {
		return nil, fmt.Errorf("failed iterating changes: %w", err)
	}

	// Apply working copy events.
	var evts []vcstypes.DocumentEvent

	if wc.Data() != nil {
		if err := cbornode.DecodeInto(wc.Data(), &evts); err != nil {
			return nil, fmt.Errorf("failed to decode working copy data: %w", err)
		}
	}

	for _, e := range evts {
		if err := doc.Apply(e, wc.UpdateTime()); err != nil {
			return nil, err
		}
	}

	return &draft{
		doc:       doc,
		wc:        wc,
		oldEvents: evts,
	}, nil
}

func blockFromProto(blk *documents.Block) (vcstypes.Block, error) {
	b := vcstypes.Block{
		ID:         blk.Id,
		Type:       blk.Type,
		Attributes: blk.Attributes,
		Text:       blk.Text,
	}

	if blk.Annotations == nil {
		return b, nil
	}

	b.Annotations = make([]vcstypes.Annotation, len(blk.Annotations))

	for i, a := range blk.Annotations {
		b.Annotations[i] = vcstypes.Annotation{
			Type:       a.Type,
			Attributes: a.Attributes,
			Starts:     a.Starts,
			Ends:       a.Ends,
		}
	}

	return b, nil
}

func docToProto(d *vcstypes.Document) (*documents.Document, error) {
	docpb := &documents.Document{
		Id:         d.State().ID.String(),
		Title:      d.State().Title,
		Subtitle:   d.State().Subtitle,
		Author:     d.State().Author.String(),
		CreateTime: timestamppb.New(d.State().CreateTime),
		UpdateTime: timestamppb.New(d.State().UpdateTime),
	}

	blockMap := map[string]*documents.BlockNode{}

	appendChild := func(parent string, child *documents.BlockNode) {
		if parent == crdt.RootNodeID {
			docpb.Children = append(docpb.Children, child)
			return
		}

		blk, ok := blockMap[parent]
		if !ok {
			panic("BUG: no parent " + parent + " was found yet while iterating")
		}

		blk.Children = append(blk.Children, child)
	}

	it := d.State().Tree.Iterator()

	for cur := it.NextItem(); !cur.IsZero(); cur = it.NextItem() {
		blk, ok := d.State().Blocks[cur.NodeID]
		if !ok {
			panic("BUG: node id " + cur.NodeID + " doesn't have block in the map")
		}

		child := &documents.BlockNode{Block: blockToProto(blk)}
		appendChild(cur.Parent, child)
		blockMap[cur.NodeID] = child
	}

	return docpb, nil
}

func blockToProto(blk vcstypes.Block) *documents.Block {
	bpb := &documents.Block{
		Id:         blk.ID,
		Type:       blk.Type,
		Attributes: blk.Attributes,
		Text:       blk.Text,
	}

	if blk.Annotations != nil {
		bpb.Annotations = make([]*documents.Annotation, len(blk.Annotations))
		for i, a := range blk.Annotations {
			bpb.Annotations[i] = annotationToProto(a)
		}
	}

	return bpb
}

func annotationToProto(a vcstypes.Annotation) *documents.Annotation {
	return &documents.Annotation{
		Type:       a.Type,
		Attributes: a.Attributes,
		Starts:     a.Starts,
		Ends:       a.Ends,
	}
}
