package mttnet

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/pkg/dqb"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"go.uber.org/zap"
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
			eid := hyper.EntityID(l.StructuralBlobsViewResource)
			obj, ok := objs[eid]
			if !ok {
				obj = &p2p.Object{
					Id: string(eid),
				}
				objs[eid] = obj
			}

			c := cid.NewCidV1(uint64(l.StructuralBlobsViewCodec), l.StructuralBlobsViewMultihash)
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
func (srv *rpcMux) ListBlobs(in *p2p.ListBlobsRequest, stream p2p.P2P_ListBlobsServer) error {
	ctx := stream.Context()
	conn, release, err := srv.Node.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	var c cursor
	if in.Cursor != "" {
		c, err = decodeCursor(in.Cursor)
		if err != nil {
			return fmt.Errorf("failed to decode cursor %s: %w", in.Cursor, err)
		}
	}

	return sqlitex.Exec(conn, qListBlobs(), func(stmt *sqlite.Stmt) error {
		id := stmt.ColumnInt64(0)
		codec := stmt.ColumnInt64(1)
		hash := stmt.ColumnBytesUnsafe(2)

		c := cid.NewCidV1(uint64(codec), hash)

		cur, err := encodeCursor(cursor{ID: id})
		if err != nil {
			srv.Node.log.Warn("FailedToEncodeCursor", zap.Error(err), zap.String("blob", c.String()))
			return fmt.Errorf("failed to encode cursor: %w", err)
		}

		if err := stream.Send(&p2p.Blob{Cid: c.Bytes(), Cursor: cur}); err != nil {
			return err
		}

		return nil
	}, c.ID)
}

var qListBlobs = dqb.Str(`
	SELECT
		blobs.id,
		blobs.codec,
		blobs.multihash
	FROM blobs
	LEFT OUTER JOIN drafts ON drafts.blob = blobs.id
	WHERE blobs.size >= 0
	AND drafts.blob IS NULL
	AND blobs.id > ?;
`)

func encodeCursor(c cursor) (string, error) {
	data, err := json.Marshal(c)
	if err != nil {
		return "", err
	}

	return base64.RawStdEncoding.EncodeToString(data), nil
}

type cursor struct {
	ID int64
}

func decodeCursor(s string) (c cursor, err error) {
	data, err := base64.RawStdEncoding.DecodeString(s)
	if err != nil {
		return c, err
	}

	if err := json.Unmarshal(data, &c); err != nil {
		return c, err
	}

	return c, nil
}
