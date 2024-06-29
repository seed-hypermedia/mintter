package index

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"seed/backend/core"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/hlc"
	"seed/backend/ipfs"
	"seed/backend/pkg/dqb"
	"seed/backend/pkg/maybe"
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
	"google.golang.org/protobuf/encoding/protojson"
)

var errNotHyperBlob = errors.New("not a hyper blob")

type IRI string

type Index struct {
	bs  *blockStore
	db  *sqlitex.Pool
	log *zap.Logger
}

func NewIndex(db *sqlitex.Pool, log *zap.Logger) *Index {
	return &Index{
		bs:  newBlockstore(db),
		db:  db,
		log: log,
	}
}

// indexBlob is an uber-function that knows about all types of blobs we want to index.
// This is probably a bad idea to put here, but for now it's easier to work with that way.
// TODO(burdiyan): eventually we might want to make this package agnostic to blob types.
func (idx *Index) indexBlob(conn *sqlite.Conn, id int64, c cid.Cid, blobData any) error {
	ictx := newCtx(conn)

	switch v := blobData.(type) {
	case ipld.Node:
		return idx.indexDagPB(ictx, id, c, v)
	case *Change:
		return idx.indexChange(ictx, id, c, v)
	case *Ref:
		return idx.indexRef(ictx, id, c, v)
	}

	return nil
}

func (idx *Index) indexDagPB(ictx *indexingCtx, id int64, c cid.Cid, v ipld.Node) error {
	sb := newSimpleStructuralBlob(c, string(BlobTypeDagPB))

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

	return ictx.SaveBlob(id, sb)
}

func (idx *Index) indexRef(ictx *indexingCtx, id int64, c cid.Cid, v *Ref) error {
	if !strings.HasPrefix(string(v.Resource), "hm://a") {
		return fmt.Errorf("refs are only implemented for profile docs, got %s", v.Resource)
	}

	// TODO(hm24): more validation and refs for docs.

	var sb StructuralBlob
	if v.Ts == ProfileGenesisEpoch {
		sb = newStructuralBlob(c, string(BlobTypeRef), v.Author, hlc.Timestamp(v.Ts).Time(), v.Resource, v.GenesisBlob, v.Author, hlc.Timestamp(v.Ts).Time())
	} else {
		sb = newStructuralBlob(c, string(BlobTypeRef), v.Author, hlc.Timestamp(v.Ts).Time(), v.Resource, v.GenesisBlob, nil, time.Time{})
	}

	if len(v.Heads) == 0 {
		return fmt.Errorf("ref blob must have heads")
	}

	for _, head := range v.Heads {
		sb.AddBlobLink("ref/head", head)
	}

	return ictx.SaveBlob(id, sb)
}

func (idx *Index) indexChange(ictx *indexingCtx, id int64, c cid.Cid, v *Change) error {
	// TODO(burdiyan): ensure there's only one change that brings an entity into life.

	author := v.Author

	var sb StructuralBlob
	{
		var resourceTime time.Time
		if v.Action == "Create" {
			resourceTime = hlc.Timestamp(v.Ts).Time()
		}
		sb = newStructuralBlob(c, string(BlobTypeChange), author, hlc.Timestamp(v.Ts).Time(), "", cid.Undef, author, resourceTime)
	}

	// TODO(burdiyan): ensure deps are indexed, not just known.
	// Although in practice deps must always be indexed first, but need to make sure.
	for _, dep := range v.Deps {
		if err := ictx.AssertBlobData(dep); err != nil {
			return fmt.Errorf("missing causal dependency %s of change %s", dep, c)
		}

		sb.AddBlobLink("change/dep", dep)
	}

	// TODO(burdiyan): remove this when all the tests are fixed. Sometimes CBOR codec decodes into
	// different types than what was encoded, and we might not have accounted for that during indexing.
	// So we re-encode the patch here to make sure.
	// This is of course very wasteful.
	// EDIT: actually re-encoding is probably not a bad idea to enforce the canonical encoding, and hash correctness.
	// But it would probably need to happen in some other layer, and more generalized.
	{
		data, err := cbornode.DumpObject(v.Payload)
		if err != nil {
			return err
		}
		v.Payload = nil

		if err := cbornode.DecodeInto(data, &v.Payload); err != nil {
			return err
		}
	}

	if v.Payload["metadata"] != nil {
		for k, v := range v.Payload["metadata"].(map[string]any) {
			vs, ok := v.(string)
			if !ok {
				continue
			}

			u, err := url.Parse(vs)
			if err != nil {
				continue
			}

			if u.Scheme != "ipfs" {
				continue
			}

			c, err := cid.Decode(u.Host)
			if err != nil {
				continue
			}

			sb.AddBlobLink("metadata/"+k, c)

			// TODO(hm24): index other relevant metadata for list response and so on.
		}
	}

	blocks, ok := v.Payload["blocks"].(map[string]any)
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
			if err := indexURL(&sb, idx.log, blk.Id, "doc/"+blk.Type, blk.Ref); err != nil {
				return err
			}

			for _, ann := range blk.Annotations {
				if err := indexURL(&sb, idx.log, blk.Id, "doc/"+ann.Type, ann.Ref); err != nil {
					return err
				}
			}
		}
	}

	return ictx.SaveBlob(id, sb)
}

func (idx *Index) WalkChanges(ctx context.Context, resource IRI, author core.Principal, fn func(cid.Cid, *Change) error) error {
	conn, release, err := idx.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	buf := make([]byte, 0, 1024*1024) // preallocating 1MB for decompression.
	if err := sqlitex.Exec(conn, qWalkChanges(), func(stmt *sqlite.Stmt) error {
		var (
			codec = stmt.ColumnInt64(0)
			hash  = stmt.ColumnBytesUnsafe(1)
			data  = stmt.ColumnBytesUnsafe(2)
		)

		buf, err = idx.bs.decoder.DecodeAll(data, buf)
		if err != nil {
			return err
		}

		chcid := cid.NewCidV1(uint64(codec), hash)
		ch := &Change{}
		if err := cbornode.DecodeInto(buf, ch); err != nil {
			return fmt.Errorf("WalkChanges: failed to decode change %s for entity %s: %w", chcid, resource, err)
		}

		if err := fn(chcid, ch); err != nil {
			return err
		}

		buf = buf[:0] // reset the slice reusing the backing array

		return nil
	}, resource, author); err != nil {
		return err
	}

	return nil
}

var qWalkChanges = dqb.Str(`
	WITH RECURSIVE
	changes (id) AS (
		SELECT bl.target
		FROM blob_links bl
		JOIN structural_blobs sb ON sb.id = bl.source
		WHERE sb.type = 'Ref'
		AND sb.resource = (SELECT id FROM resources WHERE iri = :resource)
		AND sb.author = (SELECT id FROM public_keys WHERE principal = :author)
		AND bl.type = 'ref/head'

		UNION

		SELECT bl.target
		FROM blob_links bl
		JOIN changes c ON c.id = bl.source
		WHERE bl.type = 'change/dep'
	)
	SELECT
		codec,
		multihash,
		data
	FROM blobs b
	JOIN structural_blobs sb ON sb.id = b.id
	JOIN changes c ON c.id = b.id
	ORDER BY sb.ts
`)

type BlobType string

type EncodedBlob[T any] struct {
	CID     cid.Cid
	Data    []byte
	Decoded T
}

func EncodeBlob[T any](v T) (eb EncodedBlob[T], err error) {
	data, err := cbornode.DumpObject(v)
	if err != nil {
		return eb, err
	}

	blk := ipfs.NewBlock(uint64(multicodec.DagCbor), data)

	return EncodedBlob[T]{CID: blk.Cid(), Data: blk.RawData(), Decoded: v}, nil
}

// RawData implements blocks.Block interface.
func (eb EncodedBlob[T]) RawData() []byte {
	return eb.Data
}

// Cid implements blocks.Block interface.
func (eb EncodedBlob[T]) Cid() cid.Cid {
	return eb.CID
}

// String implements blocks.Block interface.
func (eb EncodedBlob[T]) String() string {
	return fmt.Sprintf("[EncodedBlob %s]", eb.CID)
}

// Loggable implements blocks.Block interface.
func (eb EncodedBlob[T]) Loggable() map[string]interface{} {
	return map[string]interface{}{
		"cid": eb.CID,
	}
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

func (idx *indexingCtx) SaveBlob(id int64, b StructuralBlob) error {
	var (
		blobAuthor   maybe.Value[int64]
		blobResource maybe.Value[int64]
		blobTime     maybe.Value[int64]
		blobMeta     maybe.Value[[]byte]
	)

	if b.Author != nil {
		_, kid, err := idx.ensureAccount(b.Author)
		if err != nil {
			return err
		}
		blobAuthor = maybe.New(kid)
	}

	if b.GenesisBlob.Defined() {
		if _, err := idx.ensureBlob(b.GenesisBlob); err != nil {
			return err
		}
	}

	if b.Resource.ID != "" {
		rid, err := idx.ensureResource(b.Resource.ID)
		if err != nil {
			return err
		}
		blobResource = maybe.New(rid)

		if b.Resource.GenesisBlob.Defined() {
			if _, err := idx.ensureBlob(b.Resource.GenesisBlob); err != nil {
				return err
			}
		}

		if err := idx.ensureResourceMetadata(b.Resource.ID, b.Resource.GenesisBlob, b.Resource.Owner, b.Resource.CreateTime); err != nil {
			return err
		}
	}

	if b.Meta != nil {
		data, err := json.Marshal(b.Meta)
		if err != nil {
			return err
		}

		blobMeta = maybe.New(data)
	}

	if !b.Ts.IsZero() {
		// For changes we need microsecond timestamp, so we use it for all the blobs.
		blobTime = maybe.New(b.Ts.UnixMicro())
	}

	if err := dbStructuralBlobsInsert(idx.conn, id, b.Type, blobAuthor, blobResource, blobTime, blobMeta); err != nil {
		return err
	}

	for _, link := range b.BlobLinks {
		tgt, err := idx.ensureBlob(link.Target)
		if err != nil {
			return fmt.Errorf("failed to ensure link target blob %s: %w", link.Target, err)
		}
		if err := dbBlobLinksInsertOrIgnore(idx.conn, id, link.Type, tgt); err != nil {
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

		if err := dbResourceLinksInsert(idx.conn, id, tgt, link.Type, link.IsPinned, meta); err != nil {
			return fmt.Errorf("failed to insert resource link: %w", err)
		}
	}

	return nil
}

func (idx *indexingCtx) AssertBlobData(c cid.Cid) (err error) {
	delid, err := dbBlobsGetSize(idx.conn, c.Hash())
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

	if err := idx.ensureResourceMetadata(accountResource, cid.Undef, key, time.Time{}); err != nil {
		return 0, 0, err
	}

	return aid, kid, nil
}

func (idx *indexingCtx) ensurePubKey(key core.Principal) (int64, error) {
	if id, ok := idx.pubKeys[key.UnsafeString()]; ok {
		return id, nil
	}

	res, err := dbPublicKeysLookupID(idx.conn, key)
	if err != nil {
		return 0, err
	}

	var id int64
	if res > 0 {
		id = res
	} else {
		ins, err := dbPublicKeysInsert(idx.conn, key)
		if err != nil {
			return 0, err
		}

		if ins <= 0 {
			panic("BUG: failed to insert key for some reason")
		}

		id = ins
	}

	idx.pubKeys[key.UnsafeString()] = id
	return id, nil
}

func (idx *indexingCtx) ensureBlob(c cid.Cid) (int64, error) {
	if id, ok := idx.blobs[c]; ok {
		return id, nil
	}

	codec, hash := ipfs.DecodeCID(c)

	size, err := dbBlobsGetSize(idx.conn, hash)
	if err != nil {
		return 0, err
	}

	var id int64
	if size.BlobsID != 0 {
		id = size.BlobsID
	} else {
		ins, err := dbBlobsInsert(idx.conn, 0, hash, int64(codec), nil, -1)
		if err != nil {
			return 0, err
		}
		if ins == 0 {
			return 0, fmt.Errorf("failed to ensure blob %s after insert", c)
		}
		id = ins
	}

	idx.blobs[c] = id
	return id, nil
}

func (idx *indexingCtx) ensureResource(r IRI) (int64, error) {
	if id, ok := idx.resources[r]; ok {
		return id, nil
	}

	res, err := dbEntitiesLookupID(idx.conn, string(r))
	if err != nil {
		return 0, err
	}

	var id int64
	if res.ResourcesID > 0 {
		id = res.ResourcesID
	} else {
		ins, err := dbEntitiesInsertOrIgnore(idx.conn, string(r))
		if err != nil {
			return 0, err
		}

		if ins <= 0 {
			panic("BUG: failed to insert resource for some reason")
		}

		id = ins
	}

	idx.resources[r] = id
	return id, nil
}

func (idx *indexingCtx) ensureResourceMetadata(r IRI, genesis cid.Cid, owner core.Principal, createTime time.Time) error {
	id, err := idx.ensureResource(r)
	if err != nil {
		return err
	}

	if owner != nil {
		oid, err := idx.ensurePubKey(owner)
		if err != nil {
			return err
		}

		if _, err := dbResourcesMaybeSetOwner(idx.conn, id, oid); err != nil {
			return err
		}
	}

	if genesis.Defined() {
		gid, err := idx.ensureBlob(genesis)
		if err != nil {
			return err
		}

		if _, err := dbResourcesMaybeSetGenesis(idx.conn, id, gid); err != nil {
			return err
		}
	}

	if !createTime.IsZero() {
		// We don't need microsecond precision for create time in resources. It's mostly here for convenience anyway.
		if _, err := dbResourcesMaybeSetTimestamp(idx.conn, id, createTime.Unix()); err != nil {
			return err
		}
	}

	return nil
}

func indexURL(sb *StructuralBlob, log *zap.Logger, anchor, linkType, rawURL string) error {
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
