package publishing

import (
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

func init() {
	cbornode.RegisterCborType(Section{})
	cbornode.RegisterCborType(Publication{})
}

// Publication is the IPLD representation of a published document.
type Publication struct {
	DocumentID  string
	Title       string
	Description string
	Author      string
	// Previous    cid.Cid
	Sections []cid.Cid
	// Signature
}

// Section is the IPLD representation of a published document.
type Section struct {
	DocumentID  string
	Title       string
	Description string
	Author      string
	Body        string
	// CreateTime  time.Time
	CreateTime string
}
