package backend

import (
	"bytes"
	"context"
	"fmt"
	"mintter/backend/ipfs"
	"mintter/backend/ipfs/sqlitebs"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Draft represents a document Draft.
type Draft struct {
	ID         cid.Cid
	Author     cid.Cid
	Title      string
	Subtitle   string
	Content    []byte
	CreateTime time.Time
	UpdateTime time.Time
}

func (srv *backend) UpdateDraft(ctx context.Context, id cid.Cid, title, subtitle string, content []byte) (Draft, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return Draft{}, err
	}
	defer release()

	ocodec, ohash := ipfs.DecodeCID(id)
	if ocodec != codecDocumentID {
		return Draft{}, fmt.Errorf("wrong doc ID for updating draft %s: %s", id, cid.CodecToStr[ocodec])
	}

	if err := draftsUpdate(conn, title, subtitle, content, int(nowFunc().Unix()), ohash, int(ocodec)); err != nil {
		return Draft{}, err
	}

	if conn.Changes() != 1 {
		return Draft{}, fmt.Errorf("couldn't update draft in the database, no records found")
	}

	return srv.GetDraft(ctx, id)
}

// CreateDraft creates a new permanode and stores it in the block store.
func (srv *backend) CreateDraft(ctx context.Context) (d Draft, err error) {
	// TODO: this should not be needed.
	// Remove and test.
	srv.mu.Lock()
	defer srv.mu.Unlock()

	acc, err := srv.repo.Account()
	if err != nil {
		return Draft{}, err
	}

	sp, err := newSignedPermanode(codecDocumentID, acc.id, srv.repo.device.priv)
	if err != nil {
		return Draft{}, err
	}

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return Draft{}, err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	if err := srv.InitObject(sqlitebs.ContextWithConn(ctx, conn), sp); err != nil {
		return Draft{}, err
	}

	d = Draft{
		ID:         sp.blk.Cid(),
		Author:     cid.Cid(acc.id),
		CreateTime: sp.perma.CreateTime,
		UpdateTime: sp.perma.CreateTime,
	}

	ocodec, ohash := ipfs.DecodeCID(sp.blk.Cid())

	if err := draftsInsert(conn, ohash, int(ocodec), d.Title, d.Subtitle, d.Content, int(d.CreateTime.Unix()), int(d.UpdateTime.Unix())); err != nil {
		return Draft{}, err
	}

	return d, nil
}

func (srv *backend) CreateDraftFromPublication(ctx context.Context, pubid cid.Cid) (Draft, error) {
	ocodec, ohash := ipfs.DecodeCID(pubid)
	if ocodec != codecDocumentID {
		return Draft{}, fmt.Errorf("bad codec in the publication ID %s: %s", pubid, cid.CodecToStr[ocodec])
	}

	acc, err := srv.repo.Account()
	if err != nil {
		return Draft{}, err
	}

	sp, err := srv.GetPermanode(ctx, pubid)
	if err != nil {
		return Draft{}, err
	}

	// TODO: remove this when implemented.
	if !sp.perma.AccountID.Equals(cid.Cid(acc.id)) {
		return Draft{}, fmt.Errorf("unable to create drafts from publications of other authors yet")
	}

	pub, err := srv.GetPublication(ctx, pubid)
	if err != nil {
		return Draft{}, err
	}

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return Draft{}, err
	}
	defer release()

	if err := draftsInsert(conn, ohash, int(ocodec), pub.Title, pub.Subtitle, pub.Content, int(pub.CreateTime.Unix()), int(pub.UpdateTime.Unix())); err != nil {
		return Draft{}, err
	}

	return pub.Draft, nil
}

func (srv *backend) GetDraft(ctx context.Context, c cid.Cid) (Draft, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return Draft{}, err
	}

	ocodec, hash := ipfs.DecodeCID(c)

	result, err := draftsGet(conn, hash, int(ocodec))
	release()
	if err != nil {
		return Draft{}, err
	}
	if result.DraftsCreateTime == 0 {
		return Draft{}, errNotFound
	}

	acc, err := srv.repo.Account()
	if err != nil {
		return Draft{}, err
	}

	return Draft{
		ID:         c,
		Author:     cid.Cid(acc.id),
		Title:      result.DraftsTitle,
		Subtitle:   result.DraftsSubtitle,
		Content:    result.DraftsContent,
		CreateTime: timeFromSeconds(result.DraftsCreateTime),
		UpdateTime: timeFromSeconds(result.DraftsUpdateTime),
	}, nil
}

func (srv *backend) DeleteDraft(ctx context.Context, c cid.Cid) (err error) {
	// Because we store drafts and publications in the same table, in order to
	// delete a draft we have to do a bit of a workaround here.
	// We first clear the draft-related fields, and only delete the record
	// if there's no publication with the same document ID.

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	codec, hash := ipfs.DecodeCID(c)

	if codec != codecDocumentID {
		panic("BUG: wrong codec for draft")
	}

	// TODO: if we don't have any publications also delete the object.

	return draftsDelete(conn, hash, int(codec))
}

func (srv *backend) ListDrafts(ctx context.Context) ([]draftsListResult, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return draftsList(conn)
}

func (srv *backend) PublishDraft(ctx context.Context, c cid.Cid) (Publication, error) {
	srv.mu.Lock()
	defer srv.mu.Unlock()

	dcodec, _ := ipfs.DecodeCID(c)
	if dcodec != codecDocumentID {
		return Publication{}, fmt.Errorf("wrong codec for publishing document %s", cid.CodecToStr[dcodec])
	}

	draft, err := srv.GetDraft(ctx, c)
	if err != nil {
		return Publication{}, err
	}

	pubchanges, err := srv.LoadState(ctx, c)
	if err != nil {
		return Publication{}, err
	}

	pub, err := publicationFromChanges(pubchanges)
	if err != nil {
		return Publication{}, err
	}

	if pub.UpdateTime.Equal(draft.UpdateTime) {
		return Publication{}, fmt.Errorf("nothing to publish, update time is already published")
	}

	// TODO(burdiyan): If we're updating an existing publication there could be a weird edge case.
	// If we receive changes from other peers for this publication, it means that the draft
	// we're trying to publish doesn't have the most recent information, thus we may overwrite
	// changes from other peers without even knowing about it. Need to think about how to fix!
	// We'll probably need to store published version when we create a draft, or constantly keeping things up to date.
	// Maybe will even need to store drafts and publications separately in the database.

	acc, err := srv.repo.Account()
	if err != nil {
		return Publication{}, err
	}

	change := DocumentChange{
		UpdateTime: timestamppb.New(draft.UpdateTime),
	}
	{
		// For the first patch ever we want to set the dates and author.
		if pub.Author.Equals(cid.Undef) {
			change.Author = acc.id.String()
			change.CreateTime = timestamppb.New(draft.CreateTime)
		}

		if draft.Title != pub.Title {
			change.TitleUpdated = draft.Title
		}

		if draft.Subtitle != pub.Subtitle {
			change.SubtitleUpdated = draft.Subtitle
		}

		if !bytes.Equal(draft.Content, pub.Content) {
			change.ContentUpdated = draft.Content
		}
	}

	docChange, err := pubchanges.NewProtoPatch(cid.Cid(acc.id), srv.repo.device.priv, &change)
	if err != nil {
		return Publication{}, err
	}

	if err := pub.applyChange(docChange); err != nil {
		return Publication{}, err
	}

	docFeed, err := srv.LoadState(ctx, newDocumentFeedID(acc.id))
	if err != nil {
		return Publication{}, err
	}

	// TODO: this should not be necessary, but it is, so that we can get the next seq no.
	_ = docFeed.Merge()

	feedChange, err := docFeed.NewProtoPatch(cid.Cid(acc.id), srv.repo.Device().priv, &DocumentFeedChange{
		DocumentPublished: c.String(),
	})
	if err != nil {
		return Publication{}, fmt.Errorf("failed to create document feed patch: %w", err)
	}

	err = func() (err error) {
		conn, release, err := srv.pool.Conn(ctx)
		if err != nil {
			return err
		}
		defer release()

		defer sqlitex.Save(conn)(&err)

		cctx := sqlitebs.ContextWithConn(ctx, conn)

		if err := srv.AddPatch(cctx, docChange, feedChange); err != nil {
			return err
		}

		ocodec, ohash := ipfs.DecodeCID(c)

		if ocodec != codecDocumentID {
			panic("BUG: bad codec for publication " + cid.CodecToStr[ocodec])
		}

		if err := draftsDelete(conn, ohash, int(ocodec)); err != nil {
			return err
		}

		if err := publicationsIndex(conn, ocodec, ohash, pub); err != nil {
			return err
		}

		return nil
	}()
	if err != nil {
		return Publication{}, err
	}

	p2p, err := srv.readyIPFS()
	if err != nil {
		return Publication{}, err
	}

	p2p.prov.EnqueueProvide(ctx, c)
	p2p.prov.EnqueueProvide(ctx, docChange.cid)
	p2p.prov.EnqueueProvide(ctx, feedChange.cid)

	return pub, nil
}
