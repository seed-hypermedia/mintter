package backend

import (
	"context"
	"fmt"
	"mintter/backend/ipfs"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
)

// Draft represents a document Draft.
type Draft struct {
	ID         cid.Cid
	Author     cid.Cid
	Title      string
	Subtitle   string
	Content    []byte
	Links      map[Link]struct{}
	CreateTime time.Time
	UpdateTime time.Time
}

func (d *Draft) AddLink(l Link) {
	if d.Links == nil {
		d.Links = map[Link]struct{}{}
	}
	d.Links[l] = struct{}{}
}

func (d *Draft) RemoveLink(l Link) {
	if d.Links != nil {
		delete(d.Links, l)
	}
}

// ContentWithLinks represents a draft content with links.
type ContentWithLinks struct {
	Content []byte
	Links   map[Link]struct{}
}

// Link from a draft to another document.
type Link struct {
	SourceBlockID    string
	SourceChangeID   cid.Cid
	TargetDocumentID cid.Cid
	TargetBlockID    string
	TargetVersion    Version
}

func (l Link) String() string {
	return "mintter://" + l.TargetDocumentID.String() + "/" + l.TargetVersion.String() + "/" + l.TargetBlockID
}

func (srv *backend) UpdateDraft(ctx context.Context, id cid.Cid, title, subtitle string, content ContentWithLinks) (d Draft, err error) {
	ocodec, ohash := ipfs.DecodeCID(id)
	if ocodec != codecDocumentID {
		return Draft{}, fmt.Errorf("wrong doc ID for updating draft %s: %s", id, cid.CodecToStr[ocodec])
	}

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return Draft{}, err
	}
	defer release()

	incomingLinks := content.Links

	dbLinks, err := linksListBySource(conn, ohash, int(ocodec))
	if err != nil {
		return Draft{}, err
	}

	var existingLinks map[Link]int
	if dbLinks != nil {
		existingLinks = make(map[Link]int, len(dbLinks))

		for _, l := range dbLinks {
			// We only want draft links which won't have reference to the IPFS block.
			if l.IsDraft == 0 {
				continue
			}
			ll := Link{
				SourceBlockID:    l.LinksSourceBlockID,
				TargetDocumentID: cid.NewCidV1(uint64(l.TargetObjectCodec), l.TargetObjectMultihash),
				TargetBlockID:    l.LinksTargetBlockID,
				TargetVersion:    Version(l.LinksTargetVersion),
			}
			existingLinks[ll] = l.LinksID
		}
	}

	// Diff existing and incoming links. We'll leave the ones to insert
	// in the incoming map, and the ones to delete in the existing map.
	for l := range incomingLinks {
		_, ok := existingLinks[l]
		if !ok {
			continue
		}
		// Existing links don't need to be inserted,
		// nor they have to be deleted.
		delete(incomingLinks, l)
		delete(existingLinks, l)
	}

	acc, err := srv.repo.Account()
	if err != nil {
		return d, err
	}

	if err := sqlitex.WithTx(conn, func(conn *sqlite.Conn) error {
		if err := draftsUpdate(conn, title, subtitle, content.Content, int(nowFunc().Unix()), ohash, int(ocodec)); err != nil {
			return err
		}

		if conn.Changes() != 1 {
			return fmt.Errorf("couldn't update draft in the database, no records found")
		}

		for _, id := range existingLinks {
			if err := linksDeleteByID(conn, id); err != nil {
				return fmt.Errorf("failed to delete link %d: %w", id, err)
			}
		}

		for l := range incomingLinks {
			tcodec, thash := ipfs.DecodeCID(l.TargetDocumentID)
			if tcodec != codecDocumentID {
				return fmt.Errorf("bad CID codec for linked document %s: %s", l.TargetDocumentID, cid.CodecToStr[tcodec])
			}
			if err := linksInsertFromDraft(conn, ohash, int(ocodec), l.SourceBlockID, thash, int(tcodec), l.TargetBlockID, l.TargetVersion.String()); err != nil {
				return fmt.Errorf("failed to insert link %s: %w", l, err)
			}
		}

		draft, err := draftFromSQLite(conn, id, AccID(acc.CID()))
		d = draft
		return err
	}); err != nil {
		return d, err
	}

	return d, nil
}

func linksFromSQLite(conn *sqlite.Conn, c cid.Cid, draftsOnly bool) (map[Link]struct{}, error) {
	ocodec, ohash := ipfs.DecodeCID(c)

	dbLinks, err := linksListBySource(conn, ohash, int(ocodec))

	if err != nil {
		return nil, err
	}

	out := make(map[Link]struct{}, len(dbLinks))
	for _, l := range dbLinks {
		if draftsOnly && l.IsDraft == 0 {
			continue
		}
		ll := Link{
			SourceBlockID:    l.LinksSourceBlockID,
			TargetDocumentID: cid.NewCidV1(uint64(l.TargetObjectCodec), l.TargetObjectMultihash),
			TargetBlockID:    l.LinksTargetBlockID,
			TargetVersion:    Version(l.LinksTargetVersion),
		}
		out[ll] = struct{}{}
	}

	return out, nil
}

func draftFromSQLite(conn *sqlite.Conn, id cid.Cid, author AccountID) (d Draft, err error) {
	ocodec, ohash := ipfs.DecodeCID(id)

	result, err := draftsGet(conn, ohash, int(ocodec))
	if err != nil {
		return d, err
	}
	if result.DraftsCreateTime == 0 {
		return d, errNotFound
	}

	return Draft{
		ID:         id,
		Author:     cid.Cid(author),
		Title:      result.DraftsTitle,
		Subtitle:   result.DraftsSubtitle,
		Content:    result.DraftsContent,
		CreateTime: timeFromSeconds(result.DraftsCreateTime),
		UpdateTime: timeFromSeconds(result.DraftsUpdateTime),
	}, nil
}

func (srv *backend) DeleteDraft(ctx context.Context, c cid.Cid) (err error) {
	codec, hash := ipfs.DecodeCID(c)
	if codec != codecDocumentID {
		panic("BUG: wrong codec for draft")
	}

	// TODO: if we don't have any publications for the CID also delete the object.
	return srv.pool.WithTx(ctx, func(conn *sqlite.Conn) error {
		return draftsDelete(conn, hash, int(codec))
	})
}

func (srv *backend) ListDrafts(ctx context.Context) ([]draftsListResult, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return draftsList(conn)
}

// func (srv *backend) PublishDraft(ctx context.Context, c cid.Cid) (pub Publication, err error) {
// 	srv.mu.Lock()
// 	defer srv.mu.Unlock()

// 	dcodec, _ := ipfs.DecodeCID(c)
// 	if dcodec != codecDocumentID {
// 		return Publication{}, fmt.Errorf("wrong codec for publishing document %s", cid.CodecToStr[dcodec])
// 	}

// 	draft, err := srv.GetDraft(ctx, c)
// 	if err != nil {
// 		return Publication{}, err
// 	}

// 	pubchanges, err := srv.LoadState(ctx, c)
// 	if err != nil {
// 		return Publication{}, err
// 	}

// 	pub, err = publicationFromChanges(pubchanges)
// 	if err != nil {
// 		return Publication{}, err
// 	}

// 	if pub.UpdateTime.Equal(draft.UpdateTime) {
// 		return Publication{}, fmt.Errorf("nothing to publish, update time is already published")
// 	}

// 	// TODO(burdiyan): If we're updating an existing publication there could be a weird edge case.
// 	// If we receive changes from other peers for this publication, it means that the draft
// 	// we're trying to publish doesn't have the most recent information, thus we may overwrite
// 	// changes from other peers without even knowing about it. Need to think about how to fix!
// 	// We'll probably need to store published version when we create a draft, or constantly keeping things up to date.
// 	// Maybe will even need to store drafts and publications separately in the database.

// 	acc, err := srv.repo.Account()
// 	if err != nil {
// 		return Publication{}, err
// 	}

// 	change := DocumentChange{
// 		UpdateTime: timestamppb.New(draft.UpdateTime),
// 	}
// 	{
// 		// For the first patch ever we want to set the dates and author.
// 		if pub.Author.Equals(cid.Undef) {
// 			change.Author = acc.CID().String()
// 			change.CreateTime = timestamppb.New(draft.CreateTime)
// 		}

// 		if draft.Title != pub.Title {
// 			change.TitleUpdated = draft.Title
// 		}

// 		if draft.Subtitle != pub.Subtitle {
// 			change.SubtitleUpdated = draft.Subtitle
// 		}

// 		if !bytes.Equal(draft.Content, pub.Content) {
// 			change.ContentUpdated = draft.Content
// 		}

// 		existingLinks := pub.Links

// 		incomingLinks, err := srv.getLinks(ctx, c, true)
// 		if err != nil {
// 			return pub, err
// 		}

// 		for l := range incomingLinks {
// 			_, ok := existingLinks[l]
// 			if !ok {
// 				continue
// 			}
// 			delete(incomingLinks, l)
// 			delete(existingLinks, l)
// 		}

// 		for l := range existingLinks {
// 			change.LinksRemoved = append(change.LinksRemoved, l.Proto())
// 		}

// 		for l := range incomingLinks {
// 			change.LinksAdded = append(change.LinksAdded, l.Proto())
// 		}
// 	}

// 	docChange, err := pubchanges.NewProtoPatch(cid.Cid(acc.CID()), srv.repo.Device(), &change)
// 	if err != nil {
// 		return Publication{}, err
// 	}

// 	if err := pub.apply(docChange); err != nil {
// 		return Publication{}, err
// 	}

// 	docFeed, err := srv.LoadState(ctx, newDocumentFeedID(AccID(acc.CID())))
// 	if err != nil {
// 		return Publication{}, err
// 	}

// 	// TODO: this should not be necessary, but it is, so that we can get the next seq no.
// 	_ = docFeed.Merge()

// 	feedChange, err := docFeed.NewProtoPatch(cid.Cid(acc.CID()), srv.repo.Device(), &DocumentFeedChange{
// 		DocumentPublished: c.String(),
// 	})
// 	if err != nil {
// 		return Publication{}, fmt.Errorf("failed to create document feed patch: %w", err)
// 	}

// 	ocodec, ohash := ipfs.DecodeCID(c)
// 	if ocodec != codecDocumentID {
// 		panic("BUG: bad codec for publication " + cid.CodecToStr[ocodec])
// 	}

// 	ccodec, chash := ipfs.DecodeCID(docChange.blk.Cid())

// 	if err = srv.pool.WithTx(ctx, func(conn *sqlite.Conn) error {
// 		return multierr.Combine(
// 			srv.AddPatch(sqlitebs.ContextWithConn(ctx, conn), docChange, feedChange),
// 			linksUpdatePublication(conn, chash, int(ccodec), ohash, int(ocodec)),
// 			draftsDelete(conn, ohash, int(ocodec)),
// 			publicationsIndex(conn, pub),
// 		)
// 	}); err != nil {
// 		return Publication{}, err
// 	}

// 	p2p, err := srv.readyIPFS()
// 	if err != nil {
// 		return Publication{}, err
// 	}

// 	p2p.prov.EnqueueProvide(ctx, c)
// 	p2p.prov.EnqueueProvide(ctx, docChange.cid)
// 	p2p.prov.EnqueueProvide(ctx, feedChange.cid)

// 	return pub, nil
// }
