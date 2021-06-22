package backend

import (
	"github.com/ipfs/go-cid"
)

func init() {
	cid.Codecs["mintter-account"] = codecAccountID
	cid.CodecToStr[codecAccountID] = "mintter-account"

	cid.Codecs["mintter-document"] = codecDocumentID
	cid.CodecToStr[codecDocumentID] = "mintter-document"
}

// See cids_grammar.ebnf for explanation about our identifiers.

const (
	codecAccountID  uint64 = 1091161161
	codecDocumentID uint64 = 1091161162
)
