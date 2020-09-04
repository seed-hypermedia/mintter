package document

import (
	"context"
	"fmt"
	"mintter/backend/identity"
	"mintter/backend/ipldutil"
	v2 "mintter/proto/v2"
	"strings"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/rs/xid"
)

var (
	keyDrafts = datastore.NewKey("/mintter/v2/drafts")
	keyDocs   = datastore.NewKey("/mintter/v2/documents")
)

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
		blk, err := ds.bs.Get(version)
		if err != nil {
			return versionedDoc{}, err
		}
		var doc document
		return versionedDoc{document: doc, Version: version}, ipldutil.ReadSignedBlock(ctx, ds.profstore, blk, &doc)
	default:
		return versionedDoc{}, fmt.Errorf("unknown version code: %s(%d)", cid.CodecToStr[codec], codec)
	}
}

func (ds *store) Store(ctx context.Context, doc document) (cid.Cid, error) {
	blk, err := ipldutil.CreateSignedBlock(ctx, ds.profstore, doc)
	if err != nil {
		return cid.Undef, err
	}

	data, err := cbornode.DumpObject(doc)
	if err != nil {
		return cid.Undef, err
	}

	if err := ds.db.Put(makeDocsKey(doc.Author, doc.ID, doc.PublishTime, blk.Cid()), data); err != nil {
		return cid.Undef, err
	}

	return blk.Cid(), ds.bs.Put(blk)
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
		ID:         docID,
		Author:     prof.Account.ID,
		CreateTime: now,
		UpdateTime: now,
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

	if err := ds.db.Put(makeDraftKey(version.String()), data); err != nil {
		return cid.Undef, err
	}

	return version, nil
}

func (ds *store) Delete(ctx context.Context, version cid.Cid) error {
	codec := version.Prefix().Codec

	switch codec {
	case draftMultiCodec:
		doc, err := ds.Get(ctx, version)
		if err != nil {
			return err
		}
		if err := ds.bs.DeleteBlock(doc.ID); err != nil {
			return err
		}

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
			Prefix: makeDocsPrefix(author).String(),
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

			var d document
			if err := cbornode.DecodeInto(e.Value, &d); err != nil {
				return nil, err
			}
			out = append(out, versionedDoc{document: d, Version: version})
		}

		return out, nil
	default:
		return nil, fmt.Errorf("invalid publishing state %d", state)
	}
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
