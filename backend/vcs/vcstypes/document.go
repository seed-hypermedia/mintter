package vcstypes

import (
	"crypto/rand"
	"mintter/backend/vcs"
	"time"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

const DocumentType vcs.ObjectType = "https://schema.mintter.org/Document"

func init() {
	cbornode.RegisterCborType(DocumentPermanode{})
}

type DocumentPermanode struct {
	vcs.BasePermanode

	Nonce []byte
}

func NewDocumentPermanode(owner cid.Cid) DocumentPermanode {
	p := DocumentPermanode{
		BasePermanode: vcs.BasePermanode{
			Type:       DocumentType,
			Owner:      owner,
			CreateTime: time.Now().UTC().Round(time.Second),
		},
		Nonce: make([]byte, 8),
	}

	_, err := rand.Read(p.Nonce)
	if err != nil {
		panic("can't read random data")
	}

	return p
}
