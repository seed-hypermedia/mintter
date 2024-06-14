package hyper

import (
	"encoding/json"
	"fmt"
	"seed/backend/core"
	"seed/backend/hyper/hypersql"
	"seed/backend/ipfs"
	"seed/backend/pkg/maybe"
	"time"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
)

// IRI is an identifier of a Hypermedia resource.
//
// [iri]: https://en.wikipedia.org/wiki/Internationalized_Resource_Identifier
type IRI string

func (i IRI) String() string {
	return string(i)
}

type structuralBlob struct {
	ID       cid.Cid
	Type     string
	Author   core.Principal
	Time     time.Time
	Resource struct {
		ID         IRI
		Owner      core.Principal
		CreateTime time.Time
	}
	BlobLinks     []blobLink
	ResourceLinks []resourceLink
	Meta          string
}

func newStructuralBlob(id cid.Cid, blobType string, author core.Principal, ts time.Time, resource IRI, resourceOwner core.Principal, resourceTimestamp time.Time) structuralBlob {
	sb := structuralBlob{
		ID:     id,
		Type:   blobType,
		Author: author,
		Time:   ts,
	}
	sb.Resource.ID = resource
	sb.Resource.Owner = resourceOwner
	sb.Resource.CreateTime = resourceTimestamp

	return sb
}

func newSimpleStructuralBlob(id cid.Cid, blobType string) structuralBlob {
	return structuralBlob{ID: id, Type: blobType}
}

func (sb *structuralBlob) AddBlobLink(linkType string, target cid.Cid) {
	sb.BlobLinks = append(sb.BlobLinks, blobLink{Type: linkType, Target: target})
}

func (sb *structuralBlob) AddResourceLink(linkType string, target IRI, isPinned bool, meta any) {
	sb.ResourceLinks = append(sb.ResourceLinks, resourceLink{Type: linkType, Target: target, IsPinned: isPinned, Meta: meta})
}

type blobLink struct {
	Type   string
	Target cid.Cid
}

type resourceLink struct {
	Type     string
	Target   IRI
	IsPinned bool
	Meta     any
}

type indexingCtx struct {
	conn *sqlite.Conn

	// Lookup tables for internal database IDs.
	pubKeys   map[string]int64
	resources map[IRI]int64
	blobs     map[cid.Cid]int64
}

func newCtx(conn *sqlite.Conn) *indexingCtx {
	return &indexingCtx{
		conn: conn,
		// Setting arbitrary size for maps, to avoid dynamic resizing in most cases.
		pubKeys:   make(map[string]int64, 16),
		resources: make(map[IRI]int64, 16),
		blobs:     make(map[cid.Cid]int64, 16),
	}
}

func (idx *indexingCtx) SaveBlob(id int64, b structuralBlob) error {
	var (
		blobAuthor   maybe.Value[int64]
		blobResource maybe.Value[int64]
		blobTime     maybe.Value[int64]
		title        maybe.Value[string]
	)

	if b.Author != nil {
		_, kid, err := idx.ensureAccount(b.Author)
		if err != nil {
			return err
		}
		blobAuthor = maybe.New(kid)
	}

	if b.Resource.ID != "" {
		rid, err := idx.ensureResource(b.Resource.ID)
		if err != nil {
			return err
		}
		blobResource = maybe.New(rid)

		if err := idx.ensureResourceMetadata(b.Resource.ID, b.Resource.Owner, b.Resource.CreateTime); err != nil {
			return err
		}
	}

	if b.Resource.ID != "" {
		rid, err := idx.ensureResource(b.Resource.ID)
		if err != nil {
			return err
		}
		blobResource = maybe.New(rid)

		if err := idx.ensureResourceMetadata(b.Resource.ID, b.Resource.Owner, b.Resource.CreateTime); err != nil {
			return err
		}
	}

	if b.Meta != "" {
		title = maybe.New(b.Meta)
	}

	if !b.Time.IsZero() {
		// For changes we need microsecond timestamp, so we use it for all the blobs.
		blobTime = maybe.New(b.Time.UnixMicro())
	}

	if err := hypersql.StructuralBlobsInsert(idx.conn, id, b.Type, blobAuthor, blobResource, blobTime, title); err != nil {
		return err
	}

	for _, link := range b.BlobLinks {
		tgt, err := idx.ensureBlob(link.Target)
		if err != nil {
			return fmt.Errorf("failed to ensure link target blob %s: %w", link.Target, err)
		}
		if err := hypersql.BlobLinksInsertOrIgnore(idx.conn, id, link.Type, tgt); err != nil {
			return fmt.Errorf("failed to insert blob link: %w", err)
		}
	}

	for _, link := range b.ResourceLinks {
		tgt, err := idx.ensureResource(link.Target)
		if err != nil {
			return fmt.Errorf("failed to ensure resource %s: %w", link.Target, err)
		}

		meta, err := json.Marshal(link.Meta)
		if err != nil {
			return fmt.Errorf("failed to encode resource link metadata as json: %w", err)
		}

		if err := hypersql.ResourceLinksInsert(idx.conn, id, tgt, link.Type, link.IsPinned, meta); err != nil {
			return fmt.Errorf("failed to insert resource link: %w", err)
		}
	}

	return nil
}

func (idx *indexingCtx) AssertBlobData(c cid.Cid) (err error) {
	delid, err := hypersql.BlobsGetSize(idx.conn, c.Hash())
	if err != nil {
		return err
	}
	if delid.BlobsID == 0 {
		return fmt.Errorf("blob %q not found", c)
	}

	if delid.BlobsSize < 0 {
		return fmt.Errorf("blob %q is known, but has no data", c)
	}

	return nil
}

func (idx *indexingCtx) ensureAccount(key core.Principal) (aid, kid int64, err error) {
	kid, err = idx.ensurePubKey(key)
	if err != nil {
		return 0, 0, err
	}

	accountResource := IRI("hm://a/" + key.String())

	aid, err = idx.ensureResource(accountResource)
	if err != nil {
		return 0, 0, err
	}

	if err := idx.ensureResourceMetadata(accountResource, key, time.Time{}); err != nil {
		return 0, 0, err
	}

	return aid, kid, nil
}

func (idx *indexingCtx) ensurePubKey(key core.Principal) (int64, error) {
	if id, ok := idx.pubKeys[key.UnsafeString()]; ok {
		return id, nil
	}

	res, err := hypersql.PublicKeysLookupID(idx.conn, key)
	if err != nil {
		return 0, err
	}

	var id int64
	if res.PublicKeysID > 0 {
		id = res.PublicKeysID
	} else {
		ins, err := hypersql.PublicKeysInsert(idx.conn, key)
		if err != nil {
			return 0, err
		}

		if ins.PublicKeysID <= 0 {
			panic("BUG: failed to insert key for some reason")
		}

		id = ins.PublicKeysID
	}

	idx.pubKeys[key.UnsafeString()] = id
	return id, nil
}

func (idx *indexingCtx) ensureBlob(c cid.Cid) (int64, error) {
	if id, ok := idx.blobs[c]; ok {
		return id, nil
	}

	codec, hash := ipfs.DecodeCID(c)

	size, err := hypersql.BlobsGetSize(idx.conn, hash)
	if err != nil {
		return 0, err
	}

	var id int64
	if size.BlobsID != 0 {
		id = size.BlobsID
	} else {
		ins, err := hypersql.BlobsInsert(idx.conn, 0, hash, int64(codec), nil, -1)
		if err != nil {
			return 0, err
		}
		if ins.BlobsID == 0 {
			return 0, fmt.Errorf("failed to ensure blob %s after insert", c)
		}
		id = ins.BlobsID
	}

	idx.blobs[c] = id
	return id, nil
}

func (idx *indexingCtx) ensureResource(r IRI) (int64, error) {
	if id, ok := idx.resources[r]; ok {
		return id, nil
	}

	res, err := hypersql.EntitiesLookupID(idx.conn, string(r))
	if err != nil {
		return 0, err
	}

	var id int64
	if res.ResourcesID > 0 {
		id = res.ResourcesID
	} else {
		ins, err := hypersql.EntitiesInsertOrIgnore(idx.conn, string(r))
		if err != nil {
			return 0, err
		}

		if ins.EntitiesID <= 0 {
			panic("BUG: failed to insert resource for some reason")
		}

		id = ins.EntitiesID
	}

	idx.resources[r] = id
	return id, nil
}

func (idx *indexingCtx) ensureResourceMetadata(r IRI, owner core.Principal, createTime time.Time) error {
	id, err := idx.ensureResource(r)
	if err != nil {
		return err
	}

	if owner != nil {
		oid, err := idx.ensurePubKey(owner)
		if err != nil {
			return err
		}

		if _, err := hypersql.ResourcesMaybeSetOwner(idx.conn, id, oid); err != nil {
			return err
		}
	}

	if !createTime.IsZero() {
		// We don't need microsecond precision for create time in resources. It's mostly here for convenience anyway.
		if _, err := hypersql.ResourcesMaybeSetTimestamp(idx.conn, id, createTime.Unix()); err != nil {
			return err
		}
	}

	return nil
}
