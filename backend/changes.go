package backend

import (
	"github.com/ipfs/go-cid"
)

//go:generate protoc --go_out=:. --go-vtproto_out=:. --go-vtproto_opt=features=pool+marshal+unmarshal+size changes.proto

func (lpb *DocumentChange_Link) ToLink() (Link, error) {
	docid, err := cid.Decode(lpb.TargetDocumentId)
	if err != nil {
		return Link{}, err
	}

	// TODO: validate version.
	// TODO: validate document ID is correct.

	return Link{
		SourceBlockID:    lpb.SourceBlockId,
		TargetDocumentID: docid,
		TargetBlockID:    lpb.TargetBlockId,
		TargetVersion:    Version(lpb.TargetVersion),
	}, nil
}

func (l Link) Proto() *DocumentChange_Link {
	return &DocumentChange_Link{
		SourceBlockId:    l.SourceBlockID,
		TargetDocumentId: l.TargetDocumentID.String(),
		TargetBlockId:    l.TargetBlockID,
		TargetVersion:    l.TargetVersion.String(),
	}
}
