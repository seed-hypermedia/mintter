package backend

// func TestAPICitations_E2E(t *testing.T) {
// 	alice := makeTestBackend(t, "alice", true)
// 	aapi := newDocsAPI(alice)
// 	ctx := context.Background()

// 	// Publish a document to which other document will link.
// 	var pub *documents.Publication
// 	{
// 		doc, err := aapi.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 		require.NoError(t, err)

// 		doc.Title = "My new document title"
// 		doc.Subtitle = "This is my document's abstract"
// 		doc.Content = `{"content":"Hello World"}`
// 		updated, err := aapi.UpdateDraft(ctx, &documents.UpdateDraftRequest{Document: doc})
// 		require.NoError(t, err)
// 		p, err := aapi.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: updated.Id})
// 		require.NoError(t, err)
// 		pub = p
// 	}

// 	// Create a draft that will link to the previously published document.
// 	var draft *documents.Document
// 	{
// 		doc, err := aapi.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 		require.NoError(t, err)

// 		doc.Title = "My new publication"
// 		doc.Subtitle = "Yep"
// 		doc.Content = "{}"
// 		links := []*documents.Link{
// 			{
// 				Source: &documents.LinkNode{
// 					BlockId: "source-block-1",
// 				},
// 				Target: &documents.LinkNode{
// 					BlockId:    "target-block-1",
// 					Version:    pub.Version,
// 					DocumentId: pub.Document.Id,
// 				},
// 			},
// 		}

// 		doc, err = aapi.UpdateDraft(ctx, &documents.UpdateDraftRequest{
// 			Document: doc,
// 			Links:    links,
// 		})
// 		require.NoError(t, err)
// 		draft = doc
// 	}

// 	// Check that we have draft as a citation of the publication.
// 	{
// 		cits, err := aapi.ListCitations(ctx, &documents.ListCitationsRequest{DocumentId: pub.Document.Id})
// 		require.NoError(t, err)

// 		wantLinks := []*documents.Link{
// 			{
// 				Source: &documents.LinkNode{
// 					DocumentId: draft.Id,
// 					BlockId:    "source-block-1",
// 					Version:    "",
// 				},
// 				Target: &documents.LinkNode{
// 					DocumentId: pub.Document.Id,
// 					BlockId:    "target-block-1",
// 					Version:    pub.Version,
// 				},
// 			},
// 		}

// 		require.Equal(t, len(wantLinks), len(cits.Links), "returned unexpected number of citations")

// 		for i := range wantLinks {
// 			testutil.ProtoEqual(t, wantLinks[i], cits.Links[i], "citations don't match input")
// 		}
// 	}

// 	// Check that draft updates stores the diff of the links correctly.
// 	{
// 		links := []*documents.Link{
// 			{
// 				Source: &documents.LinkNode{
// 					BlockId: "source-block-3",
// 				},
// 				Target: &documents.LinkNode{
// 					BlockId:    "target-block-10",
// 					Version:    pub.Version,
// 					DocumentId: pub.Document.Id,
// 				},
// 			},
// 		}

// 		d, err := aapi.UpdateDraft(ctx, &documents.UpdateDraftRequest{
// 			Document: draft,
// 			Links:    links,
// 		})
// 		require.NoError(t, err)
// 		draft = d

// 		cits, err := aapi.ListCitations(ctx, &documents.ListCitationsRequest{DocumentId: pub.Document.Id})
// 		require.NoError(t, err)

// 		wantLinks := []*documents.Link{
// 			{
// 				Source: &documents.LinkNode{
// 					DocumentId: draft.Id,
// 					BlockId:    "source-block-3",
// 					Version:    "",
// 				},
// 				Target: &documents.LinkNode{
// 					DocumentId: pub.Document.Id,
// 					BlockId:    "target-block-10",
// 					Version:    pub.Version,
// 				},
// 			},
// 		}
// 		require.Equal(t, len(wantLinks), len(cits.Links), "returned unexpected number of citations")
// 		for i := range wantLinks {
// 			testutil.ProtoEqual(t, wantLinks[i], cits.Links[i], "citations don't match input")
// 		}
// 	}

// 	// Delete draft and check that links were removed.
// 	{
// 		_, err := aapi.DeleteDraft(ctx, &documents.DeleteDraftRequest{DocumentId: draft.Id})
// 		require.NoError(t, err)

// 		cits, err := aapi.ListCitations(ctx, &documents.ListCitationsRequest{DocumentId: pub.Document.Id})
// 		require.NoError(t, err)
// 		require.Nil(t, cits.Links)
// 	}

// 	// Create another draft and now publish it.
// 	var pub2 *documents.Publication
// 	{
// 		doc, err := aapi.CreateDraft(ctx, &documents.CreateDraftRequest{})
// 		require.NoError(t, err)

// 		doc.Title = "My new publication"
// 		doc.Subtitle = "Yep"
// 		doc.Content = "{}"
// 		links := []*documents.Link{
// 			{
// 				Source: &documents.LinkNode{
// 					BlockId: "source-block-1",
// 				},
// 				Target: &documents.LinkNode{
// 					BlockId:    "target-block-1",
// 					Version:    pub.Version,
// 					DocumentId: pub.Document.Id,
// 				},
// 			},
// 		}

// 		doc, err = aapi.UpdateDraft(ctx, &documents.UpdateDraftRequest{
// 			Document: doc,
// 			Links:    links,
// 		})
// 		require.NoError(t, err)

// 		p, err := aapi.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: doc.Id})
// 		require.NoError(t, err)
// 		pub2 = p
// 	}

// 	// Check that all the citations from draft were removed and now appear as sourced on the publication.
// 	{
// 		wantLinks := []*documents.Link{
// 			{
// 				Source: &documents.LinkNode{
// 					DocumentId: pub2.Document.Id,
// 					Version:    pub2.Version,
// 					BlockId:    "source-block-1",
// 				},
// 				Target: &documents.LinkNode{
// 					DocumentId: pub.Document.Id,
// 					BlockId:    "target-block-1",
// 					Version:    pub.Version,
// 				},
// 			},
// 		}

// 		cits, err := aapi.ListCitations(ctx, &documents.ListCitationsRequest{DocumentId: pub.Document.Id})
// 		require.NoError(t, err)

// 		require.Equal(t, len(wantLinks), len(cits.Links), "unexpected number of links returned")
// 		require.Equal(t, wantLinks, cits.Links)
// 	}

// 	// Now create another peer and connect them.
// 	bob := makeTestBackend(t, "bob", true)
// 	bapi := newDocsAPI(bob)
// 	connectPeers(ctx, t, alice, bob, true)
// 	require.NoError(t, bob.SyncAccounts(ctx))

// 	// Check that Bob fetched all the publications from Alice.
// 	{
// 		bpub, err := bapi.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: pub.Document.Id})
// 		require.NoError(t, err)
// 		testutil.ProtoEqual(t, pub, bpub, "bob must fetch exactly the same publication as published by alice")

// 		bpub2, err := bapi.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: pub2.Document.Id})
// 		require.NoError(t, err)
// 		testutil.ProtoEqual(t, pub2, bpub2, "bob must fetch exactly the same publication 2 as published by alice")
// 	}

// 	// Check that Bob inferred citations for Alice's publication.
// 	{
// 		wantLinks := []*documents.Link{
// 			{
// 				Source: &documents.LinkNode{
// 					DocumentId: pub2.Document.Id,
// 					Version:    pub2.Version,
// 					BlockId:    "source-block-1",
// 				},
// 				Target: &documents.LinkNode{
// 					DocumentId: pub.Document.Id,
// 					BlockId:    "target-block-1",
// 					Version:    pub.Version,
// 				},
// 			},
// 		}

// 		cits, err := bapi.ListCitations(ctx, &documents.ListCitationsRequest{DocumentId: pub.Document.Id})
// 		require.NoError(t, err)
// 		require.Equal(t, len(wantLinks), len(cits.Links), "unexpected number of links returned")
// 		require.Equal(t, wantLinks, cits.Links)
// 	}

// 	// Bob reuses from Alice which also reuses from another Alice's doc.
// 	var bobpub *documents.Publication
// 	{
// 		d, err := bapi.UpdateDraft(ctx, &documents.UpdateDraftRequest{
// 			Document: makeDraft(ctx, t, bapi, "Bob Reuses From Alice", ""),
// 			Links: []*documents.Link{
// 				{
// 					Source: &documents.LinkNode{
// 						BlockId: "bob-block-1",
// 					},
// 					Target: &documents.LinkNode{
// 						DocumentId: pub2.Document.Id,
// 						Version:    pub2.Version,
// 					},
// 				},
// 			},
// 		})
// 		require.NoError(t, err)

// 		p, err := bapi.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: d.Id})
// 		require.NoError(t, err)
// 		bobpub = p

// 		wantLinks := []*documents.Link{
// 			{
// 				Source: &documents.LinkNode{
// 					DocumentId: p.Document.Id,
// 					BlockId:    "bob-block-1",
// 					Version:    p.LatestVersion,
// 				},
// 				Target: &documents.LinkNode{
// 					DocumentId: pub2.Document.Id,
// 					Version:    pub2.Version,
// 				},
// 			},
// 		}

// 		// Check citations for Alice's doc appear in Bob.
// 		cits, err := bapi.ListCitations(ctx, &documents.ListCitationsRequest{DocumentId: pub2.Document.Id})
// 		require.NoError(t, err)

// 		require.Equal(t, wantLinks, cits.Links)
// 	}

// 	// Carol connects to bob.
// 	carol := makeTestBackend(t, "carol", true)
// 	capi := newDocsAPI(carol)

// 	connectPeers(ctx, t, bob, carol, true)
// 	require.NoError(t, carol.SyncAccounts(ctx))

// 	// Carol sees Bob's stuff with reused stuff from Alice.
// 	{
// 		p, err := capi.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: bobpub.Document.Id})
// 		require.NoError(t, err)

// 		testutil.ProtoEqual(t, bobpub, p, "carol must fetch bob's stuff as published")

// 		list, err := capi.ListPublications(ctx, &documents.ListPublicationsRequest{})
// 		require.NoError(t, err)
// 		require.Len(t, list.Publications, 3, "carol must get 3 pubs")

// 		cits, err := capi.ListCitations(ctx, &documents.ListCitationsRequest{DocumentId: pub.Document.Id, Depth: 2})
// 		require.NoError(t, err)
// 		require.Len(t, cits.Links, 2, "alice's original document must have 2 citations in carol")
// 	}
// }
