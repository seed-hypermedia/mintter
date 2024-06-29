package index

import (
	"fmt"
	"seed/backend/core"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

const BlobTypeRef BlobType = "Ref"

func init() {
	cbornode.RegisterCborType(Ref{})
	cbornode.RegisterCborType(RefUnsigned{})
}

type Ref struct {
	RefUnsigned
	Sig core.Signature `refmt:"sig,omitempty"`
}

func NewRef(kp core.KeyPair, genesis cid.Cid, rid IRI, heads []cid.Cid, ts int64) (eb EncodedBlob[*Ref], err error) {
	ru := RefUnsigned{
		Type:        BlobTypeRef,
		Resource:    rid,
		GenesisBlob: genesis,
		Heads:       heads,
		Author:      kp.Principal(),
		Ts:          ts,
	}

	cc, err := ru.Sign(kp)
	if err != nil {
		return eb, err
	}

	return EncodeBlob(cc)
}

type RefUnsigned struct {
	Type        BlobType       `refmt:"@type"`
	Resource    IRI            `refmt:"resource"`
	GenesisBlob cid.Cid        `refmt:"genesisBlob"`
	Heads       []cid.Cid      `refmt:"heads"`
	Author      core.Principal `refmt:"author"`
	Ts          int64          `refmt:"ts"`
}

func (r *RefUnsigned) Sign(kp core.KeyPair) (rr *Ref, err error) {
	if !r.Author.Equal(kp.Principal()) {
		return nil, fmt.Errorf("author mismatch when signing")
	}

	data, err := cbornode.DumpObject(r)
	if err != nil {
		return nil, err
	}

	sig, err := kp.Sign(data)
	if err != nil {
		return nil, err
	}

	return &Ref{
		RefUnsigned: *r,
		Sig:         sig,
	}, nil
}
