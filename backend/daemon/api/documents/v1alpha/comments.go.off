package documents

import (
	"context"
	"fmt"
	"mintter/backend/backlinks"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/pkg/errutil"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	"mintter/backend/vcs/mttdoc"
	"mintter/backend/vcs/sqlitevcs"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"time"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

// CreateConversation implements the Comments server.
func (api *Server) CreateConversation(ctx context.Context, in *documents.CreateConversationRequest) (*documents.Conversation, error) {
	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	if in.DocumentId == "" {
		return nil, errutil.MissingArgument("documentID")
	}

	docid, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, errutil.ParseError("documentID", in.DocumentId, docid, err)
	}

	if err := validateSelectors("selectors", in.Selectors); err != nil {
		return nil, err
	}

	if err := validateComment("initialComment", in.InitialComment); err != nil {
		return nil, err
	}

	clock := hlc.NewClock()

	perma, err := vcs.EncodePermanode(mttdoc.NewConversationPermanode(me.AccountID(), clock.Now()))
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		meLocal := conn.LookupIdentity(me)
		convo := conn.NewObject(perma)
		change := conn.NewChange(convo, meLocal, nil, clock)
		batch := vcs.NewBatch(clock, me.DeviceKey().Abbrev())

		batch.Add(vcs.RootNode, mttdoc.AttrConvDocument, docid)

		for _, sel := range in.Selectors {
			snode := vcs.NewNodeIDv1(time.Now())
			rev, err := cid.Decode(sel.BlockRevision)
			if err != nil {
				return errutil.ParseError("selectors.blockRevision", sel.BlockRevision, rev, err)
			}
			batch.Add(snode, mttdoc.AttrConvSelectorBlockID, sel.BlockId)
			batch.Add(snode, mttdoc.AttrConvSelectorBlockRevision, rev)
			// If we have end on the selector we must have start, meaning that it's
			// a fine-grained selection, not the whole block.
			if sel.End != 0 {
				batch.Add(snode, mttdoc.AttrConvSelectorStart, int(sel.Start))
				batch.Add(snode, mttdoc.AttrConvSelectorEnd, int(sel.End))
			}
			batch.Add(vcs.RootNode, mttdoc.AttrConvSelector, snode)
		}

		batch.Add(vcs.RootNode, mttdoc.AttrBlockSnapshot, encodeBlock(in.InitialComment))

		dirty := batch.Dirty()

		conn.AddDatoms(convo, change, dirty...)
		conn.SaveVersion(convo, "main", meLocal, vcsdb.LocalVersion{change})
		conn.EncodeChange(change, me.DeviceKey())

		for _, d := range dirty {
			if err := backlinks.IndexDatom(conn, convo, change, d); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return api.loadConversation(conn, perma.ID)
}

// AddComment implements the Comments server.
func (api *Server) AddComment(ctx context.Context, in *documents.AddCommentRequest) (*documents.Block, error) {
	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	if in.ConversationId == "" {
		return nil, errutil.MissingArgument("conversationID")
	}

	convid, err := cid.Decode(in.ConversationId)
	if err != nil {
		return nil, errutil.ParseError("conversationID", in.ConversationId, convid, err)
	}

	if err := validateComment("comment", in.Comment); err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		meLocal := conn.LookupIdentity(me)
		obj := conn.LookupPermanode(convid)

		clock := hlc.NewClock()
		main := conn.GetVersion(obj, "main", meLocal)
		for _, v := range main {
			clock.Track(hlc.Unpack(conn.GetChangeMaxTime(obj, v)))
		}

		change := conn.NewChange(obj, meLocal, main, clock)
		batch := vcs.NewBatch(clock, me.DeviceKey().Abbrev())

		batch.Add(vcs.RootNode, mttdoc.AttrBlockSnapshot, encodeBlock(in.Comment))

		dirty := batch.Dirty()
		conn.AddDatoms(obj, change, dirty...)
		conn.SaveVersion(obj, "main", meLocal, vcsdb.LocalVersion{change})
		blk := conn.EncodeChange(change, me.DeviceKey())

		if err := conn.Err(); err != nil {
			return nil
		}

		in.Comment.Revision = blk.Cid().String()

		for _, d := range dirty {
			if err := backlinks.IndexDatom(conn, obj, change, d); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return in.Comment, nil
}

// DeleteConversation implements the Comments server.
func (api *Server) DeleteConversation(context.Context, *documents.DeleteConversationRequest) (*emptypb.Empty, error) {
	return nil, status.Errorf(codes.Unimplemented, "method DeleteConversation not implemented")
}

// ResolveConversation implements the Comments server.
func (api *Server) ResolveConversation(context.Context, *documents.ResolveConversationRequest) (*documents.ResolveConversationResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ResolveConversation not implemented")
}

// DeleteComment implements the Comments server.
func (api *Server) DeleteComment(context.Context, *documents.DeleteCommentRequest) (*emptypb.Empty, error) {
	return nil, status.Errorf(codes.Unimplemented, "method DeleteComment not implemented")
}

// ListConversations implements the Comments server.
func (api *Server) ListConversations(ctx context.Context, in *documents.ListConversationsRequest) (*documents.ListConversationsResponse, error) {
	me, err := api.me.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := api.vcsdb.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	doc, err := cid.Decode(in.DocumentId)
	if err != nil {
		return nil, errutil.ParseError("documentID", in.DocumentId, doc, err)
	}

	var docConvos []sqlitevcs.LocalID

	if err := conn.WithTx(false, func() error {
		meLocal := conn.LookupIdentity(me)

		convos := conn.ListObjectsByType(mttdoc.ConversationType)
		for _, obj := range convos {
			ver := conn.GetVersion(obj, "main", meLocal)
			cs := conn.ResolveChangeSet(obj, ver)
			it := conn.QueryValuesByAttr(obj, cs, vcs.RootNode, mttdoc.AttrConvDocument)
			for it.Next() {
				_, value := it.Item().Value()
				vcid := value.(cid.Cid)
				if !vcid.Equals(doc) {
					continue
				}

				docConvos = append(docConvos, obj)
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	resp := &documents.ListConversationsResponse{
		Conversations: make([]*documents.Conversation, len(docConvos)),
	}

	for i, obj := range docConvos {
		convo := conn.GetObjectCID(obj)
		convpb, err := api.loadConversation(conn, convo)
		if err != nil {
			return nil, fmt.Errorf("failed to load conversation: %w", err)
		}

		resp.Conversations[i] = convpb
	}

	return resp, nil
}

func (api *Server) loadConversation(conn *sqlitevcs.Conn, id cid.Cid) (*documents.Conversation, error) {
	me := api.me.MustGet()

	convo := &documents.Conversation{
		Id: id.String(),
	}

	if err := conn.WithTx(false, func() error {
		obj := conn.LookupPermanode(id)
		meLocal := conn.LookupIdentity(me)
		ver := conn.GetVersion(obj, "main", meLocal)
		cs := conn.ResolveChangeSet(obj, ver)

		sels := conn.QueryValuesByAttr(obj, cs, vcs.RootNode, mttdoc.AttrConvSelector)
		for _, sel := range sels.Slice() {
			selNode := sel.Value.(vcs.NodeID)
			selBlock := conn.QueryLastValue(obj, cs, selNode, mttdoc.AttrConvSelectorBlockID)
			if selBlock.IsZero() {
				return fmt.Errorf("failed to find block on the selector in conversation: %s", id.String())
			}
			selRev := conn.QueryLastValue(obj, cs, selNode, mttdoc.AttrConvSelectorBlockRevision)
			if selRev.IsZero() {
				return fmt.Errorf("failed to find block revision on the selector in conversation: %s", id.String())
			}

			selpb := &documents.Selector{
				BlockId:       selBlock.Value.(string),
				BlockRevision: selRev.Value.(cid.Cid).String(),
			}
			convo.Selectors = append(convo.Selectors, selpb)

			selStart := conn.QueryLastValue(obj, cs, selNode, mttdoc.AttrConvSelectorStart)
			// If we don't have selector start range, we won't have the end either.
			if selStart.IsZero() {
				continue
			}

			selpb.Start = int32(selStart.Value.(int))
			selEnd := conn.QueryLastValue(obj, cs, selNode, mttdoc.AttrConvSelectorEnd)
			if selEnd.IsZero() {
				return fmt.Errorf("failed to find select end while having selector start in conversation: %s", id.String())
			}
			selpb.End = int32(selEnd.Value.(int))
		}

		blocks := conn.QueryValuesByAttr(obj, cs, vcs.RootNode, mttdoc.AttrBlockSnapshot)
		for _, row := range blocks.Slice() {
			blk := decodeBlock(conn, obj, row.OpID(), row.Value.([]byte))
			convo.Comments = append(convo.Comments, blk)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return convo, nil
}

func validateSelectors(name string, in []*documents.Selector) error {
	if len(in) == 0 {
		return errutil.NotNil(name)
	}

	for _, sel := range in {
		if sel.BlockId == "" {
			return errutil.MissingArgument(name + ".blockID")
		}

		if sel.BlockRevision == "" {
			return errutil.MissingArgument(name + ".blockRevision")
		}

		if sel.Start > sel.End {
			return errutil.Greater(name+".end", sel.End, sel.Start)
		}
	}

	return nil
}

func validateComment(name string, in *documents.Block) error {
	if in == nil {
		return errutil.NotNil(name)
	}

	if in.Type == "" {
		return errutil.MissingArgument(name + ".type")
	}

	if in.Text == "" {
		return errutil.MissingArgument(name + ".text")
	}

	return nil
}
