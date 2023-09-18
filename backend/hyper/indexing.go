package hyper

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/daemon/storage"
	documents "mintter/backend/genproto/documents/v1alpha"
	groups "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/ipfs"
	"net/url"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/multiformats/go-multicodec"
	"go.uber.org/zap"
	"golang.org/x/exp/slices"
	"google.golang.org/protobuf/encoding/protojson"
)

type indexer struct {
	db  *sqlitex.Pool
	log *zap.Logger
	bs  *blockStore
}

// Reindex forces deletes all the information derived from the blobs and reindexes them.
func (bs *indexer) Reindex(ctx context.Context) (err error) {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return bs.reindex(conn)
}

func (bs *indexer) reindex(conn *sqlite.Conn) (err error) {
	start := time.Now()
	bs.log.Debug("ReindexingStarted")
	defer func() {
		bs.log.Debug("ReindexingFinished", zap.Error(err), zap.Duration("duration", time.Since(start)))
	}()

	// Order is important to ensure foreign key constraints are not violated.
	derivedTables := []string{
		storage.T_Changes,
		storage.T_BlobLinks,
		storage.T_BlobAttrs,
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

			return bs.indexBlob(conn, id, hb.CID, hb.Decoded)
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
func (bs *indexer) MaybeReindex(ctx context.Context) error {
	conn, release, err := bs.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	res, err := hypersql.GetReindexTime(conn)
	if err != nil {
		return err
	}

	if res.KVValue == "" {
		return bs.reindex(conn)
	}

	return nil
}

// indexBlob is an uber-function that knows about all types of blobs we want to index.
// This is probably a bad idea to put here, but for now it's easier to work with that way.
// TODO(burdiyan): eventually we might want to make this package agnostic to blob types.
func (bs *indexer) indexBlob(conn *sqlite.Conn, id int64, c cid.Cid, blobData any) error {
	switch v := blobData.(type) {
	case KeyDelegation:
		// Validate key delegation.
		{
			if v.Purpose != DelegationPurposeRegistration {
				return fmt.Errorf("unknown key delegation purpose %q", v.Purpose)
			}

			if _, err := v.Issuer.Libp2pKey(); err != nil {
				return fmt.Errorf("key delegation issuer is not a valid libp2p public key: %w", err)
			}

			if _, err := v.Delegate.Libp2pKey(); err != nil {
				return fmt.Errorf("key delegation delegate is not a valid libp2p public key: %w", err)
			}
		}

		iss, err := hypersql.LookupEnsure(conn, storage.LookupPublicKey, v.Issuer)
		if err != nil {
			return err
		}

		del, err := hypersql.LookupEnsure(conn, storage.LookupPublicKey, v.Delegate)
		if err != nil {
			return err
		}

		// We know issuer is an account when delegation purpose is registration.
		accEntity := EntityID("hm://a/" + v.Issuer.String())
		if _, err := hypersql.LookupEnsure(conn, storage.LookupResource, accEntity); err != nil {
			return err
		}

		if err := hypersql.BlobAttrsInsert(conn, id, "kd/issuer", "", true, iss, nil, 0); err != nil {
			return err
		}

		if err := hypersql.BlobAttrsInsert(conn, id, "kd/delegate", "", true, del, nil, 0); err != nil {
			return err
		}
	case Change:
		// TODO(burdiyan): ensure there's only one change that brings an entity into life.

		iss, err := hypersql.KeyDelegationsGetIssuer(conn, v.Delegation.Hash())
		if err != nil {
			return err
		}
		if iss.KeyDelegationsIssuer == 0 {
			// Try to get the issuer from the actual blob. This can happen when we are reindexing all the blobs,
			// and we happen to index a change before the key delegation.

			blk, err := bs.bs.get(conn, v.Delegation)
			if err != nil {
				return err
			}

			var del KeyDelegation
			if err := cbornode.DecodeInto(blk.RawData(), &del); err != nil {
				return fmt.Errorf("failed to decode key delegation when indexing change %s: %w", c, err)
			}

			iss.KeyDelegationsIssuer, err = bs.ensurePublicKey(conn, del.Issuer)
			if err != nil {
				return err
			}

			if iss.KeyDelegationsIssuer == 0 {
				return fmt.Errorf("missing key delegation info %s of change %s", v.Delegation, c)
			}
		}

		// TODO(burdiyan): remove this when all the tests are fixed. Sometimes CBOR codec decodes into
		// different types than what was encoded, and we might not have accounted for that during indexing.
		// So we re-encode the patch here to make sure.
		// This is of course very wasteful.
		{
			data, err := cbornode.DumpObject(v.Patch)
			if err != nil {
				return err
			}
			v.Patch = nil

			if err := cbornode.DecodeInto(data, &v.Patch); err != nil {
				return err
			}
		}

		isspk, err := hypersql.PublicKeysLookupPrincipal(conn, iss.KeyDelegationsIssuer)
		if err != nil {
			return err
		}

		// ensure entity
		eid, err := bs.ensureEntity(conn, v.Entity)
		if err != nil {
			return err
		}

		if err := hypersql.BlobAttrsInsert(conn, id, "resource/id", "", true, eid, nil, v.HLCTime.Pack()); err != nil {
			return err
		}

		for _, dep := range v.Deps {
			res, err := hypersql.BlobsGetSize(conn, dep.Hash())
			if err != nil {
				return err
			}
			if res.BlobsSize < 0 || res.BlobsID == 0 {
				return fmt.Errorf("missing causal dependency %s of change %s", dep, c)
			}

			if err := hypersql.BlobLinksInsertOrIgnore(conn, id, "change/dep", res.BlobsID); err != nil {
				return fmt.Errorf("failed to link dependency %s of change %s: %w", dep, c, err)
			}
		}

		if err := hypersql.ChangesInsertOrIgnore(conn, id, eid, v.HLCTime.Pack(), iss.KeyDelegationsIssuer); err != nil {
			return err
		}

		if v.Entity.HasPrefix("hm://d/") {
			return bs.indexDocumentChange(conn, id, isspk.PublicKeysPrincipal, c, v)
		}

		if v.Entity.HasPrefix("hm://g/") {
			return bs.indexGroupChange(conn, id, isspk.PublicKeysPrincipal, c, v)
		}
	}

	return nil
}

func (bs *indexer) ensureEntity(conn *sqlite.Conn, eid EntityID) (int64, error) {
	look, err := hypersql.EntitiesLookupID(conn, string(eid))
	if err != nil {
		return 0, err
	}
	if look.EntitiesID != 0 {
		return look.EntitiesID, nil
	}

	ins, err := hypersql.EntitiesInsertOrIgnore(conn, string(eid))
	if err != nil {
		return 0, err
	}
	if ins.EntitiesID == 0 {
		return 0, fmt.Errorf("failed to insert entity for some reason")
	}

	return ins.EntitiesID, nil
}

func (bs *indexer) ensurePublicKey(conn *sqlite.Conn, key core.Principal) (int64, error) {
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

func (bs *indexer) indexGroupChange(conn *sqlite.Conn, blobID int64, author core.Principal, c cid.Cid, ch Change) error {
	hlc := ch.HLCTime.Pack()

	// Validate group change.
	{
		if ch.Patch == nil {
			return fmt.Errorf("group change must have a patch")
		}

		pkdb, err := hypersql.LookupEnsure(conn, storage.LookupPublicKey, author)
		if err != nil {
			return err
		}

		edb, err := hypersql.LookupEnsure(conn, storage.LookupResource, ch.Entity)
		if err != nil {
			return err
		}

		switch ch.Action {
		case "Create":
			if len(ch.Deps) != 0 {
				return fmt.Errorf("group change with Create action must have no deps, got = %d", len(ch.Deps))
			}

			nonce, ok := ch.Patch["nonce"].([]byte)
			if !ok {
				return fmt.Errorf("change that creates a group must have a nonce to verify the ID")
			}

			ct, ok := ch.Patch["createTime"].(int)
			if !ok {
				return fmt.Errorf("change that creates a group must have a createTime field in its patch")
			}

			ownerField, ok := ch.Patch["owner"].([]byte)
			if !ok {
				return fmt.Errorf("change that creates a group must have an owner field in its patch")
			}

			if !bytes.Equal(ownerField, author) {
				return fmt.Errorf("owner field in the create change must correspond with the author of the change")
			}

			id, _ := NewUnforgeableID("hm://g/", ownerField, nonce, int64(ct))
			if ch.Entity != EntityID(id) {
				return fmt.Errorf("failed to verify group ID %s with a nonce", ch.Entity)
			}

			if err := hypersql.BlobAttrsInsert(conn, blobID, "resource/owner", "", true, pkdb, nil, hlc); err != nil {
				return err
			}
			if err := hypersql.BlobAttrsInsert(conn, blobID, "resource/create-time", "", false, ct, nil, 0); err != nil {
				return err
			}

			// Convenience attribute to include owner as a member.
			if err := hypersql.BlobAttrsInsert(conn, blobID, "group/member", "", true, pkdb, int(groups.Role_OWNER), hlc); err != nil {
				return err
			}
		case "Update":
			if len(ch.Deps) == 0 {
				return fmt.Errorf("group change with Update action must have at least one dep")
			}

			if ch.Patch["nonce"] != nil {
				return fmt.Errorf("update change must not have nonce set")
			}

			if ch.Patch["owner"] != nil {
				return fmt.Errorf("update change must not have owner field")
			}

			if ch.Patch["createTime"] != nil {
				return fmt.Errorf("update change must not have createTime field")
			}

			owner, err := hypersql.ResourceGetOwner(conn, edb)
			if err != nil {
				return err
			}

			isOwner := owner == pkdb

			// We only care about role if we're not an owner.
			var role int64
			if !isOwner {
				role, err = hypersql.GroupGetRole(conn, edb, owner, pkdb)
				if err != nil {
					return err
				}
			}

			if !isOwner && role == 0 {
				return fmt.Errorf("group change author is not allowed to edit the group")
			}

			if ch.Patch["members"] != nil && !isOwner {
				return fmt.Errorf("group members can only be updated by an owner")
			}
		default:
			return fmt.Errorf("unknown group action %q", ch.Action)
		}
	}

	title, ok := ch.Patch["title"].(string)
	if ok {
		if err := hypersql.BlobAttrsInsert(conn, blobID, "resource/title", "", false, title, nil, hlc); err != nil {
			return err
		}
	}

	desc, ok := ch.Patch["description"].(string)
	if ok {
		if err := hypersql.BlobAttrsInsert(conn, blobID, "resource/description", "", false, desc, nil, hlc); err != nil {
			return err
		}
	}

	content, ok := ch.Patch["content"].(map[string]any)
	if ok {
		for path, v := range content {
			rawURL, ok := v.(string)
			if !ok {
				bs.log.Warn("Group content value is not string", zap.Any("value", v), zap.String("path", path))
				continue
			}

			if err := bs.indexURL(conn, blobID, "group/content", path, rawURL, hlc); err != nil {
				return err
			}
		}
	}

	members, ok := ch.Patch["members"].(map[string]any)
	if ok {
		for k, v := range members {
			acc, err := core.DecodePrincipal(k)
			if err != nil {
				return fmt.Errorf("failed to parse group member as principal: %w", err)
			}

			role, ok := v.(int)
			if !ok {
				return fmt.Errorf("member must have valid role")
			}

			if role == int(groups.Role_OWNER) {
				return fmt.Errorf("owner role can't be used in updates")
			}

			accid, err := bs.ensurePublicKey(conn, acc)
			if err != nil {
				return err
			}

			if err := hypersql.BlobAttrsInsert(conn, blobID, "group/member", "", true, accid, role, hlc); err != nil {
				return err
			}
		}
	}

	return nil
}

func (bs *indexer) indexDocumentChange(conn *sqlite.Conn, blobID int64, author core.Principal, c cid.Cid, ch Change) error {
	hlc := ch.HLCTime.Pack()

	// Validate document change.
	{
		if ch.Patch == nil {
			return fmt.Errorf("document change must have a patch")
		}

		pkdb, err := hypersql.LookupEnsure(conn, storage.LookupPublicKey, author)
		if err != nil {
			return err
		}

		switch ch.Action {
		case "Create":
			if len(ch.Deps) != 0 {
				return fmt.Errorf("document change with Create action must have no deps, got = %d", len(ch.Deps))
			}

			nonce, ok := ch.Patch["nonce"].([]byte)
			if !ok {
				return fmt.Errorf("change that creates a document must have a nonce to verify the ID")
			}

			ct, ok := ch.Patch["createTime"].(int)
			if !ok {
				return fmt.Errorf("change that creates a document must have a createTime field in its patch")
			}

			ownerField, ok := ch.Patch["owner"].([]byte)
			if !ok {
				return fmt.Errorf("change that creates a document must have an owner field in its patch")
			}

			if !bytes.Equal(ownerField, author) {
				return fmt.Errorf("owner field in the create change must correspond with the author of the change")
			}

			id, _ := NewUnforgeableID("hm://d/", ownerField, nonce, int64(ct))
			if ch.Entity != EntityID(id) {
				return fmt.Errorf("failed to verify document ID %s with a nonce", ch.Entity)
			}

			if err := hypersql.BlobAttrsInsert(conn, blobID, "resource/owner", "", true, pkdb, nil, hlc); err != nil {
				return err
			}
			if err := hypersql.BlobAttrsInsert(conn, blobID, "resource/create-time", "", false, ct, nil, 0); err != nil {
				return err
			}
		case "Update":
			if len(ch.Deps) == 0 {
				return fmt.Errorf("group change with Update action must have at least one dep")
			}

			if ch.Patch["nonce"] != nil {
				return fmt.Errorf("update change must not have nonce set")
			}

			if ch.Patch["owner"] != nil {
				return fmt.Errorf("update change must not have owner field")
			}

			if ch.Patch["createTime"] != nil {
				return fmt.Errorf("update change must not have createTime field")
			}
		default:
			return fmt.Errorf("unknown document change action %q", ch.Action)
		}
	}

	blocks, ok := ch.Patch["blocks"].(map[string]any)
	if !ok {
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

		if err := bs.indexURL(conn, blobID, "href/"+blk.Type, blk.Id, blk.Ref, hlc); err != nil {
			return err
		}

		for _, ann := range blk.Annotations {
			if err := bs.indexURL(conn, blobID, "href/"+ann.Type, blk.Id, ann.Ref, hlc); err != nil {
				return err
			}

			// Legacy behavior. We only care about annotations with URL attribute.
			if err := bs.indexURL(conn, blobID, "href/"+ann.Type, blk.Id, ann.Attributes["url"], hlc); err != nil {
				return err
			}
		}
	}

	return nil
}

type LinkData struct {
	TargetFragment string `json:"f,omitempty"`
	TargetVersion  string `json:"v,omitempty"`
}

func (bs *indexer) indexURL(conn *sqlite.Conn, blobID int64, key, anchor, rawURL string, ts int64) error {
	if rawURL == "" {
		return nil
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		bs.log.Warn("FailedToParseURL", zap.String("url", rawURL), zap.Error(err))
		return nil
	}

	switch u.Scheme {
	case "hm":
		ld := LinkData{
			TargetFragment: u.Fragment,
			TargetVersion:  u.Query().Get("v"),
		}

		target := EntityID("hm://" + u.Host + u.Path)

		targetID, err := bs.ensureEntity(conn, target)
		if err != nil {
			return err
		}

		ldjson, err := json.Marshal(ld)
		if err != nil {
			return fmt.Errorf("failed to encode link data: %w", err)
		}

		if err := hypersql.BlobAttrsInsert(conn,
			blobID,
			key,
			anchor,
			true,
			targetID,
			ldjson,
			ts,
		); err != nil {
			return err
		}

		vblobs, err := Version(ld.TargetVersion).Parse()
		if err != nil {
			return err
		}

		for _, vcid := range vblobs {
			codec, hash := ipfs.DecodeCID(vcid)

			res, err := hypersql.BlobsGetSize(conn, hash)
			if err != nil {
				return err
			}
			if res.BlobsID == 0 {
				r, err := hypersql.BlobsInsert(conn, 0, hash, int64(codec), nil, -1)
				if err != nil {
					return err
				}
				res.BlobsID = r.BlobsID
			}
			if err := hypersql.BlobLinksInsertOrIgnore(conn, blobID, key, res.BlobsID); err != nil {
				return err
			}
		}
	case "ipfs":
		// TODO: parse ipfs links
	}

	return nil
}
