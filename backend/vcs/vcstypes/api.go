package vcstypes

import (
	"context"
	"fmt"
	documents "mintter/backend/api/documents/v1alpha"
	"mintter/backend/core"
	"mintter/backend/crdt"
	"mintter/backend/vcs"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type DocsAPI struct {
	vcs *vcs.SQLite
	me  core.Identity
}

func NewDocsAPI(me core.Identity, vcs *vcs.SQLite) *DocsAPI {
	return &DocsAPI{
		me:  me,
		vcs: vcs,
	}
}

func (api *DocsAPI) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (*documents.Document, error) {
	if in.ExistingDocumentId != "" {
		// Load time dag.
		// Create working copy.
		return nil, status.Errorf(codes.Unimplemented, "updating publications is not implemented yet")
	}

	me := api.me.AccountID()

	p := NewDocumentPermanode(me)

	permablk, err := vcs.EncodeBlock[vcs.Permanode](p)
	if err != nil {
		return nil, err
	}

	if err := api.vcs.StorePermanode(ctx, permablk); err != nil {
		return nil, err
	}

	wc := vcs.NewWorkingCopy(permablk.Cid(), "main")

	if err := api.vcs.SaveWorkingCopy(ctx, wc); err != nil {
		return nil, err
	}

	return &documents.Document{
		Id:         permablk.Cid().String(),
		Author:     me.String(),
		CreateTime: timestamppb.New(p.CreateTime),
		UpdateTime: timestamppb.New(p.CreateTime),
	}, nil
}

func (api *DocsAPI) UpdateDraftV2(ctx context.Context, in *documents.UpdateDraftRequestV2) (*emptypb.Empty, error) {
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

	draftEvents := make([]DocumentEvent, len(oldEvents)+len(newEvents))
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

	// TODO: index links.
	// Move old links insert new links.

	return &emptypb.Empty{}, nil
}

func (api *DocsAPI) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
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

func (api *DocsAPI) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	wc, err := api.vcs.LoadWorkingCopy(ctx, oid, "main")
	if err != nil {
		return nil, err
	}

	// TODO: ensure transactionality here.
	recorded, err := api.vcs.RecordChange(ctx, oid, api.me, wc.Version(), "mintter.Document", wc.Data())
	if err != nil {
		return nil, err
	}

	if err := api.vcs.RemoveWorkingCopy(ctx, oid, "main"); err != nil {
		return nil, err
	}

	newVer := vcs.NewVersion(recorded.LamportTime, recorded.ID)

	// TODO: implement content link indexing.

	// TODO: implement optimistic concurrency control here.
	if err := api.vcs.StoreNamedVersion(ctx, oid, api.me, "main", newVer); err != nil {
		return nil, err
	}

	doc, err := api.getPublication(ctx, oid, newVer)
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
		// TODO: get real latest version.
		LatestVersion: newVer.String(),
	}

	return pub, nil
}

func (api *DocsAPI) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (*documents.Publication, error) {
	oid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, err
	}

	var ver vcs.Version
	if in.Version == "" {
		ver, err = api.vcs.LoadNamedVersion(ctx, oid, api.me.AccountID(), api.me.DeviceKey().CID(), "main")
		if err != nil {
			return nil, err
		}
	} else {
		ver, err = vcs.DecodeVersion(in.Version)
		if err != nil {
			return nil, err
		}
	}

	doc, err := api.getPublication(ctx, oid, ver)
	if err != nil {
		return nil, err
	}

	docpb, err := docToProto(doc)
	if err != nil {
		return nil, err
	}
	docpb.PublishTime = timestamppb.New(doc.state.UpdateTime)

	return &documents.Publication{
		Version:  ver.String(),
		Document: docpb,
		// TODO: get real latest version.
		LatestVersion: ver.String(),
	}, nil
}

func (api *DocsAPI) getPublication(ctx context.Context, oid cid.Cid, ver vcs.Version) (*Document, error) {
	var p DocumentPermanode
	if err := api.vcs.LoadPermanode(ctx, oid, &p); err != nil {
		return nil, err
	}

	doc := NewDocument(oid, p.Owner, p.CreateTime)

	if err := api.vcs.IterateChanges(ctx, oid, ver, func(c vcs.Change) error {
		var evt []DocumentEvent
		if err := cbornode.DecodeInto(c.Body, &evt); err != nil {
			return err
		}

		for _, e := range evt {
			if err := doc.state.apply(e, c.CreateTime); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return doc, nil
}

type draft struct {
	doc       *Document
	wc        vcs.WorkingCopy
	oldEvents []DocumentEvent
}

func (api *DocsAPI) getDraft(ctx context.Context, oid cid.Cid, channel string) (*draft, error) {
	var p DocumentPermanode
	if err := api.vcs.LoadPermanode(ctx, oid, &p); err != nil {
		return nil, fmt.Errorf("failed to load permanode: %w", err)
	}

	wc, err := api.vcs.LoadWorkingCopy(ctx, oid, "main")
	if err != nil {
		return nil, fmt.Errorf("failed to load working copy: %w", err)
	}

	doc := NewDocument(oid, p.Owner, p.CreateTime)

	if err := api.vcs.IterateChanges(ctx, oid, wc.Version(), func(c vcs.Change) error {
		var evt []DocumentEvent
		if err := cbornode.DecodeInto(c.Body, &evt); err != nil {
			return fmt.Errorf("failed to decode document change: %w", err)
		}

		for _, e := range evt {
			if err := doc.state.apply(e, c.CreateTime); err != nil {
				return fmt.Errorf("failed to apply document event: %w", err)
			}
		}

		return nil
	}); err != nil {
		return nil, fmt.Errorf("failed iterating changes: %w", err)
	}

	// Apply working copy events.
	var evts []DocumentEvent

	if wc.Data() != nil {
		if err := cbornode.DecodeInto(wc.Data(), &evts); err != nil {
			return nil, fmt.Errorf("failed to decode working copy data: %w", err)
		}
	}

	for _, e := range evts {
		if err := doc.state.apply(e, wc.UpdateTime()); err != nil {
			return nil, err
		}
	}

	return &draft{
		doc:       doc,
		wc:        wc,
		oldEvents: evts,
	}, nil
}

func blockFromProto(blk *documents.Block) (Block, error) {
	b := Block{
		ID:         blk.Id,
		Type:       blk.Type,
		Attributes: blk.Attributes,
		Text:       blk.Text,
	}

	if blk.Annotations == nil {
		return b, nil
	}

	b.Annotations = make([]Annotation, len(blk.Annotations))

	for i, a := range blk.Annotations {
		b.Annotations[i] = Annotation{
			Type:       a.Type,
			Attributes: a.Attributes,
			Starts:     a.Starts,
			Ends:       a.Ends,
		}
	}

	return b, nil
}

func docToProto(d *Document) (*documents.Document, error) {
	docpb := &documents.Document{
		Id:         d.state.ID.String(),
		Title:      d.state.Title,
		Subtitle:   d.state.Subtitle,
		Author:     d.state.Author.String(),
		CreateTime: timestamppb.New(d.state.CreateTime),
		UpdateTime: timestamppb.New(d.state.UpdateTime), // TODO: implement real update time.
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

	it := d.state.Tree.Iterator()

	for cur := it.NextItem(); !cur.IsZero(); cur = it.NextItem() {
		blk, ok := d.state.Blocks[cur.NodeID]
		if !ok {
			panic("BUG: node id " + cur.NodeID + " doesn't have block in the map")
		}

		child := &documents.BlockNode{Block: blockToProto(blk)}
		appendChild(cur.Parent, child)
		blockMap[cur.NodeID] = child
	}

	return docpb, nil
}

func blockToProto(blk Block) *documents.Block {
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

func annotationToProto(a Annotation) *documents.Annotation {
	return &documents.Annotation{
		Type:       a.Type,
		Attributes: a.Attributes,
		Starts:     a.Starts,
		Ends:       a.Ends,
	}
}
