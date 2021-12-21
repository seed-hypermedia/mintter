package backend

import (
	"context"
	"mintter/backend/ipfs"

	"github.com/ipfs/go-cid"
)

type Backlink struct {
	SourceDocumentID cid.Cid
	SourceBlockID    string
	SourceChange     cid.Cid

	TargetDocumentID cid.Cid
	TargetBlockID    string
	TargetVersion    string
}

func (b Backlink) IsSourceDraft() bool {
	return !b.SourceChange.Defined()
}

func (srv *backend) ListBacklinks(ctx context.Context, pubid cid.Cid) ([]Backlink, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}

	ocodec, ohash := ipfs.DecodeCID(pubid)

	list, err := backlinksListForPublication(conn, 1, ohash, int(ocodec))
	release()
	if err != nil {
		return nil, err
	}
	if list == nil {
		return nil, nil
	}

	out := make([]Backlink, len(list))

	for i, l := range list {
		out[i] = Backlink{
			SourceDocumentID: cid.NewCidV1(uint64(l.SourceObjectCodec), l.SourceObjectMultihash),
			SourceBlockID:    l.LinksSourceBlockID,
			TargetDocumentID: pubid,
			TargetBlockID:    l.LinksTargetBlockID,
			TargetVersion:    l.LinksTargetVersion,
		}
		if l.IsDraft == 0 {
			out[i].SourceChange = cid.NewCidV1(uint64(l.SourceIPFSBlockCodec), l.SourceIPFSBlockMultihash)
		}
	}

	return out, nil
}
