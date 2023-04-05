package sqlitevcs

import (
	"crypto/rand"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

func init() {
	cbornode.RegisterCborType(DocumentPermanode{})
	cbornode.RegisterCborType(AccountPermanode{})
}

// NewConversationPermanode creates a new Permanode for the Mintter Conversation object.
func NewConversationPermanode(owner cid.Cid, at hlc.Time) vcs.Permanode {
	p := NewDocumentPermanode(owner, at)
	p.Type = ConversationType

	return p
}

// Permanode types.
const (
	DocumentType     vcs.ObjectType = "https://schema.mintter.org/Document"
	ConversationType vcs.ObjectType = "https://schema.mintter.org/Conversation"
	AccountType      vcs.ObjectType = "https://schema.mintter.org/Account"
)

// DocumentPermanode is a vcs.Permanode for Mintter Documents.
type DocumentPermanode struct {
	vcs.BasePermanode

	Nonce []byte
}

// NewDocumentPermanode creates a new Permanode for the Mintter Document.
func NewDocumentPermanode(owner cid.Cid, at hlc.Time) DocumentPermanode {
	p := DocumentPermanode{
		BasePermanode: vcs.BasePermanode{
			Type:       DocumentType,
			Owner:      owner,
			CreateTime: at,
		},
		Nonce: make([]byte, 8),
	}

	_, err := rand.Read(p.Nonce)
	if err != nil {
		panic("can't read random data")
	}

	return p
}

// AccountPermanode is an implementation of a Permanode for Account objects.
type AccountPermanode struct {
	vcs.BasePermanode
}

// NewAccountPermanode creates a new permanode for an Account.
func NewAccountPermanode(owner cid.Cid) AccountPermanode {
	return AccountPermanode{
		BasePermanode: vcs.BasePermanode{
			Type:       AccountType,
			Owner:      owner,
			CreateTime: hlc.Time{}, // zero time for deterministic permanode.
		},
	}
}
