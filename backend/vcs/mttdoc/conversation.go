package mttdoc

import (
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"

	"github.com/ipfs/go-cid"
)

// NewConversationPermanode creates a new Permanode for the Mintter Conversation object.
func NewConversationPermanode(owner cid.Cid, at hlc.Time) vcs.Permanode {
	p := NewDocumentPermanode(owner, at)
	p.Type = ConversationType

	return p
}

// Attributes for document-related datoms.
const (
	AttrConvDocument              vcs.Attribute = "mintter.conversation/target-document"
	AttrConvVersion               vcs.Attribute = "mintter.conversation/target-version"
	AttrConvSelector              vcs.Attribute = "mintter.conversation/selector"
	AttrConvSelectorBlockRevision vcs.Attribute = "mintter.conversation.selector/block-revision"
	AttrConvSelectorBlockID       vcs.Attribute = "mintter.conversation.selector/block-id"
	AttrConvSelectorStart         vcs.Attribute = "mintter.conversation.selector/start"
	AttrConvSelectorEnd           vcs.Attribute = "mintter.conversation.selector/end"
)
