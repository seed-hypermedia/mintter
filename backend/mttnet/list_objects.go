package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"golang.org/x/exp/maps"
)

// ListObjects lists all the local objects.
func (srv *rpcMux) ListObjects(ctx context.Context, in *p2p.ListObjectsRequest) (*p2p.ListObjectsResponse, error) {
	n := srv.Node

	objs := map[hyper.EntityID]*p2p.Object{}

	if err := n.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		list, err := hypersql.ChangesListPublicNoData(conn)
		if err != nil {
			return err
		}

		for _, l := range list {
			eid := hyper.EntityID(l.ChangesViewEntity)
			obj, ok := objs[eid]
			if !ok {
				obj = &p2p.Object{
					Id: string(eid),
				}
				objs[eid] = obj
			}

			c := cid.NewCidV1(uint64(l.ChangesViewCodec), l.ChangesViewMultihash)
			obj.ChangeIds = append(obj.ChangeIds, c.String())
		}

		return nil
	}); err != nil {
		return nil, err
	}

	out := &p2p.ListObjectsResponse{
		Objects: maps.Values(objs),
	}

	return out, nil
}
