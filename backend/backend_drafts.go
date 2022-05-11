package backend

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
