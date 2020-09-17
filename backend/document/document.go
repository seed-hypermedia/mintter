package document

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"mintter/backend/identity"
	v2 "mintter/proto/v2"

	"github.com/golang/protobuf/ptypes/empty"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	blockstore "github.com/ipfs/go-ipfs-blockstore"
)

type ctxKey struct{}

var adminCtxKey ctxKey

// AdminContext çreates marks context as admin user.
func AdminContext(ctx context.Context) context.Context {
	return context.WithValue(ctx, adminCtxKey, true)
}

func isAdmin(ctx context.Context) bool {
	v := ctx.Value(adminCtxKey)
	if v == nil {
		return false
	}

	return v.(bool)
}

// Server implements documents v2 API.
type Server struct {
	ds        datastore.Datastore
	repo      *store
	profStore profileStore

	mu   sync.RWMutex
	subs map[chan<- proto.Message]struct{}
}

// NewServer creates a new server that implements Mintter Documents API v2.
func NewServer(ps profileStore, bs blockstore.Blockstore, ds datastore.TxnDatastore) *Server {
	return &Server{
		ds: ds,
		repo: &store{
			bs:        bs,
			profstore: ps,
			db:        ds,
		},
		profStore: ps,
		subs:      make(map[chan<- proto.Message]struct{}),
	}
}

// Subscribe to internal events on the provided channel.
// Use buffered channels to avoid blocking other subscribers.
// Slow consumers are not dropped.
func (s *Server) Subscribe(c chan<- proto.Message) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.subs[c] = struct{}{}
}

// Unsubscribe channel from internal events.
func (s *Server) Unsubscribe(c chan<- proto.Message) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.subs, c)
}

// CreateDraft implements v2 Documents server.
func (s *Server) CreateDraft(ctx context.Context, in *v2.CreateDraftRequest) (*v2.Document, error) {
	if !isAdmin(ctx) {
		return nil, status.Error(codes.PermissionDenied, "only admin can create drafts")
	}

	if in.Parent != "" {
		// TODO(burdiyan): retrieve parent publication and create a draft with the same blocks.
		return nil, status.Error(codes.Unimplemented, "updating published documents is not implemented yet")
	}

	doc, err := s.repo.CreateDraft(ctx)
	if err != nil {
		return nil, err
	}

	return documentToProto(doc), nil
}

// UpdateDraft implements v2 Documents server.
func (s *Server) UpdateDraft(ctx context.Context, in *v2.UpdateDraftRequest) (*v2.UpdateDraftResponse, error) {
	if !isAdmin(ctx) {
		return nil, status.Error(codes.PermissionDenied, "only admin can update drafts")
	}

	if in.Document == nil {
		return nil, status.Error(codes.InvalidArgument, "document is required")
	}

	if in.Document.PublishingState != v2.PublishingState_DRAFT {
		return nil, status.Error(codes.InvalidArgument, "only draft can be updated")
	}

	if in.Document.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "document must have an ID")
	}

	prof, err := s.profStore.CurrentProfile(ctx)
	if err != nil {
		return nil, err
	}

	// As a special case we support the way to delete all the content, for example when users
	// selects everything in the editor and deletes it. For this to happend to send a non-nil
	// block ref list but it has no refs. Sending nil refList should be possible to allow
	// only updating document metadata partially without touching the content.
	deleteContent := in.Document.BlockRefList != nil && in.Document.BlockRefList.Refs == nil

	if in.Document.Author != prof.Account.ID.String() {
		return nil, status.Error(codes.InvalidArgument, "you can only update your own documents")
	}

	version, err := cid.Decode(in.Document.Version)
	if err != nil {
		return nil, fmt.Errorf("failed to decode version %s: %w", in.Document.Version, err)
	}

	existing, err := s.repo.Get(ctx, version)
	if err != nil {
		return nil, err
	}

	if in.Document.Author != existing.Author.String() {
		return nil, status.Errorf(codes.InvalidArgument, "field 'author': want = '%s', got = '%s'", existing.Author, in.Document.Author)
	}

	// To support updates without sending blocks map all the time, resolve the existing blocks.
	if !deleteContent && in.Blocks == nil {
		_, inblocks, err := resolveDocument(ctx, version, s.repo)
		if err != nil {
			return nil, err
		}
		in.Blocks = inblocks
	}

	indoc, err := documentFromProto(in.Document, in.Blocks)
	if err != nil {
		return nil, err
	}

	existing.Title = indoc.Title
	existing.Subtitle = indoc.Subtitle
	existing.UpdateTime = nowFunc()

	if indoc.Blocks != nil {
		existing.Blocks = indoc.Blocks
	}

	if indoc.Sources != nil {
		existing.Sources = indoc.Sources
	}

	if indoc.RefList != nil {
		existing.RefList = indoc.RefList
	}

	if deleteContent {
		existing.RefList = nil
		existing.Blocks = nil
		existing.Sources = nil
	}

	if _, err := s.repo.StoreDraft(ctx, existing.document); err != nil {
		return nil, fmt.Errorf("failed to store draft: %w", err)
	}

	return &v2.UpdateDraftResponse{}, nil
}

// PublishDraft implements v2 Documents server.
func (s *Server) PublishDraft(ctx context.Context, in *v2.PublishDraftRequest) (*v2.PublishDraftResponse, error) {
	if !isAdmin(ctx) {
		return nil, status.Error(codes.PermissionDenied, "only admin can publish drafts")
	}

	vid, err := cid.Decode(in.Version)
	if err != nil {
		return nil, err
	}

	if vid.Prefix().Codec != draftMultiCodec {
		return nil, fmt.Errorf("only drafts can be published")
	}

	existing, err := s.repo.Get(ctx, vid)
	if err != nil {
		return nil, err
	}

	existing.PublishTime = nowFunc()

	pubVersion, err := s.repo.Store(ctx, existing.document)
	if err != nil {
		return nil, err
	}

	if err := s.repo.Delete(ctx, existing.Version); err != nil {
		return nil, err
	}

	resp := &v2.PublishDraftResponse{
		Version: pubVersion.String(),
	}

	go s.publishEvent(ctx, resp)

	return resp, nil
}

func (s *Server) publishEvent(ctx context.Context, msg proto.Message) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for c := range s.subs {
		select {
		case c <- msg:
			// Sent
		case <-ctx.Done():
			return
		}
	}
}

// GetDocument implements v2 Documents server.
func (s *Server) GetDocument(ctx context.Context, in *v2.GetDocumentRequest) (*v2.GetDocumentResponse, error) {
	if in.Version == "" && in.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "must specify document ID or version to retrieve")
	}

	var version cid.Cid
	if in.Version != "" {
		c, err := cid.Decode(in.Version)
		if err != nil {
			return nil, err
		}
		version = c
	} else {
		did, err := cid.Decode(in.Id)
		if err != nil {
			return nil, err
		}
		version = cid.NewCidV1(draftMultiCodec, did.Hash())
	}

	if version.Prefix().Codec == draftMultiCodec && !isAdmin(ctx) {
		return nil, status.Error(codes.PermissionDenied, "only admin can get drafts")
	}

	local, err := s.repo.Has(ctx, version)
	if err != nil {
		return nil, err
	}

	// TODO(burdiyan): Since we expose this method to all of the untrusted peers we should
	// protect our node from fetching random remote blocks unless we really want it ourselves.
	if !isAdmin(ctx) && !local {
		return nil, status.Error(codes.PermissionDenied, "only admin can request remote IPFS blocks")
	}

	doc, blocks, err := resolveDocument(ctx, version, s.repo)
	if err != nil {
		return nil, err
	}

	return &v2.GetDocumentResponse{
		Document: doc,
		Blocks:   blocks,
	}, nil
}

// ListDocuments implements v2 Documents server.
func (s *Server) ListDocuments(ctx context.Context, in *v2.ListDocumentsRequest) (*v2.ListDocumentsResponse, error) {
	var author identity.ProfileID
	{
		me, err := s.profStore.CurrentProfile(ctx)
		if err != nil {
			return nil, err
		}

		switch in.PublishingState {
		case v2.PublishingState_DRAFT:
			if in.Author != "" && in.Author != me.ID.String() {
				return nil, fmt.Errorf("when listing drafts use empty author or the ID of the current user, got: %s", in.Author)
			}
			author = me.ID
		case v2.PublishingState_PUBLISHED:
			if in.Author != "" {
				a, err := identity.DecodeProfileID(in.Author)
				if err != nil {
					return nil, err
				}
				author = a
			}
		}
	}

	if in.PublishingState == v2.PublishingState_DRAFT && !isAdmin(ctx) {
		return nil, status.Error(codes.PermissionDenied, "only admin can list drafts")
	}

	docs, err := s.repo.ListDocuments(ctx, author, in.PublishingState)
	if err != nil {
		return nil, err
	}

	if len(docs) == 0 {
		return &v2.ListDocumentsResponse{}, nil
	}

	resp := &v2.ListDocumentsResponse{
		Documents: make([]*v2.Document, len(docs)),
	}

	for i, d := range docs {
		resp.Documents[i] = documentToProto(d)
	}

	return resp, nil
}

// DeleteDocument implements v2 Documents server.
func (s *Server) DeleteDocument(ctx context.Context, in *v2.DeleteDocumentRequest) (*emptypb.Empty, error) {
	if !isAdmin(ctx) {
		return nil, status.Error(codes.PermissionDenied, "only admin can create drafts")
	}

	vid, err := cid.Decode(in.Version)
	if err != nil {
		return nil, err
	}

	if err := s.repo.Delete(ctx, vid); err != nil {
		return nil, err
	}

	return &empty.Empty{}, nil
}

func documentToProto(d versionedDoc) *v2.Document {
	docpb := &v2.Document{
		Id:              d.ID.String(),
		Title:           d.Title,
		Subtitle:        d.Subtitle,
		Author:          d.Author.String(),
		Version:         d.Version.String(),
		PublishingState: pubStateFromVersion(d.Version),
		BlockRefList:    nil,
		CreateTime:      timestamppb.New(d.CreateTime),
		UpdateTime:      timestamppb.New(d.UpdateTime),
	}
	if d.Parent.Defined() {
		docpb.Parent = d.Parent.String()
	}
	if !d.PublishTime.IsZero() {
		docpb.PublishTime = timestamppb.New(d.PublishTime)
	}
	return docpb
}

func pubStateFromVersion(v cid.Cid) v2.PublishingState {
	if v.Prefix().Codec == draftMultiCodec {
		return v2.PublishingState_DRAFT
	}
	return v2.PublishingState_PUBLISHED
}

func flattenBlockRefs(l *v2.BlockRefList) []string {
	if l == nil {
		return nil
	}

	var blocks []string
	stack := []*v2.BlockRefList{l}

	for len(stack) > 0 {
		ll := stack[0]
		stack = stack[1:]
		for _, b := range ll.Refs {
			if b.BlockRefList != nil {
				stack = append(stack, b.BlockRefList)
			}

			// TODO: ignore transcluded blocks.
			blocks = append(blocks, b.Ref)
		}
	}

	return blocks
}

func resolveDocument(ctx context.Context, version cid.Cid, docStore *store) (*v2.Document, map[string]*v2.Block, error) {
	doc, err := docStore.Get(ctx, version)
	if err != nil {
		return nil, nil, fmt.Errorf("doc store: failed to get document version %s: %w", version.String(), err)
	}

	docpb := documentToProto(doc)
	if doc.RefList.IsEmpty() {
		return docpb, nil, nil
	}

	blockMap := map[string]*v2.Block{}

	listpb, err := resolveBlocks(ctx, doc.document, docStore, blockMap, doc.RefList)
	if err != nil {
		return nil, nil, err
	}
	docpb.BlockRefList = listpb

	return docpb, blockMap, nil
}

func resolveBlocks(ctx context.Context, doc document, docStore *store, blockMap map[string]*v2.Block, rl *refList) (*v2.BlockRefList, error) {
	refListPb := &v2.BlockRefList{
		Style: v2.BlockRefList_Style(rl.ListStyle),
	}

	for _, ref := range rl.Refs {
		parts := strings.Split(ref.Pointer, "/")
		if parts[0] != "#" {
			return nil, fmt.Errorf("invalid ref '%s': first segment must be '#'", ref.Pointer)
		}

		space := parts[1]

		var blk block
		var blockRef string

		switch space {
		case "blocks":
			key := parts[2]
			blk = doc.Blocks[key]
			blockRef = blk.ID
		case "sources":
			key := parts[2]
			srcid := doc.Sources[key]

			source, err := docStore.Get(ctx, srcid)
			if err != nil {
				return nil, fmt.Errorf("failed to resolve source %s", srcid)
			}

			if parts[3] != "blocks" {
				return nil, fmt.Errorf("invalid ref '%s': can only resolve 'blocks' after 'sources'", ref.Pointer)
			}

			blk = source.Blocks[parts[4]]

			blockRef = srcid.String() + "/" + blk.ID
		default:
			return nil, fmt.Errorf("invalid ref '%s': space '%s' is unknown: must be either 'blocks' or 'sources'", ref.Pointer, space)
		}

		blockpb := blockToProto(blk)
		blockMap[blockRef] = blockpb

		refpb := &v2.BlockRef{
			Ref: blockRef,
		}

		refListPb.Refs = append(refListPb.Refs, refpb)

		if !ref.RefList.IsEmpty() {
			children, err := resolveBlocks(ctx, doc, docStore, blockMap, ref.RefList)
			if err != nil {
				return nil, err
			}
			refpb.BlockRefList = children
		}
	}

	return refListPb, nil
}

func blockToProto(blk block) *v2.Block {
	p := &v2.Paragraph{}

	blockpb := &v2.Block{
		Id:      blk.ID,
		Content: &v2.Block_Paragraph{Paragraph: p},
	}

	if blk.StyleRanges == nil {
		p.InlineElements = append(p.InlineElements, &v2.InlineElement{
			Text: blk.Text,
		})

		return blockpb
	}

	for i, style := range blk.StyleRanges {
		// We create the inline segment for the first part of text that is unstyled.
		if i == 0 && style.Offset > 0 {
			p.InlineElements = append(p.InlineElements, &v2.InlineElement{
				Text: blk.Text[:style.Offset],
			})
		}
		p.InlineElements = append(p.InlineElements, &v2.InlineElement{
			Text: blk.Text[style.Offset : style.Offset+style.Length],
			TextStyle: &v2.TextStyle{
				Bold:      style.Style&styleBold != 0,
				Italic:    style.Style&styleItalic != 0,
				Underline: style.Style&styleUnderline != 0,
				Code:      style.Style&styleMonospace != 0,
			},
		})

		if i < len(blk.StyleRanges)-1 {
			next := blk.StyleRanges[i+1]
			gap := next.Offset - (style.Offset + style.Length)
			if gap > 0 {
				gapOffset := next.Offset - gap
				gapLen := gap
				p.InlineElements = append(p.InlineElements, &v2.InlineElement{
					Text: blk.Text[gapOffset : gapOffset+gapLen],
				})
			}
		}
	}

	lastStyle := blk.StyleRanges[len(blk.StyleRanges)-1]
	lastSlice := blk.Text[lastStyle.Offset+lastStyle.Length:]
	if lastSlice != "" {
		p.InlineElements = append(p.InlineElements, &v2.InlineElement{
			Text: lastSlice,
		})
	}

	return blockpb
}

func blockFromProto(blockpb *v2.Block) block {
	switch blockpb.Content.(type) {
	case *v2.Block_Paragraph:
		p := blockpb.GetParagraph()
		b := block{
			ID: blockpb.Id,
		}

		var buf strings.Builder
		var offset int
		for _, el := range p.InlineElements {
			buf.WriteString(el.Text)
			style := textStyleToFlag(el.TextStyle)
			if style != styleUndefined {
				b.StyleRanges = append(b.StyleRanges, styleRange{
					Offset: offset,
					Length: len(el.Text),
					Style:  style,
				})
			}
			offset += len(el.Text)
		}

		b.Text = buf.String()

		return b
	default:
		panic("bug: not supported yet")
	}
}

func documentFromProto(docpb *v2.Document, blockmap map[string]*v2.Block) (document, error) {
	var d document
	did, err := cid.Decode(docpb.Id)
	if err != nil {
		return d, err
	}
	d.ID = did
	d.Title = docpb.Title
	d.Subtitle = docpb.Subtitle

	pid, err := identity.DecodeProfileID(docpb.Author)
	if err != nil {
		return d, err
	}
	d.Author = pid

	if docpb.Parent != "" {
		parent, err := cid.Decode(docpb.Parent)
		if err != nil {
			return d, err
		}
		d.Parent = parent
	}

	d.CreateTime = docpb.CreateTime.AsTime()
	d.UpdateTime = docpb.UpdateTime.AsTime()
	if docpb.PublishTime != nil {
		d.PublishTime = docpb.PublishTime.AsTime()
	}

	if docpb.BlockRefList == nil {
		return d, nil
	}

	rl, err := blocksFromProto(&d, docpb.BlockRefList, blockmap)
	if err != nil {
		return d, err
	}
	d.RefList = rl

	return d, nil
}

func blocksFromProto(d *document, lpb *v2.BlockRefList, blockmap map[string]*v2.Block) (*refList, error) {
	list := &refList{}
	for _, refpb := range lpb.Refs {
		var newRef blockRef

		// If ref is a transclusion - store reference to the remote block
		refParts := strings.Split(refpb.Ref, "/")
		if len(refParts) == 2 {
			vstr := refParts[0]
			version, err := cid.Decode(vstr)
			if err != nil {
				return nil, err
			}

			// Use last 8 bytes of the version string as the map key.
			// Totally arbitrary.
			// TODO: this may clash probably, so some other method is required. Maybe just numbers?
			vkey := vstr[len(vstr)-8:]

			if d.Sources == nil {
				d.Sources = map[string]cid.Cid{}
			}

			d.Sources[vkey] = version

			newRef = blockRef{
				Pointer: "#/sources/" + vkey + "/blocks/" + refParts[1],
			}
		} else {
			newRef = blockRef{
				Pointer: "#/blocks/" + refpb.Ref,
			}

			if d.Blocks == nil {
				d.Blocks = map[string]block{}
			}

			blockpb, ok := blockmap[refpb.Ref]
			if !ok {
				return nil, fmt.Errorf("block ref %s is not found in the blocks map", refpb.Ref)
			}

			d.Blocks[refpb.Ref] = blockFromProto(blockpb)
		}

		list.ListStyle = lpb.Style

		if refpb.BlockRefList != nil {
			ll, err := blocksFromProto(d, refpb.BlockRefList, blockmap)
			if err != nil {
				return nil, err
			}
			newRef.RefList = ll
		}

		list.Refs = append(list.Refs, newRef)
	}

	d.RefList = list

	return list, nil
}

func textStyleToFlag(s *v2.TextStyle) style {
	if s == nil {
		return styleUndefined
	}

	ss := styleUndefined
	if s.Bold {
		ss = ss | styleBold
	}

	if s.Italic {
		ss = ss | styleItalic
	}

	if s.Underline {
		ss = ss | styleUnderline
	}

	if s.Code {
		ss = ss | styleMonospace
	}

	return ss
}

var nowFunc = func() time.Time {
	now := time.Now().UTC()
	now = now.Add(time.Duration(now.Nanosecond()) * -1)
	return now
}

type profileStore interface {
	CurrentProfile(context.Context) (identity.Profile, error)
	GetProfile(context.Context, identity.ProfileID) (identity.Profile, error)
}

const draftMultiCodec = 0xdd
