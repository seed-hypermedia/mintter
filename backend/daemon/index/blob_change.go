package index

import (
	"fmt"
	"seed/backend/core"

	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

func init() {
	cbornode.RegisterCborType(Change{})
	cbornode.RegisterCborType(ChangeUnsigned{})
}

const BlobTypeChange BlobType = "Change"

type Change struct {
	ChangeUnsigned
	Sig core.Signature `refmt:"sig,omitempty"`
}

func NewChange(kp core.KeyPair, deps []cid.Cid, action string, payload map[string]any, ts int64) (eb EncodedBlob[*Change], err error) {
	cu := ChangeUnsigned{
		Type:    BlobTypeChange,
		Deps:    deps,
		Action:  action,
		Payload: payload,
		Author:  kp.Principal(),
		Ts:      ts,
	}

	cc, err := cu.Sign(kp)
	if err != nil {
		return eb, err
	}

	return EncodeBlob(cc)
}

type ChangeUnsigned struct {
	Type    BlobType       `refmt:"@type"`
	Deps    []cid.Cid      `refmt:"deps,omitempty"`
	Action  string         `refmt:"action"`
	Payload map[string]any `refmt:"payload"`
	Author  core.Principal `refmt:"author"`
	Ts      int64          `refmt:"ts"`
}

func (c *ChangeUnsigned) Sign(kp core.KeyPair) (cc *Change, err error) {
	if !c.Author.Equal(kp.Principal()) {
		return nil, fmt.Errorf("author mismatch when signing")
	}

	data, err := cbornode.DumpObject(c)
	if err != nil {
		return nil, err
	}

	sig, err := kp.Sign(data)
	if err != nil {
		return nil, err
	}

	return &Change{
		ChangeUnsigned: *c,
		Sig:            sig,
	}, nil
}
