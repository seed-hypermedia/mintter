package daemon

import (
	"context"
	"mintter/backend/core"
	accounts "mintter/backend/genproto/accounts/v1alpha"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	documents "mintter/backend/genproto/documents/v1alpha"
	entities "mintter/backend/genproto/entities/v1alpha"
	networking "mintter/backend/genproto/networking/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/must"
	"mintter/backend/testutil"
	"strconv"
	"testing"
	"time"

	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/stretchr/testify/require"
	"golang.org/x/exp/slices"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/proto"
)

func TestDaemonSmoke(t *testing.T) {
	t.Parallel()

	dmn := makeTestApp(t, "alice", makeTestConfig(t), false)
	ctx := context.Background()

	conn, err := grpc.Dial(dmn.GRPCListener.Addr().String(), grpc.WithBlock(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	require.NoError(t, err)
	defer conn.Close()

	ac := accounts.NewAccountsClient(conn)
	dc := daemon.NewDaemonClient(conn)
	nc := networking.NewNetworkingClient(conn)

	acc, err := ac.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.Error(t, err)
	require.Nil(t, acc)

	seed, err := dc.GenMnemonic(ctx, &daemon.GenMnemonicRequest{
		MnemonicsLength: 12,
	})
	require.NoError(t, err)

	reg, err := dc.Register(ctx, &daemon.RegisterRequest{
		Mnemonic: seed.Mnemonic,
	})
	require.NoError(t, err)
	require.NotNil(t, reg)
	require.NotEqual(t, "", reg.AccountId, "account ID must be generated after registration")

	_, err = core.DecodePrincipal(reg.AccountId)
	require.NoError(t, err, "account must have principal encoding")

	_, err = dmn.Storage.Identity().Await(ctx)
	require.NoError(t, err)

	_, err = dmn.Net.Await(ctx)
	require.NoError(t, err)

	me := dmn.Storage.Identity().MustGet()
	require.Equal(t, me.Account().String(), reg.AccountId)

	acc, err = ac.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	require.Equal(t, reg.AccountId, acc.Id, "must return account after registration")
	require.Equal(t, 1, len(acc.Devices), "must return our own device after registration")
	require.Equal(t, acc.Id, me.Account().String())

	profileUpdate := &accounts.Profile{
		Alias:  "fulanito",
		Bio:    "Mintter Tester",
		Avatar: "bafkreibaejvf3wyblh3s4yhbrwtxto7wpcac7zkkx36cswjzjez2cbmzvu",
	}

	updatedAcc, err := ac.UpdateProfile(ctx, profileUpdate)
	require.NoError(t, err)
	require.Equal(t, acc.Id, updatedAcc.Id)
	require.Equal(t, acc.Devices, updatedAcc.Devices)
	testutil.ProtoEqual(t, profileUpdate, updatedAcc.Profile, "profile update must return full profile")

	acc, err = ac.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	testutil.ProtoEqual(t, updatedAcc, acc, "get account after update must match")

	infoResp, err := dc.GetInfo(ctx, &daemon.GetInfoRequest{})
	require.NoError(t, err)
	require.NotNil(t, infoResp)
	require.Equal(t, me.Account().String(), infoResp.AccountId)
	require.Equal(t, me.DeviceKey().PeerID().String(), infoResp.DeviceId)

	peerInfo, err := nc.GetPeerInfo(ctx, &networking.GetPeerInfoRequest{
		DeviceId: infoResp.DeviceId,
	})
	require.NoError(t, err)
	require.NotNil(t, peerInfo)
	require.Equal(t, me.Account().String(), peerInfo.AccountId)
}

func TestDaemonListPublications(t *testing.T) {
	t.Parallel()

	alice := makeTestApp(t, "alice", makeTestConfig(t), true)

	conn, err := grpc.Dial(alice.GRPCListener.Addr().String(), grpc.WithBlock(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	require.NoError(t, err)
	defer conn.Close()

	client := documents.NewPublicationsClient(conn)

	list, err := client.ListPublications(context.Background(), &documents.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 0, "account object must not be listed as publication")
}

func TestDaemonPushPublication(t *testing.T) {
	t.Parallel()
	t.Skip("Test uses real infra")
	cfg := makeTestConfig(t)
	cfg.P2P.TestnetName = "dev"
	alice := makeTestApp(t, "alice", cfg, true)
	ctx := context.Background()

	pub := publishDocument(t, ctx, alice, "")
	_, err := alice.RPC.Documents.PushPublication(ctx, &documents.PushPublicationRequest{
		DocumentId: pub.Document.Id,
		Url:        ipfs.TestGateway,
	})
	require.NoError(t, err)
	_, err = alice.RPC.Documents.PushPublication(ctx, &documents.PushPublicationRequest{
		DocumentId: pub.Document.Id,
		Url:        "https://gabo.es/",
	})
	require.Error(t, err)
}

func TestAPIGetRemotePublication(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	// Carol is the DHT node.
	carol := makeTestApp(t, "carol", makeTestConfig(t), true)

	var alice *App
	{
		cfg := makeTestConfig(t)
		cfg.P2P.BootstrapPeers = carol.Net.MustGet().Libp2p().AddrsFull()
		alice = makeTestApp(t, "alice", cfg, true)
	}

	var bob *App
	{
		cfg := makeTestConfig(t)
		cfg.P2P.BootstrapPeers = carol.Net.MustGet().Libp2p().AddrsFull()
		bob = makeTestApp(t, "bob", cfg, true)
	}

	// Make sure bob and alice don't know each other.
	require.NoError(t, bob.Net.MustGet().Libp2p().Network().ClosePeer(alice.Storage.Device().ID()))
	bob.Net.MustGet().Libp2p().Peerstore().RemovePeer(alice.Storage.Device().ID())
	require.NoError(t, alice.Net.MustGet().Libp2p().Network().ClosePeer(bob.Storage.Device().ID()))
	alice.Net.MustGet().Libp2p().Peerstore().RemovePeer(bob.Storage.Device().ID())

	pub := publishDocument(t, ctx, alice, "")

	time.Sleep(time.Second)

	remotePub, err := bob.RPC.Documents.GetPublication(ctx, &documents.GetPublicationRequest{DocumentId: pub.Document.Id})
	require.NoError(t, err)

	testutil.ProtoEqual(t, pub, remotePub, "remote publication doesn't match")
}

func TestAPIDeleteAndRestoreEntity(t *testing.T) {
	t.Parallel()

	aliceCfg := makeTestConfig(t)
	bobCfg := makeTestConfig(t)

	aliceCfg.Syncing.WarmupDuration = 100 * time.Millisecond
	bobCfg.Syncing.WarmupDuration = 100 * time.Millisecond

	alice := makeTestApp(t, "alice", aliceCfg, true)
	bob := makeTestApp(t, "bob", bobCfg, true)
	ctx := context.Background()

	_, err := alice.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
		Addrs: getAddrs(t, bob),
	})
	require.NoError(t, err)

	require.NoError(t, alice.Blobs.SetAccountTrust(ctx, bob.Storage.Identity().MustGet().Account().Principal()))
	require.NoError(t, bob.Blobs.SetAccountTrust(ctx, alice.Storage.Identity().MustGet().Account().Principal()))

	pub := publishDocument(t, ctx, alice, "")
	_ = publishDocument(t, ctx, alice, pub.Document.Id+"?v="+pub.Version+"#"+pub.Document.Children[0].Block.Id)
	comment, err := bob.RPC.Documents.CreateComment(ctx, &documents.CreateCommentRequest{
		Target:         pub.Document.Id + "?v=" + pub.Version,
		RepliedComment: "",
		Content: []*documents.BlockNode{{Block: &documents.Block{
			Id:   "c1",
			Type: "paragraph",
			Text: "Bob's comment",
		}}},
	})

	require.NoError(t, err)
	time.Sleep(200 * time.Millisecond)

	// so alice gets Bob's comment
	_, err = alice.RPC.Daemon.ForceSync(ctx, &daemon.ForceSyncRequest{})
	require.NoError(t, err)
	time.Sleep(200 * time.Millisecond)

	comm, err := alice.RPC.Documents.GetComment(ctx, &documents.GetCommentRequest{
		Id: comment.Id,
	})
	require.NoError(t, err)
	require.Equal(t, comment.Id, comm.Id, "Alice should have Bob's comment")
	require.Equal(t, comment.Content, comm.Content, "Comment's content should not have been deleted")

	reply, err := alice.RPC.Documents.CreateComment(ctx, &documents.CreateCommentRequest{
		Target:         pub.Document.Id + "?v=" + pub.Version,
		RepliedComment: comment.Id,
		Content: []*documents.BlockNode{{Block: &documents.Block{
			Id:   "c2",
			Type: "paragraph",
			Text: "Alice's reply",
		}}},
	})
	require.NoError(t, err)

	// so bob gets Alice's document + comment reply
	_, err = bob.RPC.Daemon.ForceSync(ctx, &daemon.ForceSyncRequest{})
	require.NoError(t, err)
	time.Sleep(200 * time.Millisecond)

	doc, err := bob.RPC.Documents.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: pub.Document.Id,
		LocalOnly:  true,
	})
	require.NoError(t, err)
	require.Equal(t, pub.Document.Id, doc.Document.Id, "Bob should have synced the document")

	_, err = bob.RPC.Documents.GetComment(ctx, &documents.GetCommentRequest{
		Id: reply.Id,
	})
	require.NoError(t, err, "Bob should have synced Alice's reply")

	// Now Alice removes de document
	const reason = "I don't want it anymore"
	_, err = alice.RPC.Entities.DeleteEntity(ctx, &entities.DeleteEntityRequest{
		Id:     doc.Document.Id,
		Reason: reason,
	})
	require.NoError(t, err)
	lst, err := alice.RPC.Entities.ListDeletedEntities(ctx, &entities.ListDeletedEntitiesRequest{})
	require.NoError(t, err)
	require.Len(t, lst.DeletedEntities, 1)
	require.Equal(t, doc.Document.Id, lst.DeletedEntities[0].Id)
	require.Equal(t, reason, lst.DeletedEntities[0].DeletedReason)

	// Even if we sync we shouldn't get the document back
	_, err = alice.RPC.Daemon.ForceSync(ctx, &daemon.ForceSyncRequest{})
	require.NoError(t, err)
	time.Sleep(200 * time.Millisecond)

	_, err = alice.RPC.Documents.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: pub.Document.Id,
		LocalOnly:  true,
	})
	require.Error(t, err)

	_, err = alice.RPC.Documents.GetComment(ctx, &documents.GetCommentRequest{
		Id: reply.Id,
	})
	require.Error(t, err)
	_, err = alice.RPC.Documents.GetComment(ctx, &documents.GetCommentRequest{
		Id: comment.Id,
	})
	require.Error(t, err)
	// Only after restoring the document we should get it back.
	_, err = alice.RPC.Entities.RestoreEntity(ctx, &entities.RestoreEntityRequest{
		Id: doc.Document.Id,
	})
	require.NoError(t, err)

	lst, err = alice.RPC.Entities.ListDeletedEntities(ctx, &entities.ListDeletedEntitiesRequest{})
	require.NoError(t, err)
	require.Len(t, lst.DeletedEntities, 0)

	_, err = alice.RPC.Daemon.ForceSync(ctx, &daemon.ForceSyncRequest{})
	require.NoError(t, err)
	time.Sleep(200 * time.Millisecond)

	doc, err = alice.RPC.Documents.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: pub.Document.Id,
		LocalOnly:  true,
	})
	require.NoError(t, err)
	require.Equal(t, pub.Document.Id, doc.Document.Id, "alice should have her document back")

	comm, err = alice.RPC.Documents.GetComment(ctx, &documents.GetCommentRequest{
		Id: comment.Id,
	})
	require.NoError(t, err)
	require.Equal(t, comment.Id, comm.Id, "alice should have her comment back")
	require.Equal(t, comment.Content, comm.Content, "Comment's content should not have been deleted")

	rep, err := alice.RPC.Documents.GetComment(ctx, &documents.GetCommentRequest{
		Id: reply.Id,
	})
	require.NoError(t, err)
	require.Equal(t, reply.Id, rep.Id, "alice should have her own reply back")
	require.Equal(t, reply.Content, rep.Content, "Replies's content should not have been deleted")
}

func TestBug_SyncHangs(t *testing.T) {
	// See: https://github.com/mintterteam/mintter/issues/712.
	t.Parallel()

	alice := makeTestApp(t, "alice", makeTestConfig(t), true)
	bob := makeTestApp(t, "bob", makeTestConfig(t), true)
	carol := makeTestApp(t, "carol", makeTestConfig(t), true)
	ctx := context.Background()

	var g errgroup.Group
	g.Go(func() error {
		_, err := alice.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
			Addrs: getAddrs(t, bob),
		})
		return err
	})

	g.Go(func() error {
		_, err := alice.RPC.Daemon.ForceSync(ctx, &daemon.ForceSyncRequest{})
		return err
	})

	require.NoError(t, func() error {
		_, err := alice.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
			Addrs: getAddrs(t, carol),
		})
		return err
	}())

	require.NoError(t, g.Wait())
}

func TestBug_PublicationsListInconsistent(t *testing.T) {
	// See: https://github.com/mintterteam/mintter/issues/692.
	// Although it turns out this bug may not be the daemon's issue.
	t.Parallel()

	alice := makeTestApp(t, "alice", makeTestConfig(t), true)
	ctx := context.Background()

	publish := func(ctx context.Context, t *testing.T, title, text string) *documents.Publication {
		draft, err := alice.RPC.Documents.CreateDraft(ctx, &documents.CreateDraftRequest{})
		require.NoError(t, err)

		_, err = alice.RPC.Documents.UpdateDraft(ctx, &documents.UpdateDraftRequest{
			DocumentId: draft.Id,
			Changes: []*documents.DocumentChange{
				{
					Op: &documents.DocumentChange_SetTitle{SetTitle: title},
				},
				{
					Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{
						BlockId:     "b1",
						Parent:      "",
						LeftSibling: "",
					}},
				},
				{
					Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
						Id:   "b1",
						Text: "Hello world",
					}},
				},
			},
		})
		require.NoError(t, err)

		pub, err := alice.RPC.Documents.PublishDraft(ctx, &documents.PublishDraftRequest{
			DocumentId: draft.Id,
		})
		require.NoError(t, err)

		return pub
	}

	want := []*documents.Publication{}
	for i := 1; i <= 4; i++ {
		doc := publish(ctx, t, "Doc-"+strconv.Itoa(i), "This is a doc-"+strconv.Itoa(i))
		doc.Document.Children = nil
		doc.Version = ""
		want = append(want, doc)
	}
	slices.Reverse(want) // Most recently updated docs are returned first.

	var g errgroup.Group

	// Trying this more than once and expecting it to return the same result. This is what bug was mostly about.
	// Arbitrary number of attempts was chosen.
	for i := 0; i < 15; i++ {
		g.Go(func() error {
			list, err := alice.RPC.Documents.ListPublications(ctx, &documents.ListPublicationsRequest{})
			require.NoError(t, err)

			require.Len(t, list.Publications, len(want))

			for w := range want {
				testutil.ProtoEqual(t, want[w], list.Publications[w], "publication %d doesn't match", w)
			}
			return nil
		})
	}

	require.NoError(t, g.Wait())
}

func TestPeriodicSync(t *testing.T) {
	t.Parallel()

	acfg := makeTestConfig(t)
	bcfg := makeTestConfig(t)

	acfg.Syncing.WarmupDuration = 1 * time.Millisecond
	bcfg.Syncing.WarmupDuration = 1 * time.Millisecond

	acfg.Syncing.Interval = 150 * time.Millisecond
	bcfg.Syncing.Interval = 150 * time.Millisecond

	acfg.Syncing.RefreshInterval = 50 * time.Millisecond
	bcfg.Syncing.RefreshInterval = 50 * time.Millisecond

	alice := makeTestApp(t, "alice", acfg, true)
	bob := makeTestApp(t, "bob", bcfg, true)
	ctx := context.Background()

	_, err := alice.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
		Addrs: getAddrs(t, bob),
	})
	require.NoError(t, err)

	require.NoError(t, alice.Blobs.SetAccountTrust(ctx, bob.Storage.Identity().MustGet().Account().Principal()))
	require.NoError(t, bob.Blobs.SetAccountTrust(ctx, alice.Storage.Identity().MustGet().Account().Principal()))

	time.Sleep(200 * time.Millisecond)

	checkListAccounts := func(t *testing.T, a, b *App, msg string) {
		accs, err := a.RPC.Accounts.ListAccounts(ctx, &accounts.ListAccountsRequest{})
		require.NoError(t, err)

		bacc := must.Do2(b.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))

		require.Len(t, accs.Accounts, 2, msg)       // our own account is also listed. It's always first.
		bacc.IsTrusted = accs.Accounts[1].IsTrusted // just bc they synced they dont trust each other
		testutil.ProtoEqual(t, bacc, accs.Accounts[1], "a must fetch b's account fully")
	}

	checkListAccounts(t, alice, bob, "alice to bob")
	checkListAccounts(t, bob, alice, "bob to alice")
}

func TestMultiDevice(t *testing.T) {
	t.Parallel()

	alice1 := makeTestApp(t, "alice", makeTestConfig(t), true)
	alice2 := makeTestApp(t, "alice-2", makeTestConfig(t), true)
	ctx := context.Background()

	_, err := alice1.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
		Addrs: getAddrs(t, alice2),
	})
	require.NoError(t, err)
	acc1 := must.Do2(alice1.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))
	acc2 := must.Do2(alice2.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))

	require.False(t, proto.Equal(acc1, acc2), "accounts must not match before syncing")

	{
		sr := must.Do2(alice1.Syncing.MustGet().SyncAll(ctx))
		require.Equal(t, int64(1), sr.NumSyncOK)
		require.Equal(t, int64(0), sr.NumSyncFailed)
		require.Equal(t, []peer.ID{alice2.Storage.Device().PeerID()}, sr.Peers)
	}

	{
		sr := must.Do2(alice2.Syncing.MustGet().SyncAll(ctx))
		require.Equal(t, int64(1), sr.NumSyncOK)
		require.Equal(t, int64(0), sr.NumSyncFailed)
		require.Equal(t, []peer.ID{alice1.Storage.Device().PeerID()}, sr.Peers)
	}
	acc1 = must.Do2(alice1.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))
	acc2 = must.Do2(alice2.RPC.Accounts.GetAccount(ctx, &accounts.GetAccountRequest{}))
	testutil.ProtoEqual(t, acc1, acc2, "accounts must match after sync")

	require.Len(t, acc2.Devices, 2, "must have two devices after syncing")
}

func TestNetworkingListPeers(t *testing.T) {
	t.Parallel()

	alice := makeTestApp(t, "alice", makeTestConfig(t), true)
	bob := makeTestApp(t, "bob", makeTestConfig(t), true)
	ctx := context.Background()

	_, err := alice.RPC.Networking.Connect(ctx, &networking.ConnectRequest{
		Addrs: getAddrs(t, bob),
	})
	require.NoError(t, err)

	pid := bob.Storage.Identity().MustGet().DeviceKey().PeerID()
	acc := bob.Storage.Identity().MustGet().Account().Principal()
	pList, err := alice.RPC.Networking.ListPeers(ctx, &networking.ListPeersRequest{})
	require.NoError(t, err)
	require.Len(t, pList.Peers, 1)
	require.Equal(t, acc.String(), pList.Peers[0].AccountId, "account ids must match")
	require.Equal(t, pid.String(), pList.Peers[0].Id, "peer ids must match")
	pList, err = alice.RPC.Networking.ListPeers(ctx, &networking.ListPeersRequest{})
	require.NoError(t, err)
	require.Len(t, pList.Peers, 1)
}

func TestAccountRootDocument(t *testing.T) {
	t.Parallel()

	alice := makeTestApp(t, "alice", makeTestConfig(t), true)
	ctx := context.Background()

	var rootDocID string
	{
		draft, err := alice.RPC.Documents.CreateDraft(ctx, &documents.CreateDraftRequest{})
		require.NoError(t, err)

		resp, err := alice.RPC.Documents.UpdateDraft(ctx, &documents.UpdateDraftRequest{
			DocumentId: draft.Id,
			Changes: []*documents.DocumentChange{
				{Op: &documents.DocumentChange_SetTitle{SetTitle: "My Root Document"}},
			},
		})
		draft = resp.UpdatedDocument

		pub, err := alice.RPC.Documents.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
		require.NoError(t, err)

		rootDocID = pub.Document.Id
	}

	acc, err := alice.RPC.Accounts.UpdateProfile(ctx, &accounts.Profile{
		RootDocument: rootDocID,
	})
	require.NoError(t, err)

	require.Equal(t, rootDocID, acc.Profile.RootDocument)

	mentions, err := alice.RPC.Entities.ListEntityMentions(ctx, &entities.ListEntityMentionsRequest{Id: rootDocID})
	require.NoError(t, err)

	require.Len(t, mentions.Mentions, 1, "root document must have a mentions from the account")
}

func getAddrs(t *testing.T, a *App) []string {
	return mttnet.AddrInfoToStrings(a.Net.MustGet().AddrInfo())
}

func publishDocument(t *testing.T, ctx context.Context, publisher *App, link string) *documents.Publication {
	draft, err := publisher.RPC.Documents.CreateDraft(ctx, &documents.CreateDraftRequest{})
	require.NoError(t, err)
	ann := []*documents.Annotation{}
	if link != "" {
		ann = append(ann, &documents.Annotation{
			Type:   "link",
			Ref:    link,
			Starts: []int32{0},
			Ends:   []int32{5},
		},
		)
	}
	updated, err := publisher.RPC.Documents.UpdateDraft(ctx, &documents.UpdateDraftRequest{
		DocumentId: draft.Id,
		Changes: []*documents.DocumentChange{
			{Op: &documents.DocumentChange_SetTitle{SetTitle: "My new document title"}},
			{Op: &documents.DocumentChange_MoveBlock_{MoveBlock: &documents.DocumentChange_MoveBlock{BlockId: "b1"}}},
			{Op: &documents.DocumentChange_ReplaceBlock{ReplaceBlock: &documents.Block{
				Id:          "b1",
				Type:        "paragraph",
				Text:        "Hello world!",
				Annotations: ann,
			}}},
		},
	})

	require.NoError(t, err)
	require.NotNil(t, updated)
	published, err := publisher.RPC.Documents.PublishDraft(ctx, &documents.PublishDraftRequest{DocumentId: draft.Id})
	require.NoError(t, err)
	return published
}
