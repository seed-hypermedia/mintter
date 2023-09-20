package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
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

// ListBlobs lists all the blobs that the node has.
func (srv *rpcMux) ListBlobs(_ *p2p.ListBlobsRequest, stream p2p.P2P_ListBlobsServer) error {
	ctx := stream.Context()
	conn, release, err := srv.Node.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.Exec(conn, qAllPublicBlobs, func(stmt *sqlite.Stmt) error {
		codec := stmt.ColumnInt64(0)
		hash := stmt.ColumnBytesUnsafe(1)

		c := cid.NewCidV1(uint64(codec), hash)

		if err := stream.Send(&p2p.Blob{Cid: c.Bytes()}); err != nil {
			return err
		}

		return nil
	})
}
