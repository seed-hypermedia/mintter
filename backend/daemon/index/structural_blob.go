package index

import (
	"seed/backend/core"
	"time"

	"github.com/ipfs/go-cid"
)

type StructuralBlob struct {
	CID         cid.Cid
	Type        string
	Author      core.Principal
	Ts          time.Time
	GenesisBlob cid.Cid
	Resource    struct {
		ID          IRI
		Owner       core.Principal
		GenesisBlob cid.Cid
		CreateTime  time.Time
	}
	BlobLinks     []BlobLink
	ResourceLinks []ResourceLink
	Meta          any
}

func newStructuralBlob(id cid.Cid, blobType string, author core.Principal, ts time.Time, resource IRI, resourceGenesis cid.Cid, resourceOwner core.Principal, resourceTimestamp time.Time) StructuralBlob {
	sb := StructuralBlob{
		CID:    id,
		Type:   blobType,
		Author: author,
		Ts:     ts,
	}
	sb.Resource.ID = resource
	sb.Resource.Owner = resourceOwner
	sb.Resource.CreateTime = resourceTimestamp
	sb.Resource.GenesisBlob = resourceGenesis

	return sb
}

func newSimpleStructuralBlob(id cid.Cid, blobType string) StructuralBlob {
	return StructuralBlob{CID: id, Type: blobType}
}

func (sb *StructuralBlob) AddBlobLink(linkType string, target cid.Cid) {
	sb.BlobLinks = append(sb.BlobLinks, BlobLink{Type: linkType, Target: target})
}

func (sb *StructuralBlob) AddResourceLink(linkType string, target IRI, isPinned bool, meta any) {
	sb.ResourceLinks = append(sb.ResourceLinks, ResourceLink{Type: linkType, Target: target, IsPinned: isPinned, Meta: meta})
}

type BlobLink struct {
	Type   string
	Target cid.Cid
}

type ResourceLink struct {
	Type     string
	Target   IRI
	IsPinned bool
	Meta     any
}
