package backend

// func TestDeletePublication_Reused(t *testing.T) {
// 	alice := makeTestBackend(t, "alice", true)
// 	ctx := context.Background()

// 	d, err := alice.CreateDraft(ctx)
// 	require.NoError(t, err)

// 	d, err = alice.UpdateDraft(ctx, d.ID, "New title", "", ContentWithLinks{
// 		Content: []byte("hello world"),
// 	})
// 	require.NoError(t, err)

// 	pub, err := alice.PublishDraft(ctx, d.ID)
// 	require.NoError(t, err)

// 	d2, err := alice.CreateDraft(ctx)
// 	require.NoError(t, err)

// 	d2, err = alice.UpdateDraft(ctx, d2.ID, "Reusing here", "", ContentWithLinks{
// 		Content: []byte("reusing here hey!"),
// 		Links: map[Link]struct{}{
// 			{
// 				SourceBlockID:    "b1",
// 				TargetDocumentID: pub.ID,
// 				TargetVersion:    pub.Version,
// 			}: {},
// 		},
// 	})
// 	require.NoError(t, err)

// 	_, err = alice.PublishDraft(ctx, d2.ID)
// 	require.NoError(t, err)

// 	require.Error(t, alice.DeletePublication(ctx, pub.ID), "must refuse to delete publication with backlinks")
// }
