// Package hyper implements the hypermedia subsystem of the Mintter application.
package hyper

import (
	"context"
	"mintter/backend/core"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
)

type Blob struct {
	CID       cid.Cid
	Labels    []string
	XIDs      []string
	Creator   peer.ID
	Signer    peer.ID
	Signature core.Signature
	Links     []Link

	data []byte
}

type LinkType string

type Link struct {
	Type           LinkType
	SourceBlob     cid.Cid
	SourceVersion  cid.Cid
	SourceFragment string
	TargetBlob     cid.Cid
	TargetVersion  cid.Cid
	TargetFragment string
}

type BlobStore interface {
	StoreBlob(context.Context, *Blob)
}
