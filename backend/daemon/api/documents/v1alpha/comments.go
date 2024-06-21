package documents

import (
	"context"
	"fmt"
	"net/url"
	"seed/backend/core"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/hlc"
	"seed/backend/hyper"
	"seed/backend/pkg/errutil"
	"strings"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// CreateComment creates a new comment.
func (srv *Server) CreateComment(ctx context.Context, in *documents.CreateCommentRequest) (*documents.Comment, error) {
	if in.Target == "" {
		return nil, errutil.MissingArgument("target")
	}

	if in.Content == nil {
		return nil, errutil.MissingArgument("content")
	}

	u, err := url.Parse(in.Target)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to parse target %s as a URL: %v", in.Target, err)
	}

	if u.Host != "d" {
		return nil, status.Errorf(codes.InvalidArgument, "target must be a document URL, got %s", in.Target)
	}

	if u.Query().Get("v") == "" {
		return nil, status.Errorf(codes.InvalidArgument, "target must use versioned URLs, got %s", in.Target)
	}

	me, err := srv.getMe()
	if err != nil {
		return nil, err
	}

	del, err := srv.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	clock := hlc.NewClock()

	var (
		threadRoot     cid.Cid
		repliedComment cid.Cid
	)
	if in.RepliedComment != "" {
		if !strings.HasPrefix(in.RepliedComment, "hm://c/") {
			return nil, status.Errorf(codes.InvalidArgument, "replied_comment must be a comment ID, got %s", in.RepliedComment)
		}

		repliedCID, err := cid.Decode(strings.TrimPrefix(in.RepliedComment, "hm://c/"))
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "failed to parse CID from %s: %v", in.RepliedComment, err)
		}

		repliedBlock, err := srv.blobs.IPFSBlockstore().Get(ctx, repliedCID)
		if err != nil {
			return nil, fmt.Errorf("replied comment %s not found: %w", in.RepliedComment, err)
		}

		replied, err := hyper.DecodeBlob(repliedBlock.Cid(), repliedBlock.RawData())
		if err != nil {
			return nil, err
		}

		repliedCmt, ok := replied.Decoded.(hyper.Comment)
		if !ok {
			return nil, status.Errorf(codes.InvalidArgument, "replied comment %s is not a comment", in.RepliedComment)
		}

		threadRoot = repliedCmt.ThreadRoot
		if !threadRoot.Defined() {
			threadRoot = repliedCID
		}
		repliedComment = repliedCID
		if err := clock.Track(repliedCmt.HLCTime); err != nil {
			return nil, err
		}
	}

	hb, err := hyper.NewComment(in.Target, threadRoot, repliedComment, clock.MustNow(), me.DeviceKey(), del, commentContentFromProto(in.Content))
	if err != nil {
		return nil, err
	}

	if err := srv.blobs.SaveBlob(ctx, hb); err != nil {
		return nil, fmt.Errorf("failed to save comment: %w", err)
	}

	return commentToProto(ctx, srv.blobs, hb.CID, hb.Decoded.(hyper.Comment))
}

func (srv *Server) getMe() (core.Identity, error) {
	me, err := srv.keys.GetKey(context.TODO(), "main")
	if err != nil {
		return core.Identity{}, err
	}

	return core.NewIdentity(me.PublicKey, me), nil
}

// GetComment gets a comment by ID.
func (srv *Server) GetComment(ctx context.Context, in *documents.GetCommentRequest) (*documents.Comment, error) {
	if !strings.HasPrefix(in.Id, "hm://c/") {
		return nil, status.Errorf(codes.InvalidArgument, "comment ID must start with hm://c/, got '%s'", in.Id)
	}

	cid, err := cid.Decode(strings.TrimPrefix(in.Id, "hm://c/"))
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to parse comment CID from %s: %v", in.Id, err)
	}

	block, err := srv.blobs.IPFSBlockstore().Get(ctx, cid)
	if err != nil {
		return nil, fmt.Errorf("comment %s not found: %w", in.Id, err)
	}

	hb, err := hyper.DecodeBlob(block.Cid(), block.RawData())
	if err != nil {
		return nil, err
	}

	return commentToProto(ctx, srv.blobs, hb.CID, hb.Decoded.(hyper.Comment))
}

// ListComments lists comments and replies for a given target.
func (srv *Server) ListComments(ctx context.Context, in *documents.ListCommentsRequest) (*documents.ListCommentsResponse, error) {
	if in.Target == "" {
		return nil, errutil.MissingArgument("target")
	}

	resp := &documents.ListCommentsResponse{}
	if err := srv.blobs.ForEachComment(ctx, in.Target, func(c cid.Cid, cmt hyper.Comment, _ *sqlite.Conn) error {
		pb, err := commentToProto(ctx, srv.blobs, c, cmt)
		if err != nil {
			return fmt.Errorf("failed to convert comment %s to proto", c.String())
		}
		resp.Comments = append(resp.Comments, pb)
		return nil
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

func commentToProto(ctx context.Context, blobs *hyper.Storage, c cid.Cid, cmt hyper.Comment) (*documents.Comment, error) {
	author, err := blobs.GetDelegationIssuer(ctx, cmt.Delegation)
	if err != nil {
		return nil, err
	}

	pb := &documents.Comment{
		Id:         "hm://c/" + c.String(),
		Target:     cmt.Target,
		Author:     author.String(),
		Content:    commentContentToProto(cmt.Body),
		CreateTime: timestamppb.New(cmt.HLCTime.Time()),
	}
	if cmt.RepliedComment.Defined() {
		pb.RepliedComment = "hm://c/" + cmt.RepliedComment.String()
	}

	if cmt.ThreadRoot.Defined() {
		pb.ThreadRoot = "hm://c/" + cmt.ThreadRoot.String()
	}

	return pb, nil
}

func commentContentToProto(in []hyper.CommentBlock) []*documents.BlockNode {
	if in == nil {
		return nil
	}

	out := make([]*documents.BlockNode, len(in))
	for i, b := range in {
		out[i] = &documents.BlockNode{
			Block: &documents.Block{
				Id:          b.ID,
				Type:        b.Type,
				Text:        b.Text,
				Ref:         b.Ref,
				Attributes:  b.Attributes,
				Annotations: annotationsToProto(b.Annotations),
			},
			Children: commentContentToProto(b.Children),
		}
	}

	return out
}

func annotationsToProto(in []hyper.Annotation) []*documents.Annotation {
	if in == nil {
		return nil
	}

	out := make([]*documents.Annotation, len(in))
	for i, a := range in {
		out[i] = &documents.Annotation{
			Type:       a.Type,
			Ref:        a.Ref,
			Attributes: a.Attributes,
			Starts:     a.Starts,
			Ends:       a.Ends,
		}
	}

	return out
}

func commentContentFromProto(in []*documents.BlockNode) []hyper.CommentBlock {
	if in == nil {
		return nil
	}

	out := make([]hyper.CommentBlock, len(in))

	for i, n := range in {
		out[i] = hyper.CommentBlock{
			Block: hyper.Block{
				ID:          n.Block.Id,
				Type:        n.Block.Type,
				Text:        n.Block.Text,
				Ref:         n.Block.Ref,
				Attributes:  n.Block.Attributes,
				Annotations: annotationsFromProto(n.Block.Annotations),
			},
			Children: commentContentFromProto(n.Children),
		}
	}

	return out
}

func annotationsFromProto(in []*documents.Annotation) []hyper.Annotation {
	if in == nil {
		return nil
	}

	out := make([]hyper.Annotation, len(in))
	for i, a := range in {
		out[i] = hyper.Annotation{
			Type:       a.Type,
			Ref:        a.Ref,
			Attributes: a.Attributes,
			Starts:     a.Starts,
			Ends:       a.Ends,
		}
	}

	return out
}
