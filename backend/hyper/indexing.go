package hyper

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"seed/backend/core"
	"seed/backend/daemon/storage"
	documents "seed/backend/genproto/documents/v1alpha"
	groups "seed/backend/genproto/groups/v1alpha"
	"seed/backend/hyper/hypersql"
	"strings"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	dagpb "github.com/ipld/go-codec-dagpb"
	"github.com/ipld/go-ipld-prime"
	cidlink "github.com/ipld/go-ipld-prime/linking/cid"
	"github.com/ipld/go-ipld-prime/traversal"
	"github.com/multiformats/go-multicodec"
	"go.uber.org/zap"
	"golang.org/x/exp/slices"
	"google.golang.org/protobuf/encoding/protojson"
)

const idPrefixLen = len("hm://x/") // common prefix length for all the Entities with unforgeable IDs.

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
	bs.log.Info("ReindexingStarted")
	defer func() {
		bs.log.Info("ReindexingFinished", zap.Error(err), zap.Duration("duration", time.Since(start)))
	}()

	// Order is important to ensure foreign key constraints are not violated.
	derivedTables := []string{
		storage.T_BlobLinks,
		storage.T_ResourceLinks,
		storage.T_StructuralBlobs,
		storage.T_GroupSites,
		storage.T_KeyDelegations,
		// Not deleting from resources yet, because they are referenced in the drafts table,
		// and we can't yet reconstruct the drafts table purely from the blobs.
		// storage.T_Resources,
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

			if !isIndexable(multicodec.Code(codec)) {
				return nil
			}

			id := stmt.ColumnInt64(stmt.ColumnIndex(storage.BlobsID.ShortName()))
			hash := stmt.ColumnBytes(stmt.ColumnIndex(storage.BlobsMultihash.ShortName()))
			size := stmt.ColumnInt(stmt.ColumnIndex(storage.BlobsSize.ShortName()))
			data := stmt.ColumnBytesUnsafe(stmt.ColumnIndex(storage.BlobsData.ShortName()))
			// We have to skip blobs we know the hashes of but we don't have the data.
			// Also the blobs that are inline (data stored in the hash itself) because we don't index them ever.
			// TODO(burdiyan): filter the select query to avoid fetching these blobs in the first place.
			if size <= 0 {
				return nil
			}

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
	idx := newCtx(conn)

	switch v := blobData.(type) {
	case ipld.Node:
		return bs.indexDagPB(idx, id, c, v)
	case KeyDelegation:
		return bs.indexKeyDelegation(idx, id, c, v)
	case Change:
		return bs.indexChange(idx, id, c, v)
	case Comment:
		return bs.indexComment(idx, id, c, v)
	}

	return nil
}

func (bs *indexer) indexDagPB(idx *indexingCtx, id int64, c cid.Cid, v ipld.Node) error {
	sb := newSimpleStructuralBlob(c, string(TypeDagPB))

	if err := traversal.WalkLocal(v, func(prog traversal.Progress, n ipld.Node) error {
		pblink, ok := n.(dagpb.PBLink)
		if !ok {
			return nil
		}

		target, ok := pblink.Hash.Link().(cidlink.Link)
		if !ok {
			return fmt.Errorf("link is not CID: %v", pblink.Hash)
		}

		linkType := "dagpb/chunk"
		if pblink.Name.Exists() {
			if name := pblink.Name.Must().String(); name != "" {
				linkType = "dagpb/" + name
			}
		}

		sb.AddBlobLink(linkType, target.Cid)
		return nil
	}); err != nil {
		return err
	}

	return idx.SaveBlob(id, sb)
}

func (bs *indexer) indexKeyDelegation(idx *indexingCtx, id int64, c cid.Cid, v KeyDelegation) error {
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

	issuerProfile := IRI("hm://a/" + v.Issuer.String())

	sb := newStructuralBlob(c, string(TypeKeyDelegation), v.Issuer, v.IssueTime, issuerProfile, v.Issuer, time.Time{})

	sb.AddResourceLink("kd/issuer", issuerProfile, false, nil)

	iss, err := idx.ensurePubKey(v.Issuer)
	if err != nil {
		return err
	}

	del, err := idx.ensurePubKey(v.Delegate)
	if err != nil {
		return err
	}

	if err := hypersql.KeyDelegationsInsertOrIgnore(idx.conn, id, iss, del); err != nil {
		return err
	}

	return idx.SaveBlob(id, sb)
}

func (bs *indexer) indexChange(idx *indexingCtx, id int64, c cid.Cid, v Change) error {
	// TODO(burdiyan): ensure there's only one change that brings an entity into life.

	// Extracting author from the associated key delegation.
	// TODO(burdiyan): need to improve this part, because it's kinda ugly.
	// TODO(burdiyan): must verify the key delegation to make sure device really belongs to the account.
	author, err := bs.getAuthorFromDelegation(idx, v.Delegation)
	if err != nil {
		return err
	}

	// Validate semantic meaning of Create/Update changes.
	{
		isHMEntity := v.Entity.HasPrefix("hm://")
		isAccountChange := v.Entity.HasPrefix("hm://a/")
		switch {
		// We want to ensure all changes to have action, but historically
		// we've been creating Account-related changes without one, so we continue to allow that.
		case isHMEntity && v.Action == "" && !isAccountChange:
			return fmt.Errorf("non-account change %s must have an action specified", c)

		// Changes with create action must have correct unforgeable ID and fields in their patch to validate it.
		case isHMEntity && v.Action == ActionCreate:
			nonce, ok := v.Patch["nonce"].([]byte)
			if !ok {
				return fmt.Errorf("change that creates an entity must have a nonce to verify the ID")
			}

			ct, ok := v.Patch["createTime"].(int)
			if !ok {
				return fmt.Errorf("change that creates an entity must have a createTime field in its patch")
			}

			ownerField, ok := v.Patch["owner"].([]byte)
			if !ok {
				return fmt.Errorf("change that creates an entity must have an owner field in its patch")
			}

			if !bytes.Equal(ownerField, author) {
				return fmt.Errorf("owner field in the create change must correspond with the author of the change")
			}

			if err := verifyUnforgeableID(v.Entity, idPrefixLen, ownerField, nonce, int64(ct)); err != nil {
				return err
			}

		// Changes that are updates must not have any fields for verifying unforgeable IDs,
		// and they must have at least one dep.
		case isHMEntity && v.Action == ActionUpdate:
			if len(v.Deps) == 0 {
				return fmt.Errorf("change with Update action must have at least one dep")
			}

			if v.Patch["nonce"] != nil {
				return fmt.Errorf("update change must not have nonce set")
			}

			if v.Patch["owner"] != nil {
				return fmt.Errorf("update change must not have owner field")
			}

			if v.Patch["createTime"] != nil {
				return fmt.Errorf("update change must not have createTime field")
			}
		}
	}

	var sb structuralBlob
	{
		var resourceTime time.Time
		if v.Action == ActionCreate {
			resourceTime = v.HLCTime.Time()
		}
		sb = newStructuralBlob(c, string(TypeChange), author, v.HLCTime.Time(), IRI(v.Entity), author, resourceTime)
	}

	// TODO(burdiyan): ensure deps are indexed, not just known.
	// Although in practice deps must always be indexed first, but need to make sure.
	for _, dep := range v.Deps {
		if err := idx.AssertBlobData(dep); err != nil {
			return fmt.Errorf("missing causal dependency %s of change %s", dep, c)
		}

		sb.AddBlobLink("change/dep", dep)
	}

	sb.AddBlobLink("change/auth", v.Delegation)

	// TODO(burdiyan): remove this when all the tests are fixed. Sometimes CBOR codec decodes into
	// different types than what was encoded, and we might not have accounted for that during indexing.
	// So we re-encode the patch here to make sure.
	// This is of course very wasteful.
	// EDIT: actually re-encoding is probably not a bad idea to enforce the canonical encoding, and hash correctness.
	// But it would probably need to happen in some other layer, and more generalized.
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

	// Indexing specific to various types of Entities
	switch {
	case v.Entity.HasPrefix("hm://a/"):
		res, err := hypersql.EntitiesLookupRemovedRecord(idx.conn, sb.Resource.ID.String())
		if err == nil && res.DeletedResourcesIRI == sb.Resource.ID.String() {
			return fmt.Errorf("Change belongs to a deleted account [%s]", res.DeletedResourcesIRI)
		}
		if v, ok := v.Patch["avatar"].(cid.Cid); ok {
			sb.AddBlobLink("account/avatar", v)
		}

		if alias, ok := v.Patch["alias"].(string); ok {
			sb.Meta = alias
		}

		if doc, ok := v.Patch["rootDocument"].(string); ok {
			sb.AddResourceLink("account/root-document", IRI(doc), false, nil)
		}
	case v.Entity.HasPrefix("hm://d/"):
		title, ok := v.Patch["title"].(string)
		if ok {
			sb.Meta = title
		}
		blocks, ok := v.Patch["blocks"].(map[string]any)

		res, err := hypersql.EntitiesLookupRemovedRecord(idx.conn, sb.Resource.ID.String())
		if err == nil && res.DeletedResourcesIRI == sb.Resource.ID.String() {
			return fmt.Errorf("Change belongs to a deleted document [%s]", res.DeletedResourcesIRI)
		}

		if ok {
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
				if err := indexURL(&sb, bs.log, blk.Id, "doc/"+blk.Type, blk.Ref); err != nil {
					return err
				}

				for _, ann := range blk.Annotations {
					if err := indexURL(&sb, bs.log, blk.Id, "doc/"+ann.Type, ann.Ref); err != nil {
						return err
					}
				}
			}
		}

	case v.Entity.HasPrefix("hm://g/"):
		authorEntity := IRI("hm://a/" + author.String())
		title, ok := v.Patch["title"].(string)
		if ok {
			sb.Meta = title
		}
		var currentRole groups.Role
		res, err := hypersql.EntitiesLookupRemovedRecord(idx.conn, sb.Resource.ID.String())
		if err == nil && res.DeletedResourcesIRI == sb.Resource.ID.String() {
			return fmt.Errorf("Change belongs to a deleted group [%s]", res.DeletedResourcesIRI)
		}
		if v.Action == ActionCreate {
			currentRole = groups.Role_OWNER
			sb.AddResourceLink("group/member", authorEntity, false, GroupLinkMeta{Role: currentRole})
		} else {
			// Only owner or members are allowed to make updates.
			// TODO(burdiyan): need a better way to get resource owner.
			rid, err := idx.ensureResource(IRI(v.Entity))
			if err != nil {
				return err
			}

			authorID, err := idx.ensurePubKey(author)
			if err != nil {
				return err
			}

			owner, err := hypersql.ResourceGetOwner(idx.conn, rid)
			if err != nil {
				return err
			}

			if owner == authorID {
				currentRole = groups.Role_OWNER
			} else {
				role, err := hypersql.GetGroupRole(idx.conn, v.Entity.String(), authorEntity.String())
				if err != nil {
					return err
				}
				currentRole = groups.Role(role)
			}
		}

		if currentRole != groups.Role_OWNER && currentRole != groups.Role_EDITOR {
			return fmt.Errorf("only members can change groups: account %q is not a member of the group %q", author, v.Entity)
		}

		// Check if some of the owner-only fields are touched by non-owners
		if currentRole != groups.Role_OWNER {
			if v.Patch["siteURL"] != nil {
				return fmt.Errorf("only group owner can set siteURL")
			}

			if v.Patch["members"] != nil {
				return fmt.Errorf("only group owner can change members")
			}
		}

		// Validate site URL
		if siteURL, ok := v.Patch["siteURL"].(string); ok {
			u, err := url.Parse(siteURL)
			if err != nil {
				return fmt.Errorf("failed to parse site URL %s: %w", siteURL, err)
			}

			if u.Scheme != "http" && u.Scheme != "https" {
				return fmt.Errorf("site URL must have http or https scheme, got %s", siteURL)
			}

			if siteURL != (&url.URL{Scheme: u.Scheme, Host: u.Host}).String() {
				return fmt.Errorf("site URL must have only scheme and host, got %s", siteURL)
			}

			if err := hypersql.SitesInsertOrIgnore(idx.conn, v.Entity.String(), siteURL, int64(v.HLCTime), OriginFromCID(c)); err != nil {
				return err
			}
		}
		// Index content links.
		if content, ok := v.Patch["content"].(map[string]any); ok {
			for path, v := range content {
				rawURL, ok := v.(string)
				if !ok {
					bs.log.Warn("Group content value is not string", zap.Any("value", v), zap.String("path", path))
					continue
				}

				if err := indexURL(&sb, bs.log, path, "group/content", rawURL); err != nil {
					return err
				}
			}
		}

		// Index member links.
		if members, ok := v.Patch["members"].(map[string]any); ok {
			for k, v := range members {
				acc, err := core.DecodePrincipal(k)
				if err != nil {
					return fmt.Errorf("failed to parse group member as principal: %w", err)
				}

				role, ok := v.(int)
				if !ok {
					return fmt.Errorf("member must have valid role")
				}

				if role == int(groups.Role_ROLE_UNSPECIFIED) {
					return fmt.Errorf("member role must be specified")
				}

				if role == int(groups.Role_OWNER) {
					return fmt.Errorf("owner role can't be used in updates")
				}

				if _, _, err := idx.ensureAccount(acc); err != nil {
					return err
				}

				sb.AddResourceLink("group/member", IRI("hm://a/"+acc.String()), false, GroupLinkMeta{Role: groups.Role(role)})
			}
		}
	}

	return idx.SaveBlob(id, sb)
}

func (bs *indexer) indexComment(idx *indexingCtx, id int64, c cid.Cid, v Comment) error {
	if v.Target == "" {
		return fmt.Errorf("comment must have a target")
	}

	if !strings.HasPrefix(v.Target, "hm://") {
		return fmt.Errorf("comment target must be a hypermedia resource, got %s", v.Target)
	}
	iri := strings.Split(v.Target, "?v=")[0]
	res, err := hypersql.EntitiesLookupRemovedRecord(idx.conn, iri)
	if err == nil && res.DeletedResourcesIRI == iri {
		return fmt.Errorf("Comment references to a deleted entity [%s]", res.DeletedResourcesIRI)
	}

	isReply := v.RepliedComment.Defined() || v.ThreadRoot.Defined()

	if isReply {
		if !v.RepliedComment.Defined() || !v.ThreadRoot.Defined() {
			return fmt.Errorf("replies must have both repliedComment and threadRoot set")
		}

		blk, err := bs.bs.get(idx.conn, v.RepliedComment)
		if err != nil {
			return err
		}

		replied, err := DecodeBlob(blk.Cid(), blk.RawData())
		if err != nil {
			return fmt.Errorf("failed to decode replied comment %s: %w", v.RepliedComment, err)
		}

		rc, ok := replied.Decoded.(Comment)
		if !ok {
			return fmt.Errorf("replied comment is not a comment, got %T", replied.Decoded)
		}

		if v.HLCTime < rc.HLCTime {
			return fmt.Errorf("reply must have a higher timestamp than the replied comment: failed to assert %s > %s", v.HLCTime, rc.HLCTime)
		}

		repliedTarget, _, _ := strings.Cut(rc.Target, "?")
		newReplyTarget, _, _ := strings.Cut(v.Target, "?")

		if newReplyTarget != repliedTarget {
			return fmt.Errorf("reply target '%s' doesn't match replied comment's target '%s'", newReplyTarget, repliedTarget)
		}

		// Replies to replies must share the thread root.
		// Replies to top-level comments must have thread root equal to the top-level comment itself.
		if rc.ThreadRoot.Defined() {
			if !v.ThreadRoot.Equals(rc.ThreadRoot) {
				return fmt.Errorf("reply to reply thread roots don't match: '%s' != '%s'", v.ThreadRoot, rc.ThreadRoot)
			}
		} else {
			// TODO(burdiyan): this will not be true when we implement editing comments.
			if !v.ThreadRoot.Equals(v.RepliedComment) {
				return fmt.Errorf("reply to a top-level comment must have the same thread root as the replied comment: '%s' != '%s'", v.ThreadRoot, v.RepliedComment)
			}
		}
	}

	author, err := bs.getAuthorFromDelegation(idx, v.Delegation)
	if err != nil {
		return err
	}

	sb := newStructuralBlob(c, string(TypeComment), author, v.HLCTime.Time(), "", nil, time.Time{})

	if err := indexURL(&sb, bs.log, "", "comment/target", v.Target); err != nil {
		return err
	}

	if v.ThreadRoot.Defined() {
		sb.AddBlobLink("comment/thread-root", v.ThreadRoot)
	}

	if v.RepliedComment.Defined() {
		sb.AddBlobLink("comment/reply-to", v.RepliedComment)
	}

	sb.AddBlobLink("comment/auth", v.Delegation)

	var indexCommentContent func([]CommentBlock) error // workaround to allow recursive closure calls.
	indexCommentContent = func(in []CommentBlock) error {
		for _, blk := range in {
			if err := indexURL(&sb, bs.log, blk.ID, "comment/"+blk.Type, blk.Ref); err != nil {
				return err
			}

			for _, a := range blk.Annotations {
				if err := indexURL(&sb, bs.log, blk.ID, "comment/"+a.Type, a.Ref); err != nil {
					return err
				}
			}

			if err := indexCommentContent(blk.Children); err != nil {
				return err
			}
		}

		return nil
	}

	if err := indexCommentContent(v.Body); err != nil {
		return err
	}

	if err := idx.SaveBlob(id, sb); err != nil {
		return fmt.Errorf("failed to index comment: %w", err)
	}

	return nil
}

func (bs *indexer) getAuthorFromDelegation(idx *indexingCtx, delegation cid.Cid) (core.Principal, error) {
	// TODO(burdiyan): this is also quite stupid having to get it from the DB.
	iss, err := hypersql.KeyDelegationsGetIssuer(idx.conn, delegation.Hash())
	if err != nil {
		return nil, err
	}
	if iss.KeyDelegationsIssuer == 0 {
		// Try to get the issuer from the actual blob. This can happen when we are reindexing all the blobs,
		// and we happen to index a change before the key delegation.

		blk, err := bs.bs.get(idx.conn, delegation)
		if err != nil {
			return nil, err
		}

		var del KeyDelegation
		if err := cbornode.DecodeInto(blk.RawData(), &del); err != nil {
			return nil, fmt.Errorf("failed to decode key delegation %s: %w", delegation, err)
		}

		iss.KeyDelegationsIssuer, err = idx.ensurePubKey(del.Issuer)
		if err != nil {
			return nil, err
		}

		if iss.KeyDelegationsIssuer == 0 {
			return nil, fmt.Errorf("missing key delegation info %s", delegation)
		}
	}

	issuerDB, err := hypersql.PublicKeysLookupPrincipal(idx.conn, iss.KeyDelegationsIssuer)
	if err != nil {
		return nil, err
	}

	author, err := core.DecodePrincipal(issuerDB.PublicKeysPrincipal)
	if err != nil {
		return nil, err
	}

	if err := idx.AssertBlobData(delegation); err != nil {
		return nil, err
	}

	return author, nil
}

func indexURL(sb *structuralBlob, log *zap.Logger, anchor, linkType, rawURL string) error {
	if rawURL == "" {
		return nil
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		log.Warn("FailedToParseURL", zap.String("url", rawURL), zap.Error(err))
		return nil
	}

	switch {
	case u.Scheme == "hm" && u.Host != "c":
		uq := u.Query()

		linkMeta := DocLinkMeta{
			Anchor:         anchor,
			TargetFragment: u.Fragment,
			TargetVersion:  uq.Get("v"),
		}

		target := IRI("hm://" + u.Host + u.Path)

		isLatest := uq.Has("l") || linkMeta.TargetVersion == ""

		sb.AddResourceLink(linkType, target, !isLatest, linkMeta)

		vblobs, err := Version(linkMeta.TargetVersion).Parse()
		if err != nil {
			return err
		}

		for _, vcid := range vblobs {
			sb.AddBlobLink(linkType, vcid)
		}
	case u.Scheme == "hm" && u.Host == "c":
		c, err := cid.Decode(strings.TrimPrefix(u.Path, "/"))
		if err != nil {
			return fmt.Errorf("failed to parse comment CID %s: %w", rawURL, err)
		}

		sb.AddBlobLink(linkType, c)
	case u.Scheme == "ipfs":
		c, err := cid.Decode(u.Hostname())
		if err != nil {
			return fmt.Errorf("failed to parse IPFS URL %s: %w", rawURL, err)
		}

		sb.AddBlobLink(linkType, c)
	}

	return nil
}

// GroupLinkMeta is a metadata for a group link.
type GroupLinkMeta struct {
	Role groups.Role `json:"r"`
}

// DocLinkMeta is a metadata for a document link.
type DocLinkMeta struct {
	Anchor         string `json:"a,omitempty"`
	TargetFragment string `json:"f,omitempty"`
	TargetVersion  string `json:"v,omitempty"`
}

func isIndexable[T multicodec.Code | cid.Cid](v T) bool {
	var code multicodec.Code

	switch v := any(v).(type) {
	case multicodec.Code:
		code = v
	case cid.Cid:
		code = multicodec.Code(v.Prefix().Codec)
	}

	return code == multicodec.DagCbor || code == multicodec.DagPb
}
