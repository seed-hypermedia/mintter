package mttnet

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	p2p "seed/backend/genproto/p2p/v1alpha"
	"seed/backend/pkg/dqb"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"go.uber.org/zap"
)

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

	maxid, err := getMaxBlobID(conn)
	if err != nil {
		return err
	}

	if c.ID == maxid {
		return nil
	}

	// Sometimes we run development builds using the copy of production database,
	// which may cause the sync to advance forward. So then, when we are back to using
	// our real production database, it can happen that our peers would have a cursor
	// that is further than our real database. In this case we just pretend they don't have any cursor
	// and we start from the beginning returning all the blobs in the list.
	// It's not optimal, but this shouldn't happen too often to matter.
	if c.ID > maxid {
		c.ID = 0
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
	FROM blobs INDEXED BY blobs_metadata
	LEFT OUTER JOIN drafts ON drafts.blob = blobs.id
	WHERE blobs.size >= 0
	AND drafts.blob IS NULL
	AND blobs.id > ?;
`)

func getMaxBlobID(conn *sqlite.Conn) (int64, error) {
	var max int64
	if err := sqlitex.Exec(conn, "SELECT MAX(rowid) FROM blobs", func(stmt *sqlite.Stmt) error {
		max = stmt.ColumnInt64(0)
		return nil
	}); err != nil {
		return 0, err
	}

	return max, nil
}

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
