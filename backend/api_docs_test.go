package backend

// func TestAPIUpdatePublicationE2E(t *testing.T) {
// 	// Create draft, update content, publish, then update the publication.

// 	// See: https://www.notion.so/mintter/list-item-issues-with-updates-3d4eef6f3b1a47bbac722772abb5eeb5.

// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)

// 	// Create a new draft.
// 	ctx := context.Background()
// 	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 	require.NoError(t, err)
// 	doc.Title = "Old Publication"
// 	doc.Content = "Old content"
// 	doc, err = api.UpdateDraft(ctx, &documents.UpdateDraftRequest{
// 		Document: doc,
// 	})
// 	require.NoError(t, err)

// 	// Publish draft.
// 	pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{
// 		DocumentId: doc.Id,
// 	})
// 	require.NoError(t, err)
// 	require.NotNil(t, pub)
// 	pub.Document.PublishTime = nil
// 	testutil.ProtoEqual(t, doc, pub.Document, "published draft doesn't match")
// 	require.NotEqual(t, "", pub.Version, "publication must have a version")

// 	// Create draft from a publication.
// 	newDraft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{
// 		ExistingDocumentId: doc.Id,
// 	})
// 	require.NoError(t, err)
// 	testutil.ProtoEqual(t, doc, newDraft, "draft from publication doesn't match")

// 	// Check that previous publication is still in the list. Metadata must still be indexed.
// 	publist, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, publist.Publications, 1, "previous publication must be in the list after updating")
// 	require.Equal(t, pub.Document.Title, publist.Publications[0].Document.Title)

// 	time.Sleep(time.Second)

// 	// Change the content.
// 	gotDraft, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: doc.Id})
// 	require.NoError(t, err)
// 	testutil.ProtoEqual(t, doc, gotDraft, "get draft of a new draft doesn't match")
// 	gotDraft.Content = "Updated Content"
// 	gotDraft.Title = "Updated title"
// 	updatedDraft, err := api.UpdateDraft(ctx, &documents.UpdateDraftRequest{Document: gotDraft})
// 	require.NoError(t, err)
// 	gotDraft.UpdateTime = updatedDraft.UpdateTime
// 	testutil.ProtoEqual(t, gotDraft, updatedDraft, "can't update draft of a publication")

// 	// Publish again.
// 	pub2, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: doc.Id})
// 	require.NoError(t, err)
// 	updatedDraft.PublishTime = pub2.Document.PublishTime
// 	testutil.ProtoEqual(t, updatedDraft, pub2.Document, "publishing new version doesn't match")

// 	// Check we have no drafts.
// 	_, err = api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: doc.Id})
// 	require.Error(t, err, "draft must be removed after publishing")
// 	drafts, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, drafts.Documents, 0, "must have no drafts after publishing")

// 	// Check the most recent publication is returned.
// 	gotPub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: doc.Id})
// 	require.NoError(t, err)
// 	testutil.ProtoEqual(t, pub2, gotPub, "must get updated publication")

// 	// Only the most recent version should appear in the publist.
// 	publist, err = api.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, publist.Publications, 1, "must have published document in the list")

// 	for _, pub := range publist.Publications {
// 		require.NotEqual(t, "", pub.Version)
// 		require.NotEqual(t, "", pub.LatestVersion)
// 	}
// }

// func TestAPICreateDraft(t *testing.T) {
// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)
// 	ctx := context.Background()

// 	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 	require.NoError(t, err)
// 	require.NotEqual(t, "", doc.Id)
// 	require.Equal(t, back.repo.MustAccount().id.String(), doc.Author)
// 	require.False(t, doc.UpdateTime.AsTime().IsZero())
// 	require.False(t, doc.CreateTime.AsTime().IsZero())
// }

// func TestAPIListDrafts(t *testing.T) {
// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)
// 	ctx := context.Background()

// 	var docs [5]*documents.Document

// 	g, gctx := errgroup.WithContext(ctx)
// 	for i := range docs {
// 		i := i
// 		g.Go(func() error {
// 			ia := strconv.Itoa(i)
// 			doc := makeDraft(gctx, t, api, "My Document Title "+ia, "Subtitle "+ia)
// 			docs[i] = doc
// 			return nil
// 		})
// 	}
// 	require.NoError(t, g.Wait())

// 	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
// 	require.NoError(t, err)

// 	for _, doc := range list.Documents {
// 		var ok bool
// 		for _, d := range docs {
// 			if d.Id == doc.Id {
// 				ok = true
// 				testutil.ProtoEqual(t, d, doc, "documents don't match")
// 				break
// 			}
// 		}
// 		require.True(t, ok, "document was not found "+doc.Id)
// 	}
// }

// func TestAPIGetDraft(t *testing.T) {
// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)
// 	ctx := context.Background()

// 	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 	require.NoError(t, err)

// 	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: doc.Id})
// 	require.NoError(t, err)

// 	testutil.ProtoEqual(t, doc, got, "must get draft that was created")
// }

// func TestAPIUpdateDraft(t *testing.T) {
// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)
// 	ctx := context.Background()

// 	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 	require.NoError(t, err)

// 	doc.Title = "My new document title"
// 	doc.Subtitle = "This is my document's abstract"
// 	doc.Content = `{"content":"Hello World"}`

// 	updated, err := api.UpdateDraft(ctx, &documents.UpdateDraftRequest{Document: doc})
// 	require.NoError(t, err)

// 	doc.UpdateTime = updated.UpdateTime // This is the only field that should differ.
// 	testutil.ProtoEqual(t, doc, updated, "UpdateDraft should return the updated document")

// 	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, list.Documents, 1)
// 	require.Equal(t, updated.Id, list.Documents[0].Id)
// 	require.Equal(t, updated.Author, list.Documents[0].Author)
// 	require.Equal(t, updated.Title, list.Documents[0].Title)

// 	got, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: doc.Id})
// 	require.NoError(t, err)

// 	testutil.ProtoEqual(t, doc, got, "must get draft that was updated")
// }

// func TestAPIPublishDraft(t *testing.T) {
// 	// Move clock back a bit so that timestamps generated in tests
// 	// are clearly after the test start.
// 	start := nowTruncated().Add(time.Second * 10 * -1)

// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)
// 	ctx := context.Background()

// 	doc := makeDraft(ctx, t, api, "My Document Title", "Subtitle")

// 	published, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: doc.Id})
// 	require.NoError(t, err)
// 	doc.PublishTime = published.Document.PublishTime // This is the only field that should differ.
// 	testutil.ProtoEqual(t, doc, published.Document, "published document doesn't match")

// 	require.NotEqual(t, "", published.Document.Id, "publication must have id")
// 	require.NotEqual(t, "", published.Version, "publication must have version")
// 	require.NotEqual(t, "", published.LatestVersion, "publication must have latest version")
// 	require.Equal(t, doc.Id, published.Document.Id)
// 	require.Equal(t, published.Version, published.LatestVersion, "published version must be the last one")

// 	docid, err := cid.Decode(doc.Id)
// 	require.NoError(t, err)

// 	version, err := back.GetObjectVersion(ctx, docid)
// 	require.NoError(t, err)

// 	require.Equal(t, doc.Id, version.ObjectId)
// 	require.Len(t, version.VersionVector, 1)
// 	require.Equal(t, published.Version, version.VersionVector[0].Head)
// 	require.Equal(t, published.Version, published.LatestVersion)

// 	require.True(t, start.Before(published.Document.CreateTime.AsTime()), "create time must be after test start")
// 	require.True(t, start.Before(published.Document.UpdateTime.AsTime()), "update time must be after test start")
// 	require.True(t, start.Before(published.Document.PublishTime.AsTime()), "publish time must be after test start")

// 	list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, list.Documents, 0, "published draft must be removed from drafts")

// 	draft, err := api.GetDraft(ctx, &documents.GetDraftRequest{
// 		DocumentId: doc.Id,
// 	})
// 	require.Nil(t, draft, "draft must be removed after publishing")
// 	require.Error(t, err, "must fail to get published draft")

// 	got, err := api.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: doc.Id})
// 	require.NoError(t, err, "must get document after publishing")
// 	testutil.ProtoEqual(t, published, got, "published document doesn't match")
// }

// func TestAPIListPublications_Simple(t *testing.T) {
// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)
// 	ctx := context.Background()

// 	pubs := map[string]*documents.Publication{}
// 	{
// 		draft := makeDraft(ctx, t, api, "doc-1", "")
// 		p, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)
// 		pubs[p.Document.Id] = p
// 		draft.PublishTime = p.Document.PublishTime
// 		testutil.ProtoEqual(t, draft, p.Document, "published document must be the same as draft")
// 	}
// 	{
// 		draft := makeDraft(ctx, t, api, "doc-2", "")
// 		p, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)
// 		pubs[p.Document.Id] = p
// 		draft.PublishTime = p.Document.PublishTime
// 		testutil.ProtoEqual(t, draft, p.Document, "published document must be the same as draft")
// 	}
// 	{
// 		draft := makeDraft(ctx, t, api, "doc-3", "")
// 		p, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)
// 		pubs[p.Document.Id] = p
// 		draft.PublishTime = p.Document.PublishTime
// 		testutil.ProtoEqual(t, draft, p.Document, "published document must be the same as draft")
// 	}

// 	{
// 		list, err := api.ListDrafts(ctx, &documents.ListDraftsRequest{})
// 		require.NoError(t, err)
// 		require.Len(t, list.Documents, 0)
// 	}

// 	{
// 		require.Len(t, pubs, 3)

// 		list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 		require.NoError(t, err)
// 		require.Len(t, list.Publications, len(pubs))

// 		for _, pub := range list.Publications {
// 			orig := pubs[pub.Document.Id]
// 			testutil.ProtoEqual(t, orig, pub, "publication in list must match the original")
// 		}
// 	}
// }

// func TestAPIListPublications_Concurrent(t *testing.T) {
// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)
// 	ctx := context.Background()

// 	list, err := api.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, list.Publications, 0)

// 	var drafts [5]*documents.Document
// 	var publications [len(drafts)]*documents.Publication

// 	var wg sync.WaitGroup

// 	wg.Add(len(drafts))
// 	for i := range drafts {
// 		go func(i int) {
// 			ia := strconv.Itoa(i)
// 			drafts[i] = makeDraft(ctx, t, api, "My Document "+ia, "Subtitle "+ia)
// 			wg.Done()
// 		}(i)
// 	}

// 	wg.Wait()

// 	wg.Add(len(drafts))
// 	for i := range drafts {
// 		go func(i int) {
// 			d := drafts[i]
// 			pub, err := api.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: d.Id})
// 			require.NoError(t, err, "failed to publish document "+d.Title)
// 			publications[i] = pub
// 			wg.Done()
// 		}(i)
// 	}

// 	wg.Wait()

// 	list, err = api.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 	require.NoError(t, err)
// 	require.Len(t, list.Publications, len(drafts))
// 	for _, l := range list.Publications {
// 		require.NotEqual(t, "", l.Document.Id)
// 		require.NotEqual(t, "", l.Document.Title)
// 		require.NotEqual(t, "", l.Document.Subtitle)
// 		require.NotNil(t, l.Document.CreateTime)
// 		require.NotNil(t, l.Document.UpdateTime)
// 		require.NotNil(t, l.Document.PublishTime)
// 	}
// }

// func TestAPISyncDocuments(t *testing.T) {
// 	alice := makeTestBackend(t, "alice", true)
// 	aapi := newDocsAPI(alice)
// 	bob := makeTestBackend(t, "bob", true)
// 	bapi := newDocsAPI(bob)
// 	ctx := context.Background()

// 	pubs := map[string]*documents.Publication{}

// 	// Create some publications in Alice.
// 	{
// 		draft := makeDraft(ctx, t, aapi, "Doc-1", "Sub-1")
// 		p, err := aapi.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)
// 		pubs[p.Document.Id] = p
// 	}
// 	{
// 		draft := makeDraft(ctx, t, aapi, "Doc-2", "Sub-2")
// 		p, err := aapi.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)
// 		pubs[p.Document.Id] = p
// 	}
// 	{
// 		draft := makeDraft(ctx, t, aapi, "Doc-3", "Sub-3")
// 		p, err := aapi.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)
// 		pubs[p.Document.Id] = p
// 	}

// 	connectPeers(ctx, t, alice, bob, true)

// 	// Check Bob doesn't have anything before sync.
// 	{
// 		list, err := bapi.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 		require.NoError(t, err)
// 		require.Len(t, list.Publications, 0)
// 	}

// 	require.NoError(t, bob.SyncAccounts(ctx))

// 	// Check Bob synced everything from Alice exactly as published.
// 	{
// 		require.Len(t, pubs, 3)

// 		for _, orig := range pubs {
// 			pub, err := bapi.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: orig.Document.Id})
// 			require.NoError(t, err)
// 			testutil.ProtoEqual(t, orig, pub, "bob must fetch exactly the same publication as published by alice")
// 		}

// 		list, err := bapi.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 		require.NoError(t, err)
// 		require.Len(t, list.Publications, len(pubs))

// 		for _, pub := range list.Publications {
// 			testutil.ProtoEqual(t, pubs[pub.Document.Id], pub, "bob synced publications don't match in list")
// 		}
// 	}

// 	// Try to sync again. Nothing new has to appear.
// 	require.NoError(t, bob.SyncAccounts(ctx))
// 	{
// 		require.Len(t, pubs, 3)

// 		for _, orig := range pubs {
// 			pub, err := bapi.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: orig.Document.Id})
// 			require.NoError(t, err)
// 			testutil.ProtoEqual(t, orig, pub, "bob must fetch exactly the same publication as published by alice")
// 		}

// 		list, err := bapi.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 		require.NoError(t, err)
// 		require.Len(t, list.Publications, len(pubs))

// 		for _, pub := range list.Publications {
// 			testutil.ProtoEqual(t, pubs[pub.Document.Id], pub, "bob synced publications don't match in list")
// 		}
// 	}
// }

// func TestAPIUpdateDraftV2(t *testing.T) {
// 	back := makeTestBackend(t, "alice", true)
// 	api := newDocsAPI(back)
// 	ctx := context.Background()

// 	draft, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 	require.NoError(t, err)

// 	// === Add some content to the draft ===
// 	{
// 		_, err = api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
// 			DocumentId: draft.Id,
// 			Changes: []*documents.DocumentChange{
// 				{Op: &documents.DocumentChange_SetTitle{
// 					SetTitle: "Hello Drafts V2",
// 				}},
// 				{Op: &documents.DocumentChange_SetSubtitle{
// 					SetSubtitle: "This is a more granular drafts API",
// 				}},
// 				{Op: &documents.DocumentChange_MoveBlock_{
// 					MoveBlock: &documents.DocumentChange_MoveBlock{
// 						BlockId:     "b1",
// 						Parent:      "",
// 						LeftSibling: "",
// 					},
// 				}},
// 				{Op: &documents.DocumentChange_ReplaceBlock{
// 					ReplaceBlock: &documents.Block{
// 						Id:   "b1",
// 						Text: "This is the first paragraph.",
// 					},
// 				}},
// 				{Op: &documents.DocumentChange_MoveBlock_{
// 					MoveBlock: &documents.DocumentChange_MoveBlock{
// 						BlockId:     "b1.1",
// 						Parent:      "b1",
// 						LeftSibling: "",
// 					},
// 				}},
// 				{Op: &documents.DocumentChange_ReplaceBlock{
// 					ReplaceBlock: &documents.Block{
// 						Id:   "b1.1",
// 						Text: "This is a child of the first paragraph.",
// 					},
// 				}},

// 				{Op: &documents.DocumentChange_MoveBlock_{
// 					MoveBlock: &documents.DocumentChange_MoveBlock{
// 						BlockId:     "b2",
// 						Parent:      "",
// 						LeftSibling: "",
// 					},
// 				}},
// 				{Op: &documents.DocumentChange_ReplaceBlock{
// 					ReplaceBlock: &documents.Block{
// 						Id:   "b2",
// 						Text: "This is inserted before the first paragraph.",
// 					},
// 				}},
// 			},
// 		})
// 		require.NoError(t, err)

// 		doc, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)

// 		want := &documents.Document{
// 			Id:         draft.Id,
// 			Author:     draft.Author,
// 			Title:      "Hello Drafts V2",
// 			Subtitle:   "This is a more granular drafts API",
// 			CreateTime: draft.CreateTime,
// 			UpdateTime: doc.UpdateTime,
// 			Children: []*documents.BlockNode{
// 				{
// 					Block: &documents.Block{
// 						Id:   "b2",
// 						Text: "This is inserted before the first paragraph.",
// 					},
// 				},
// 				{
// 					Block: &documents.Block{
// 						Id:   "b1",
// 						Text: "This is the first paragraph.",
// 					},
// 					Children: []*documents.BlockNode{
// 						{
// 							Block: &documents.Block{
// 								Id:   "b1.1",
// 								Text: "This is a child of the first paragraph.",
// 							},
// 						},
// 					},
// 				},
// 			},
// 		}

// 		testutil.ProtoEqual(t, want, doc, "draft doesn't match after the first update")
// 	}

// 	// === Now reparent b1.1 ===
// 	{
// 		_, err = api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
// 			DocumentId: draft.Id,
// 			Changes: []*documents.DocumentChange{
// 				{Op: &documents.DocumentChange_MoveBlock_{
// 					MoveBlock: &documents.DocumentChange_MoveBlock{
// 						BlockId:     "b1.1",
// 						Parent:      "",
// 						LeftSibling: "b2",
// 					},
// 				}},
// 			},
// 		})
// 		require.NoError(t, err)

// 		doc, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)

// 		want := &documents.Document{
// 			Id:         draft.Id,
// 			Author:     draft.Author,
// 			Title:      "Hello Drafts V2",
// 			Subtitle:   "This is a more granular drafts API",
// 			CreateTime: draft.CreateTime,
// 			UpdateTime: doc.UpdateTime,
// 			Children: []*documents.BlockNode{
// 				{
// 					Block: &documents.Block{
// 						Id:   "b2",
// 						Text: "This is inserted before the first paragraph.",
// 					},
// 				},
// 				{
// 					Block: &documents.Block{
// 						Id:   "b1.1",
// 						Text: "This is a child of the first paragraph.",
// 					},
// 				},
// 				{
// 					Block: &documents.Block{
// 						Id:   "b1",
// 						Text: "This is the first paragraph.",
// 					},
// 				},
// 			},
// 		}

// 		testutil.ProtoEqual(t, want, doc, "draft doesn't match after the first update")
// 	}

// 	// === Now delete b1.1 ===
// 	{
// 		_, err = api.UpdateDraftV2(ctx, &documents.UpdateDraftRequestV2{
// 			DocumentId: draft.Id,
// 			Changes: []*documents.DocumentChange{
// 				{Op: &documents.DocumentChange_DeleteBlock{
// 					DeleteBlock: "b1.1",
// 				}},
// 			},
// 		})
// 		require.NoError(t, err)

// 		doc, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)

// 		want := &documents.Document{
// 			Id:         draft.Id,
// 			Author:     draft.Author,
// 			Title:      "Hello Drafts V2",
// 			Subtitle:   "This is a more granular drafts API",
// 			CreateTime: draft.CreateTime,
// 			UpdateTime: doc.UpdateTime,
// 			Children: []*documents.BlockNode{
// 				{
// 					Block: &documents.Block{
// 						Id:   "b2",
// 						Text: "This is inserted before the first paragraph.",
// 					},
// 				},
// 				{
// 					Block: &documents.Block{
// 						Id:   "b1",
// 						Text: "This is the first paragraph.",
// 					},
// 				},
// 			},
// 		}

// 		testutil.ProtoEqual(t, want, doc, "draft doesn't match after the first update")
// 	}
// }

// func makeDraft(ctx context.Context, t *testing.T, api DocsServer, title, subtitle string) *documents.Document {
// 	t.Helper()

// 	doc, err := api.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 	require.NoError(t, err)
// 	doc.Title = title
// 	doc.Subtitle = subtitle

// 	doc, err = api.UpdateDraft(ctx, &documents.UpdateDraftRequest{Document: doc})
// 	require.NoError(t, err)

// 	return doc
// }
