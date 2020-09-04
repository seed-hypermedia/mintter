package server

import (
	"context"
	"fmt"
	"strings"
	"time"

	"mintter/backend/identity"
	"mintter/backend/ipldutil"
	v2 "mintter/proto/v2"

	"github.com/golang/protobuf/ptypes/empty"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
	"github.com/polydawn/refmt/obj/atlas"
	"github.com/rs/xid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

var (
	keyDrafts = datastore.NewKey("/mintter/v2/drafts")
	keyDocs   = datastore.NewKey("/mintter/v2/documents")
)

var nowFunc = func() time.Time {
	now := time.Now().UTC()
	now = now.Add(time.Duration(now.Nanosecond()) * -1)
	return now
}

// /documents/author:<author>/<docid>

func makeDraftKey(docID string) datastore.Key {
	return keyDrafts.ChildString(docID)
}

// V2Server implements documents v2 API.
type V2Server struct {
	ds        datastore.Datastore
	docStore  *docStore
	profStore profileStore
}

func NewV2Server(ps profileStore, bs blockstore.Blockstore, ds datastore.TxnDatastore) *V2Server {
	return &V2Server{
		ds: ds,
		docStore: &docStore{
			bs:        bs,
			profstore: ps,
			db:        ds,
		},
		profStore: ps,
	}
}

// CreateDraft implements v2 Documents server.
func (s *V2Server) CreateDraft(ctx context.Context, in *v2.CreateDraftRequest) (*v2.Document, error) {
	if in.Parent != "" {
		// TODO(burdiyan): retrieve parent publication and create a draft with the same blocks.
		return nil, status.Error(codes.Unimplemented, "updating published documents is not implemented yet")
	}

	doc, err := s.docStore.CreateDraft(ctx)
	if err != nil {
		return nil, err
	}

	return documentToProto(doc), nil
}

// UpdateDraft implements v2 Documents server.
func (s *V2Server) UpdateDraft(ctx context.Context, in *v2.UpdateDraftRequest) (*v2.UpdateDraftResponse, error) {
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

	if in.Document.Author != prof.Account.ID.String() {
		return nil, status.Error(codes.InvalidArgument, "you can only update your own documents")
	}

	version, err := cid.Decode(in.Document.Version)
	if err != nil {
		return nil, fmt.Errorf("failed to decode version %s: %w", in.Document.Version, err)
	}

	existing, err := s.docStore.Get(ctx, version)
	if err != nil {
		return nil, err
	}

	if in.Document.Author != existing.Author.String() {
		return nil, status.Errorf(codes.InvalidArgument, "field 'author': want = '%s', got = '%s'", existing.Author, in.Document.Author)
	}

	indoc, err := documentFromProto(in.Document, in.Blocks)
	if err != nil {
		return nil, err
	}

	existing.Title = indoc.Title
	existing.Subtitle = indoc.Subtitle
	existing.Blocks = indoc.Blocks
	existing.Sources = indoc.Sources
	existing.RefList = indoc.RefList
	existing.UpdateTime = nowFunc()

	if _, err := s.docStore.StoreDraft(ctx, existing.document); err != nil {
		return nil, fmt.Errorf("failed to store draft: %w", err)
	}

	return &v2.UpdateDraftResponse{}, nil
}

// PublishDraft implements v2 Documents server.
func (s *V2Server) PublishDraft(ctx context.Context, in *v2.PublishDraftRequest) (*v2.PublishDraftResponse, error) {
	vid, err := cid.Decode(in.Version)
	if err != nil {
		return nil, err
	}

	if vid.Prefix().Codec != DraftCode {
		return nil, fmt.Errorf("only drafts can be published")
	}

	existing, err := s.docStore.Get(ctx, vid)
	if err != nil {
		return nil, err
	}

	existing.PublishTime = nowFunc()

	pubVersion, err := s.docStore.Store(ctx, existing.document)
	if err != nil {
		return nil, err
	}

	if err := s.docStore.Delete(ctx, existing.Version); err != nil {
		return nil, err
	}

	return &v2.PublishDraftResponse{
		Version: pubVersion.String(),
	}, nil
}

// GetDocument implements v2 Documents server.
func (s *V2Server) GetDocument(ctx context.Context, in *v2.GetDocumentRequest) (*v2.GetDocumentResponse, error) {
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
		version = cid.NewCidV1(DraftCode, did.Hash())
	}

	doc, blocks, err := resolveDocument(ctx, version, s.docStore)
	if err != nil {
		return nil, err
	}

	return &v2.GetDocumentResponse{
		Document: doc,
		Blocks:   blocks,
	}, nil
}

// ListDocuments implements v2 Documents server.
func (s *V2Server) ListDocuments(ctx context.Context, in *v2.ListDocumentsRequest) (*v2.ListDocumentsResponse, error) {
	var author identity.ProfileID
	{
		me, err := s.profStore.CurrentProfile(ctx)
		if err != nil {
			return nil, err
		}
		author = me.ID

		if in.PublishingState == v2.PublishingState_DRAFT && in.Author != "" && in.Author != me.ID.String() {
			return nil, fmt.Errorf("when listing drafts use empty author or the ID of the current user, got: %s", in.Author)
		}

		if in.PublishingState == v2.PublishingState_PUBLISHED {
			if in.Author == "" {
				in.Author = me.ID.String()
			} else {
				a, err := identity.DecodeProfileID(in.Author)
				if err != nil {
					return nil, err
				}
				author = a
			}
		}
	}

	docs, err := s.docStore.ListDocuments(ctx, author, in.PublishingState)
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
func (s *V2Server) DeleteDocument(ctx context.Context, in *v2.DeleteDocumentRequest) (*emptypb.Empty, error) {
	vid, err := cid.Decode(in.Version)
	if err != nil {
		return nil, err
	}

	if err := s.docStore.Delete(ctx, vid); err != nil {
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
	if v.Prefix().Codec == DraftCode {
		return v2.PublishingState_DRAFT
	}
	return v2.PublishingState_PUBLISHED
}

type versionedDoc struct {
	document
	Version cid.Cid
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
		for _, b := range ll.Blocks {
			if b.BlockRefList != nil {
				stack = append(stack, b.BlockRefList)
			}

			// TODO: ignore transcluded blocks.
			blocks = append(blocks, b.Id)
		}
	}

	return blocks
}

type profileStore interface {
	CurrentProfile(context.Context) (identity.Profile, error)
	GetProfile(context.Context, identity.ProfileID) (identity.Profile, error)
}

type docStore struct {
	bs        blockstore.Blockstore
	db        datastore.Datastore
	profstore profileStore
}

func (ds *docStore) Get(ctx context.Context, version cid.Cid) (versionedDoc, error) {
	codec := version.Prefix().Codec

	switch codec {
	case DraftCode:
		data, err := ds.db.Get(makeDraftKey(version.String()))
		if err != nil {
			return versionedDoc{}, err
		}
		var d document
		if err := cbornode.DecodeInto(data, &d); err != nil {
			return versionedDoc{}, err
		}
		return versionedDoc{document: d, Version: version}, nil
	case cid.DagCBOR:
		blk, err := ds.bs.Get(version)
		if err != nil {
			return versionedDoc{}, err
		}
		var doc document
		return versionedDoc{document: doc, Version: version}, ipldutil.ReadSignedBlock(ctx, ds.profstore, blk, &doc)
	default:
		return versionedDoc{}, fmt.Errorf("unknown version code: %s(%d)", cid.CodecToStr[codec], codec)
	}
}

func makeDocsKey(author identity.ProfileID, docid cid.Cid, pubTime time.Time, version cid.Cid) datastore.Key {
	return keyDocs.
		ChildString(author.String()).
		ChildString(docid.String()).
		ChildString(pubTime.UTC().Format("20060102150405")).
		ChildString(version.String())
}

func makeDocsPrefix(author identity.ProfileID) datastore.Key {
	return keyDocs.ChildString(author.String())
}

func (ds *docStore) Store(ctx context.Context, doc document) (cid.Cid, error) {
	blk, err := ipldutil.CreateSignedBlock(ctx, ds.profstore, doc)
	if err != nil {
		return cid.Undef, err
	}

	data, err := cbornode.DumpObject(doc)
	if err != nil {
		return cid.Undef, err
	}

	if err := ds.db.Put(makeDocsKey(doc.Author, doc.ID, doc.PublishTime, blk.Cid()), data); err != nil {
		return cid.Undef, err
	}

	return blk.Cid(), ds.bs.Put(blk)
}

func (ds *docStore) CreateDraft(ctx context.Context) (versionedDoc, error) {
	now := nowFunc()

	var docID cid.Cid
	{
		perma := permanode{
			Random:     xid.New().Bytes(),
			CreateTime: now,
		}

		permablock, err := ipldutil.CreateSignedBlock(ctx, ds.profstore, perma)
		if err != nil {
			return versionedDoc{}, fmt.Errorf("failed to create permablock: %w", err)
		}

		if err := ds.bs.Put(permablock); err != nil {
			return versionedDoc{}, fmt.Errorf("failed to store permablock: %w", err)
		}

		docID = permablock.Cid()
	}

	prof, err := ds.profstore.CurrentProfile(ctx)
	if err != nil {
		return versionedDoc{}, err
	}

	doc := document{
		ID:         docID,
		Author:     prof.Account.ID,
		CreateTime: now,
		UpdateTime: now,
	}

	version, err := ds.StoreDraft(ctx, doc)
	if err != nil {
		return versionedDoc{}, err
	}

	return versionedDoc{Version: version, document: doc}, nil
}

const DraftCode = 0xdd

func (ds *docStore) StoreDraft(ctx context.Context, doc document) (cid.Cid, error) {
	version := cid.NewCidV1(DraftCode, doc.ID.Hash())
	doc.UpdateTime = time.Now()

	data, err := cbornode.DumpObject(doc)
	if err != nil {
		return cid.Undef, err
	}

	if err := ds.db.Put(makeDraftKey(version.String()), data); err != nil {
		return cid.Undef, err
	}

	return version, nil
}

func (ds *docStore) Delete(ctx context.Context, version cid.Cid) error {
	codec := version.Prefix().Codec

	switch codec {
	case DraftCode:
		doc, err := ds.Get(ctx, version)
		if err != nil {
			return err
		}
		if err := ds.bs.DeleteBlock(doc.ID); err != nil {
			return err
		}

		return ds.db.Delete(makeDraftKey(version.String()))
	case cid.DagCBOR:
		return ds.bs.DeleteBlock(version)
	default:
		return fmt.Errorf("unknown version code: %s(%d)", cid.CodecToStr[codec], codec)
	}
}

func (ds *docStore) ListDocuments(ctx context.Context, author identity.ProfileID, state v2.PublishingState) ([]versionedDoc, error) {
	switch state {
	case v2.PublishingState_DRAFT:
		res, err := ds.db.Query(query.Query{
			Prefix: keyDrafts.String(),
		})
		if err != nil {
			return nil, err
		}

		entries, err := res.Rest()
		if err != nil {
			return nil, err
		}

		out := make([]versionedDoc, len(entries))

		for i, e := range entries {
			var d document
			if err := cbornode.DecodeInto(e.Value, &d); err != nil {
				return nil, err
			}
			v := cid.NewCidV1(DraftCode, d.ID.Hash())
			out[i] = versionedDoc{document: d, Version: v}
		}
		return out, nil
	case v2.PublishingState_PUBLISHED:
		res, err := ds.db.Query(query.Query{
			Prefix: makeDocsPrefix(author).String(),
		})
		if err != nil {
			return nil, err
		}

		entries, err := res.Rest()
		if err != nil {
			return nil, err
		}

		docMap := map[string]struct{}{}
		var out []versionedDoc
		for _, e := range entries {
			parts := strings.Split(e.Key, "/")
			docid := parts[len(parts)-3]
			if _, ok := docMap[docid]; ok {
				continue
			}
			docMap[docid] = struct{}{}

			version, err := cid.Decode(parts[len(parts)-1])
			if err != nil {
				return nil, err
			}

			var d document
			if err := cbornode.DecodeInto(e.Value, &d); err != nil {
				return nil, err
			}
			out = append(out, versionedDoc{document: d, Version: version})
		}

		return out, nil
	default:
		return nil, fmt.Errorf("invalid publishing state %d", state)
	}
}

func resolveDocument(ctx context.Context, version cid.Cid, store *docStore) (*v2.Document, map[string]*v2.Block, error) {
	doc, err := store.Get(ctx, version)
	if err != nil {
		return nil, nil, fmt.Errorf("doc store: failed to get document version %s: %w", version.String(), err)
	}

	docpb := documentToProto(doc)
	if doc.RefList.IsEmpty() {
		return docpb, nil, nil
	}

	blockMap := map[string]*v2.Block{}

	listpb, err := resolveBlocks(ctx, doc.document, store, blockMap, doc.RefList)
	if err != nil {
		return nil, nil, err
	}
	docpb.BlockRefList = listpb

	return docpb, blockMap, nil
}

func resolveBlocks(ctx context.Context, doc document, store *docStore, blockMap map[string]*v2.Block, refList *RefList) (*v2.BlockRefList, error) {
	refListPb := &v2.BlockRefList{
		Style: v2.BlockRefList_Style(refList.ListStyle),
	}

	for _, ref := range refList.Refs {
		parts := strings.Split(ref.Ref, "/")
		if parts[0] != "#" {
			return nil, fmt.Errorf("invalid ref '%s': first segment must be '#'", ref.Ref)
		}

		space := parts[1]

		var blk Block

		switch space {
		case "blocks":
			key := parts[2]
			blk = doc.Blocks[key]
		case "sources":
			key := parts[2]
			srcid := doc.Sources[key]

			source, err := store.Get(ctx, srcid)
			if err != nil {
				return nil, fmt.Errorf("failed to resolve source %s", srcid)
			}

			if parts[3] != "blocks" {
				return nil, fmt.Errorf("invalid ref '%s': can only resolve 'blocks' after 'sources'", ref.Ref)
			}

			blk = source.Blocks[parts[4]]
			// Rewrite the ID to be version/<block-id>
			blk.ID = srcid.String() + "/" + blk.ID
		default:
			return nil, fmt.Errorf("invalid ref '%s': space '%s' is unknown: must be either 'blocks' or 'sources'", ref.Ref, space)
		}

		blockpb := blockToProto(blk)
		blockMap[blockpb.Id] = blockpb

		refpb := &v2.BlockRef{
			Id: blk.ID,
		}

		refListPb.Blocks = append(refListPb.Blocks, refpb)

		if !ref.RefList.IsEmpty() {
			children, err := resolveBlocks(ctx, doc, store, blockMap, ref.RefList)
			if err != nil {
				return nil, err
			}
			refpb.BlockRefList = children
		}
	}

	return refListPb, nil
}

func blockToProto(blk Block) *v2.Block {
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
				Bold:      style.Style&StyleBold != 0,
				Italic:    style.Style&StyleItalic != 0,
				Underline: style.Style&StyleUnderline != 0,
				Code:      style.Style&StyleMonospace != 0,
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

func blockFromProto(blockpb *v2.Block) Block {
	switch blockpb.Content.(type) {
	case *v2.Block_Paragraph:
		p := blockpb.GetParagraph()
		b := Block{
			ID: blockpb.Id,
		}

		var buf strings.Builder
		var offset int
		for _, el := range p.InlineElements {
			buf.WriteString(el.Text)
			style := textStyleToFlag(el.TextStyle)
			if style != StyleUndefined {
				b.StyleRanges = append(b.StyleRanges, StyleRange{
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

var pidAtlas = atlas.BuildEntry(identity.ProfileID{}).Transform().
	TransformMarshal(atlas.MakeMarshalTransformFunc(func(pid identity.ProfileID) ([]byte, error) {
		return pid.MarshalBinary()
	})).
	TransformUnmarshal(atlas.MakeUnmarshalTransformFunc(func(x []byte) (identity.ProfileID, error) {
		var pid identity.ProfileID
		return pid, pid.UnmarshalBinary(x)
	})).
	Complete()

var timeAtlas = atlas.BuildEntry(time.Time{}).Transform().
	TransformMarshal(atlas.MakeMarshalTransformFunc(func(t time.Time) (string, error) {
		return t.UTC().Format(time.RFC3339), nil
	})).
	TransformUnmarshal(atlas.MakeUnmarshalTransformFunc(func(in string) (time.Time, error) {
		return time.ParseInLocation(time.RFC3339, in, time.UTC)
	})).
	Complete()

func init() {
	cbornode.RegisterCborType(document{})
	cbornode.RegisterCborType(Block{})
	cbornode.RegisterCborType(RefList{})
	cbornode.RegisterCborType(BlockRef{})
	cbornode.RegisterCborType(pidAtlas)
	cbornode.RegisterCborType(timeAtlas)
	cbornode.RegisterCborType(permanode{})
	cbornode.RegisterCborType(StyleRange{})
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

func blocksFromProto(d *document, lpb *v2.BlockRefList, blockmap map[string]*v2.Block) (*RefList, error) {
	list := &RefList{}
	for _, refpb := range lpb.Blocks {
		var newRef BlockRef

		// If ref is a transclusion - store reference to the remote block
		refParts := strings.Split(refpb.Id, "/")
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

			newRef = BlockRef{
				Ref: "#/sources/" + vkey + "/blocks/" + refParts[1],
			}
		} else {
			newRef = BlockRef{
				Ref: "#/blocks/" + refpb.Id,
			}

			if d.Blocks == nil {
				d.Blocks = map[string]Block{}
			}

			d.Blocks[refpb.Id] = blockFromProto(blockmap[refpb.Id])
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

type document struct {
	ID          cid.Cid
	Title       string
	Subtitle    string
	Author      identity.ProfileID
	Parent      cid.Cid `refmt:",omitempty"`
	RefList     *RefList
	Blocks      map[string]Block   `refmt:",omitempty"`
	Sources     map[string]cid.Cid `refmt:",omitempty"`
	CreateTime  time.Time
	UpdateTime  time.Time
	PublishTime time.Time
}

type RefList struct {
	ListStyle v2.BlockRefList_Style `refmt:",omitempty"`
	Refs      []BlockRef
}

func (bl *RefList) IsEmpty() bool {
	return bl == nil || len(bl.Refs) == 0
}

type BlockRef struct {
	Ref     string
	RefList *RefList `refmt:",omitempty"`
}

type Block struct {
	ID          string       `refmt:",omitempty"`
	Text        string       `refmt:",omitempty"`
	StyleRanges []StyleRange `refmt:",omitempty"`
}

// Style of text.
type Style int

// Style of text values.
const (
	StyleUndefined Style = 0
	StyleBold      Style = 1 << iota
	StyleItalic
	StyleMonospace
	StyleUnderline
)

type StyleRange struct {
	Offset int
	Length int
	Style  Style
}

func textStyleToFlag(s *v2.TextStyle) Style {
	if s == nil {
		return StyleUndefined
	}

	ss := StyleUndefined
	if s.Bold {
		ss = ss | StyleBold
	}

	if s.Italic {
		ss = ss | StyleItalic
	}

	if s.Underline {
		ss = ss | StyleUnderline
	}

	if s.Code {
		ss = ss | StyleMonospace
	}

	return ss
}

type permanode struct {
	Random     []byte
	CreateTime time.Time
}
