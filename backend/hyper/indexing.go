package hyper

import (
	"context"
	"encoding/json"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/daemon/storage"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/hyper/hypersql"
	"net/url"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multicodec"
	"go.uber.org/zap"
	"golang.org/x/exp/slices"
	"google.golang.org/protobuf/encoding/protojson"
)

// Reindex forces deletes all the information derived from the blobs and reindexes them.
func (bs *Storage) Reindex(ctx context.Context) (err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return bs.reindex(conn)
}

func (bs *Storage) reindex(conn *sqlite.Conn) (err error) {
	start := time.Now()
	bs.log.Debug("ReindexingStarted")
	defer func() {
		bs.log.Debug("ReindexingFinished", zap.Error(err), zap.Duration("duration", time.Since(start)))
	}()

	// Order is important to ensure foreign key constraints are not violated.
	derivedTables := []string{
		storage.T_HDLinks,
		storage.T_KeyDelegations,
		storage.T_HDChanges,
		storage.T_HDEntities,
	}

	const q = "SELECT * FROM " + storage.T_Blobs

	if err := sqlitex.WithTx(conn, func() error {
		for _, table := range derivedTables {
			if err := sqlitex.ExecTransient(conn, "DELETE FROM "+table, nil); err != nil {
				return err
			}
		}

		buf := make([]byte, 0, 1024*1024) // 1MB preallocated slice to reuse for decompressing.
		if err := sqlitex.ExecTransient(conn, q, func(stmt *sqlite.Stmt) error {
			codec := stmt.ColumnInt64(stmt.ColumnIndex(storage.BlobsCodec.ShortName()))
			// We only know how to index dag-cbor blobs.
			if codec != int64(multicodec.DagCbor) {
				return nil
			}

			id := stmt.ColumnInt64(stmt.ColumnIndex(storage.BlobsID.ShortName()))
			hash := stmt.ColumnBytes(stmt.ColumnIndex(storage.BlobsMultihash.ShortName()))
			size := stmt.ColumnInt(stmt.ColumnIndex(storage.BlobsSize.ShortName()))
			data := stmt.ColumnBytesUnsafe(stmt.ColumnIndex(storage.BlobsData.ShortName()))

			buf = buf[:0]
			buf = slices.Grow(buf, size)
			buf, err = bs.bs.decoder.DecodeAll(data, buf)
			if err != nil {
				return fmt.Errorf("failed to decompress block: %w", err)
			}

			c := cid.NewCidV1(uint64(codec), hash)
			hb, err := DecodeBlob(c, buf)
			if err != nil {
				bs.log.Warn("failed to decode blob for reindexing", zap.Error(err), zap.String("cid", c.String()))
				return nil
			}

			return bs.indexBlob(conn, id, hb)
		}); err != nil {
			return err
		}

		return hypersql.SetReindexTime(conn, time.Now().UTC().String())
	}); err != nil {
		return err
	}

	return nil
}

// MaybeReindex will trigger reindexing if it's needed.
func (bs *Storage) MaybeReindex(ctx context.Context) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	res, err := hypersql.GetReindexTime(conn)
	if err != nil {
		return err
	}

	if res.GlobalMetaValue == "" {
		return bs.reindex(conn)
	}

	return nil
}

// indexBlob is an uber-function that knows about all types of blobs we want to index.
// This is probably a bad idea to put here, but for now it's easier to work with that way.
// TODO(burdiyan): eventually we might want to make this package agnostic to blob types.
func (bs *Storage) indexBlob(conn *sqlite.Conn, id int64, blob Blob) error {
	switch v := blob.Decoded.(type) {
	case KeyDelegation:
		iss, err := bs.ensurePublicKey(conn, v.Issuer)
		if err != nil {
			return err
		}

		del, err := bs.ensurePublicKey(conn, v.Delegate)
		if err != nil {
			return err
		}

		if v.Purpose != DelegationPurposeRegistration {
			bs.log.Warn("UnknownKeyDelegationPurpose", zap.String("purpose", v.Purpose))
		} else {
			_, err := hypersql.EntitiesInsertOrIgnore(conn, "hd://a/"+v.Issuer.String())
			if err != nil {
				return err
			}
		}

		if _, err := hypersql.KeyDelegationsInsertOrIgnore(conn, id, iss, del, v.IssueTime.Unix()); err != nil {
			return err
		}
	case Change:
		// ensure entity
		eid, err := bs.ensureEntity(conn, v.Entity)
		if err != nil {
			return err
		}

		for _, dep := range v.Deps {
			res, err := hypersql.BlobsGetSize(conn, dep.Hash())
			if err != nil {
				return err
			}
			if res.BlobsSize < 0 {
				return fmt.Errorf("missing causal dependency %s of change %s", dep, blob.CID)
			}

			if err := hypersql.LinksInsert(conn, id, "change:depends", res.BlobsID, 0, nil); err != nil {
				return fmt.Errorf("failed to link dependency %s of change %s", dep, blob.CID)
			}
		}

		if err := hypersql.ChangesInsertOrIgnore(conn, id, eid, v.HLCTime.Pack()); err != nil {
			return err
		}

		if err := bs.indexLinks(conn, id, blob.CID, v); err != nil {
			return err
		}
	}

	return nil
}

func (bs *Storage) ensureEntity(conn *sqlite.Conn, eid EntityID) (int64, error) {
	look, err := hypersql.EntitiesLookupID(conn, string(eid))
	if err != nil {
		return 0, err
	}
	if look.HDEntitiesID != 0 {
		return look.HDEntitiesID, nil
	}

	ins, err := hypersql.EntitiesInsertOrIgnore(conn, string(eid))
	if err != nil {
		return 0, err
	}
	if ins.HDEntitiesID == 0 {
		return 0, fmt.Errorf("failed to insert entity for some reason")
	}

	return ins.HDEntitiesID, nil
}

func (bs *Storage) ensurePublicKey(conn *sqlite.Conn, key core.Principal) (int64, error) {
	res, err := hypersql.PublicKeysLookupID(conn, key)
	if err != nil {
		return 0, err
	}

	if res.PublicKeysID > 0 {
		return res.PublicKeysID, nil
	}

	ins, err := hypersql.PublicKeysInsert(conn, key)
	if err != nil {
		return 0, err
	}

	if ins.PublicKeysID <= 0 {
		panic("BUG: failed to insert key for some reason")
	}

	return ins.PublicKeysID, nil
}

func (bs *Storage) indexLinks(conn *sqlite.Conn, blobID int64, c cid.Cid, ch Change) error {
	if !ch.Entity.HasPrefix("hd://d/") {
		return nil
	}

	blocks, ok := ch.Patch["blocks"].(map[string]any)
	if !ok {
		return nil
	}

	handleURL := func(sourceBlockID, linkType, rawURL string) error {
		if rawURL == "" {
			return nil
		}

		u, err := url.Parse(rawURL)
		if err != nil {
			bs.log.Warn("FailedToParseURL", zap.String("url", rawURL), zap.Error(err))
			return nil
		}

		switch u.Scheme {
		case "hd":
			ld := LinkData{
				SourceBlock:    sourceBlockID,
				TargetFragment: u.Fragment,
				TargetVersion:  u.Query().Get("v"),
			}

			target := EntityID("hd://" + u.Host + u.Path)
			rel := "href:" + linkType

			targetID, err := bs.ensureEntity(conn, target)
			if err != nil {
				return err
			}

			ldjson, err := json.Marshal(ld)
			if err != nil {
				return fmt.Errorf("failed to encode link data: %w", err)
			}

			if err := hypersql.LinksInsert(conn, blobID, rel, 0, targetID, ldjson); err != nil {
				return err
			}
		case "ipfs":
			// TODO: parse ipfs links
		}

		return nil
	}

	for id, blk := range blocks {
		v, ok := blk.(map[string]any)["#map"]
		if !ok {
			continue
		}
		// This is a very bad way to convert an opaque map into a block struct.
		// TODO(burdiyan): we should do better than this. This is ugly as hell.
		data, err := json.Marshal(v)
		if err != nil {
			return err
		}
		blk := &documents.Block{}
		if err := protojson.Unmarshal(data, blk); err != nil {
			return err
		}
		blk.Id = id
		blk.Revision = c.String()

		if err := handleURL(blk.Id, blk.Type, blk.Ref); err != nil {
			return err
		}

		for _, ann := range blk.Annotations {
			if err := handleURL(blk.Id, ann.Type, ann.Ref); err != nil {
				return err
			}

			// Legacy behavior. We only care about annotations with URL attribute.
			if err := handleURL(blk.Id, ann.Type, ann.Attributes["url"]); err != nil {
				return err
			}
		}
	}

	return nil
}

type LinkData struct {
	SourceBlock    string `json:"b,omitempty"`
	TargetFragment string `json:"f,omitempty"`
	TargetVersion  string `json:"v,omitempty"`
}
