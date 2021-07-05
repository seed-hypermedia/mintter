package document

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	v2 "mintter/backend/api/v2"
	"mintter/backend/identity"
	"mintter/backend/ipldutil"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/rs/xid"
	"go.uber.org/multierr"
)

var (
	keyDrafts           = datastore.NewKey("/mintter/v2/drafts")
	keyDocs             = datastore.NewKey("/mintter/v2/documents")
	keyIndexBlockQuotes = datastore.NewKey("/mintter/v2/indexes/blockQuotes")
)

func makeBlockQuoteKey(version cid.Cid, blockID string) datastore.Key {
	return keyIndexBlockQuotes.ChildString(version.String()).ChildString(blockID)
}

type store struct {
	bs        blockstore.Blockstore
	db        datastore.Datastore
	profstore profileStore
}

func (ds *store) Get(ctx context.Context, version cid.Cid) (versionedDoc, error) {
	codec := version.Prefix().Codec

	switch codec {
	case draftMultiCodec:
		data, err := ds.db.Get(makeDraftKey(version.String()))
		if err != nil {
			return versionedDoc{}, err
		}
		var d document
		if err := cbornode.DecodeInto(data, &d); err != nil {
			return versionedDoc{}, err
		}
		return versionedDoc{document: d, Version: version}, nil
	case cid.DagCBOR:
		local, err := ds.bs.Has(version)
		if err != nil {
			return versionedDoc{}, err
		}

		blk, err := ds.bs.Get(version)
		if err != nil {
			return versionedDoc{}, err
		}

		vdoc := versionedDoc{Version: version}
		if err := ipldutil.ReadSignedBlock(ctx, ds.profstore, blk, &vdoc.document); err != nil {
			return versionedDoc{}, err
		}

		if !local {
			if err := ds.indexPublication(ctx, vdoc); err != nil {
				return versionedDoc{}, fmt.Errorf("failed to index remote publication: %w", err)
			}
		}

		return vdoc, nil
	default:
		return versionedDoc{}, fmt.Errorf("unknown version code: %s(%d)", cid.CodecToStr[codec], codec)
	}
}

func (ds *store) Has(ctx context.Context, version cid.Cid) (bool, error) {
	return ds.bs.Has(version)
}

func (ds *store) Store(ctx context.Context, doc document) (cid.Cid, error) {
	blk, err := ipldutil.CreateSignedBlock(ctx, ds.profstore, doc)
	if err != nil {
		return cid.Undef, err
	}

	if err := ds.bs.Put(blk); err != nil {
		return cid.Undef, err
	}

	vdoc := versionedDoc{document: doc, Version: blk.Cid()}

	if err := ds.indexPublication(ctx, vdoc); err != nil {
		return cid.Undef, err
	}

	return vdoc.Version, nil
}

func (ds *store) CreateDraft(ctx context.Context) (versionedDoc, error) {
	now := nowFunc()

	var docID cid.Cid
	{
		perma := permanode{
			Random:     xid.New().Bytes(),
			CreateTime: now,
		}

		permablock, err := ipldutil.CreateSignedBlock(ctx, ds.profstore, perma)
		if err != nil {
			return versionedDoc{}, fmt.Errorf("failed to create permablock: %w", err)
		}

		if err := ds.bs.Put(permablock); err != nil {
			return versionedDoc{}, fmt.Errorf("failed to store permablock: %w", err)
		}

		docID = permablock.Cid()
	}

	prof, err := ds.profstore.CurrentProfile(ctx)
	if err != nil {
		return versionedDoc{}, err
	}

	doc := document{
		documentMeta: documentMeta{
			ID:         docID,
			Author:     prof.Account.ID,
			CreateTime: now,
			UpdateTime: now,
		},
	}

	version, err := ds.StoreDraft(ctx, doc)
	if err != nil {
		return versionedDoc{}, err
	}

	return versionedDoc{Version: version, document: doc}, nil
}

func (ds *store) StoreDraft(ctx context.Context, doc document) (cid.Cid, error) {
	version := cid.NewCidV1(draftMultiCodec, doc.ID.Hash())
	doc.UpdateTime = time.Now()

	data, err := cbornode.DumpObject(doc)
	if err != nil {
		return cid.Undef, err
	}

	old, err := ds.Get(ctx, version)
	if err != nil && !errors.Is(err, datastore.ErrNotFound) {
		return cid.Undef, err
	}

	if err := ds.db.Put(makeDraftKey(version.String()), data); err != nil {
		return cid.Undef, err
	}

	if err := ds.buildIndex(ctx, old, versionedDoc{Version: version, document: doc}); err != nil {
		return cid.Undef, err
	}

	return version, nil
}

func (ds *store) Delete(ctx context.Context, version cid.Cid) (err error) {
	codec := version.Prefix().Codec

	// TODO: cleanup indexes.
	vdoc, err := ds.Get(ctx, version)
	if err != nil {
		return err
	}

	// We have to remove this document's version from all the inverted indexes for blocks
	// that this document might quote.
	// E.g. If A quotes blocks from B, when A is deleted indexes for B must be updated to remove A from them.
	err = vdoc.RefList.ForEachRef(func(ref blockRef) error {
		parsed, err := vdoc.parseRefPointer(ref.Pointer)
		if err != nil {
			return err
		}

		if !parsed.IsTransclusion {
			return nil
		}

		k := makeBlockQuoteKey(parsed.Version, parsed.BlockID)
		old, err := ds.db.Get(k)
		if err != nil && err != datastore.ErrNotFound {
			return err
		}

		var set smallStringSet
		if old != nil {
			set = smallStringSet(strings.Split(string(old), ","))
		}

		set = set.Remove(vdoc.Version.String())
		data := []byte(strings.Join(set, ","))

		if err := ds.db.Put(k, data); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}

	// Delete the permanode and the reference in our own database.
	defer func() {
		err = multierr.Combine(err,
			ignoreNotFound(ds.bs.DeleteBlock(vdoc.ID)),
			ignoreNotFound(ds.db.Delete(makeDocsKey(vdoc.Author, vdoc.ID, vdoc.PublishTime, vdoc.Version))),
		)
	}()

	// Delete the actual content.
	switch codec {
	case draftMultiCodec:
		return ds.db.Delete(makeDraftKey(version.String()))
	case cid.DagCBOR:
		return ds.bs.DeleteBlock(version)
	default:
		return fmt.Errorf("unknown version code: %s(%d)", cid.CodecToStr[codec], codec)
	}
}

func (ds *store) ListDocuments(ctx context.Context, author identity.ProfileID, state v2.PublishingState) ([]versionedDoc, error) {
	switch state {
	case v2.PublishingState_DRAFT:
		res, err := ds.db.Query(query.Query{
			Prefix: keyDrafts.String(),
		})
		if err != nil {
			return nil, err
		}

		entries, err := res.Rest()
		if err != nil {
			return nil, err
		}

		out := make([]versionedDoc, len(entries))

		for i, e := range entries {
			var d document
			if err := cbornode.DecodeInto(e.Value, &d); err != nil {
				return nil, err
			}
			v := cid.NewCidV1(draftMultiCodec, d.ID.Hash())
			out[i] = versionedDoc{document: d, Version: v}
		}
		return out, nil
	case v2.PublishingState_PUBLISHED:
		res, err := ds.db.Query(query.Query{
			Prefix:   makeDocsPrefix(author).String(),
			KeysOnly: true,
		})
		if err != nil {
			return nil, err
		}

		entries, err := res.Rest()
		if err != nil {
			return nil, err
		}

		docMap := map[string]struct{}{}
		var out []versionedDoc
		for _, e := range entries {
			parts := strings.Split(e.Key, "/")
			docid := parts[len(parts)-3]
			if _, ok := docMap[docid]; ok {
				continue
			}
			docMap[docid] = struct{}{}

			version, err := cid.Decode(parts[len(parts)-1])
			if err != nil {
				return nil, err
			}

			d, err := ds.Get(ctx, version)
			if err != nil {
				return nil, err
			}

			out = append(out, d)
		}

		return out, nil
	default:
		return nil, fmt.Errorf("invalid publishing state %d", state)
	}
}

func (ds *store) indexPublication(ctx context.Context, vdoc versionedDoc) error {
	if vdoc.Version.Prefix().Codec == draftMultiCodec {
		return fmt.Errorf("must not index draft documents")
	}

	old, err := ds.Get(ctx, vdoc.Version)
	if err != nil {
		return err
	}

	if err := ds.db.Put(makeDocsKey(vdoc.Author, vdoc.ID, vdoc.PublishTime, vdoc.Version), nil); err != nil {
		return err
	}

	return ds.buildIndex(ctx, old, vdoc)
}

func (ds *store) GetBlockQuoters(ctx context.Context, version cid.Cid, blockID string) (smallStringSet, error) {
	k := makeBlockQuoteKey(version, blockID)

	data, err := ds.db.Get(k)
	if err != nil && err != datastore.ErrNotFound {
		return nil, err
	}

	if err == datastore.ErrNotFound {
		return nil, nil
	}

	return strings.Split(string(data), ","), nil
}

func (ds *store) buildIndex(ctx context.Context, old, new versionedDoc) error {
	visited := map[fullBlockRef]struct{}{}
	err := new.RefList.ForEachRef(func(ref blockRef) error {
		parsed, err := new.parseRefPointer(ref.Pointer)
		if err != nil {
			return err
		}

		if !parsed.IsTransclusion {
			return nil
		}

		visited[parsed] = struct{}{}

		k := makeBlockQuoteKey(parsed.Version, parsed.BlockID)
		old, err := ds.db.Get(k)
		if err != nil && err != datastore.ErrNotFound {
			return err
		}

		var set smallStringSet
		if old != nil {
			set = smallStringSet(strings.Split(string(old), ","))
		}

		set = set.Add(new.Version.String())
		if len(set) > 0 {
			data := []byte(strings.Join(set, ","))
			if err := ds.db.Put(k, data); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return err
	}

	// We have to update and remove indexes for blocks that were previously quoted but not anymore.
	err = old.RefList.ForEachRef(func(ref blockRef) error {
		parsed, err := new.parseRefPointer(ref.Pointer)
		if err != nil {
			return err
		}

		if !parsed.IsTransclusion {
			return nil
		}

		if _, ok := visited[parsed]; ok {
			return nil
		}

		k := makeBlockQuoteKey(parsed.Version, parsed.BlockID)
		old, err := ds.db.Get(k)
		if err != nil && err != datastore.ErrNotFound {
			return err
		}

		var set smallStringSet
		if old != nil {
			set = smallStringSet(strings.Split(string(old), ","))
		}

		set = set.Remove(new.Version.String())
		if len(set) == 0 {
			return ds.db.Delete(k)
		}

		data := []byte(strings.Join(set, ","))

		if err := ds.db.Put(k, data); err != nil {
			return err
		}

		return nil
	})

	return nil
}

// Using a slice for small sets should be more efficient that using a map.
//
// See: https://go-talks.appspot.com/github.com/dgryski/talks/dotgo-2016/slices.slide#13
type smallStringSet []string

func (set smallStringSet) Add(v string) smallStringSet {
	if i := set.Search(v); i < len(set) {
		if set[i] == v {
			return set
		}
		set = append(set[:i+1], set[i:]...)
		set[i] = v
	} else {
		set = append(set, v)
	}
	return set
}

func (set smallStringSet) Remove(v string) smallStringSet {
	if i := set.Search(v); i < len(set) && set[i] == v {
		set = append(set[:i], set[i+1:]...)
	}

	return set
}

// Search returns the index of the first element of es that is greater than or
// equal to e.
//
// In other words, if e is an element of es, then es[es.Search(e)] == e.
// However, if all elements in es are less than e, then es.Search(e) == len(e).
//
// If es is not sorted, the results are undefined.
func (set smallStringSet) Search(v string) int {
	return sort.Search(len(set), func(i int) bool { return set[i] >= v })
}

func makeDraftKey(docID string) datastore.Key {
	return keyDrafts.ChildString(docID)
}

func makeDocsKey(author identity.ProfileID, docid cid.Cid, pubTime time.Time, version cid.Cid) datastore.Key {
	return keyDocs.
		ChildString(author.String()).
		ChildString(docid.String()).
		ChildString(pubTime.UTC().Format("20060102150405")).
		ChildString(version.String())
}

func makeDocsPrefix(author identity.ProfileID) datastore.Key {
	return keyDocs.ChildString(author.String())
}

func ignoreNotFound(err error) error {
	if errors.Is(err, datastore.ErrNotFound) {
		return nil
	}
	return err
}
