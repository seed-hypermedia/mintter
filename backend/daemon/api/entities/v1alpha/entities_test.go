package entities

import (
	"context"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/core/coretest"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	documents "mintter/backend/daemon/api/documents/v1alpha"
	"mintter/backend/daemon/storage"
	documentsproto "mintter/backend/genproto/documents/v1alpha"
	entities "mintter/backend/genproto/entities/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/logging"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/must"
	"mintter/backend/testutil"
	"strings"
	"sync"
	"testing"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"
)

var _ entities.EntitiesServer = (*Server)(nil)

type cache struct {
	funcs []onceFunc
}

type onceFunc struct {
	once sync.Once
	fn   func() string
	val  string
}

func (o *onceFunc) Do() string {
	o.once.Do(func() {
		o.val = o.fn()
	})
	return o.val
}

func (c *cache) Q(fn func() string) int {
	idx := len(c.funcs)
	c.funcs = append(c.funcs, onceFunc{fn: fn})
	return idx
}

func (c *cache) Query(idx int) string {
	return c.funcs[idx].Do()
}

var c cache

var (
	qSay = c.Q(func() string {
		return "say" + "foo" + "bar"
	})

	qHey = c.Q(func() string {
		return fmt.Sprintf("hey %s %s", "foo", "bar")
	})
)

func BenchmarkCache(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = c.Query(qSay)
		_ = c.Query(qHey)
	}
}

func TestEntityTimeline(t *testing.T) {
	t.Parallel()

	alice := coretest.NewTester("alice")

	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, zap.NewNop())
	api := NewServer(blobs, nil)
	ctx := context.Background()
	aliceDelegation := must.Do2(daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now()))

	bob := coretest.NewTester("bob")
	bobDelegation := must.Do2(daemon.Register(ctx, blobs, bob.Account, bob.Device.PublicKey, time.Now()))

	e := hyper.NewEntity("fake-obj")

	c1, err := e.CreateChange(e.NextTimestamp(), alice.Account, aliceDelegation, map[string]any{
		"name": "Alice",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, c1))

	c2, err := e.CreateChange(e.NextTimestamp(), alice.Account, aliceDelegation, map[string]any{
		"country": "Wonderland",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, c2))

	// Bob creates a change off of the first change from Alice, which creates a new head.
	c3, err := hyper.NewChange(e.ID(), []cid.Cid{c1.CID}, e.NextTimestamp(), bob.Device, bobDelegation, map[string]any{
		"country": "Mordor",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, c3))
	require.NoError(t, e.ApplyChange(c3.CID, c3.Decoded.(hyper.Change)))

	// Alice also creates a fork from c1.
	c4, err := hyper.NewChange(e.ID(), []cid.Cid{c1.CID}, e.NextTimestamp(), alice.Device, aliceDelegation, map[string]any{
		"lastName": "Liddell",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, c4))
	require.NoError(t, e.ApplyChange(c4.CID, c4.Decoded.(hyper.Change)))

	want := &entities.EntityTimeline{
		Id:    string(e.ID()),
		Owner: alice.Account.String(),
		Changes: map[string]*entities.Change{
			c1.CID.String(): {
				Id:         c1.CID.String(),
				Author:     alice.Account.String(),
				CreateTime: timestamppb.New(c1.Decoded.(hyper.Change).HLCTime.Time()),
				Children:   []string{c2.CID.String(), c3.CID.String(), c4.CID.String()},
				IsTrusted:  true,
			},
			c2.CID.String(): {
				Id:         c2.CID.String(),
				Author:     alice.Account.String(),
				CreateTime: timestamppb.New(c2.Decoded.(hyper.Change).HLCTime.Time()),
				Deps:       []string{c1.CID.String()},
				IsTrusted:  true,
			},
			c3.CID.String(): {
				Id:         c3.CID.String(),
				Author:     bob.Account.String(),
				CreateTime: timestamppb.New(c3.Decoded.(hyper.Change).HLCTime.Time()),
				Deps:       []string{c1.CID.String()},
				IsTrusted:  true,
			},
			c4.CID.String(): {
				Id:         c4.CID.String(),
				Author:     alice.Account.String(),
				CreateTime: timestamppb.New(c4.Decoded.(hyper.Change).HLCTime.Time()),
				Deps:       []string{c1.CID.String()},
				IsTrusted:  true,
			},
		},
		Roots:         []string{c1.CID.String()},
		ChangesByTime: []string{c1.CID.String(), c2.CID.String(), c3.CID.String(), c4.CID.String()},
		Heads:         []string{c2.CID.String(), c3.CID.String(), c4.CID.String()},
		AuthorVersions: []*entities.AuthorVersion{
			{
				Author:      alice.Account.String(),
				Heads:       []string{c2.CID.String(), c4.CID.String()},
				Version:     strings.Join([]string{c2.CID.String(), c4.CID.String()}, "."),
				VersionTime: timestamppb.New(c4.Decoded.(hyper.Change).HLCTime.Time()),
			},
			{
				Author:      bob.Account.String(),
				Heads:       []string{c3.CID.String()},
				Version:     c3.CID.String(),
				VersionTime: timestamppb.New(c3.Decoded.(hyper.Change).HLCTime.Time()),
			},
		},
	}

	timeline, err := api.GetEntityTimeline(ctx, &entities.GetEntityTimelineRequest{Id: string(e.ID())})
	require.NoError(t, err)

	testutil.ProtoEqual(t, want, timeline, "timeline must match")
}

func TestDeleteEntity(t *testing.T) {
	db := storage.MakeTestDB(t)

	docsapi := newTestDocsAPI(t, db, "alice")
	ctx := context.Background()

	blobs := hyper.NewStorage(db, zap.NewNop())
	api := NewServer(blobs, nil)

	doc, err := docsapi.CreateDraft(ctx, &documentsproto.CreateDraftRequest{})
	require.NoError(t, err)
	doc = updateDraft(ctx, t, docsapi, doc.Id, []*documentsproto.DocumentChange{
		{Op: &documentsproto.DocumentChange_SetTitle{SetTitle: "My new document title"}}},
	)

	_, err = docsapi.PublishDraft(ctx, &documentsproto.PublishDraftRequest{DocumentId: doc.Id})
	require.NoError(t, err)

	list, err := docsapi.ListPublications(ctx, &documentsproto.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 1)

	deleted, err := api.DeleteEntity(ctx, &entities.DeleteEntityRequest{Id: doc.Id})
	require.NoError(t, err)
	require.NotNil(t, deleted)

	list, err = docsapi.ListPublications(ctx, &documentsproto.ListPublicationsRequest{})
	require.NoError(t, err)
	require.Len(t, list.Publications, 0)

	pub, err := docsapi.GetPublication(ctx, &documentsproto.GetPublicationRequest{DocumentId: doc.Id})
	require.Error(t, err, "must fail to get deleted publication")
	_ = pub

	// TODO: fix status codes.
	// s, ok := status.FromError(err)
	// require.True(t, ok)
	// require.Nil(t, pub)
	// require.Equal(t, codes.NotFound, s.Code())
}

func newTestDocsAPI(t *testing.T, db *sqlitex.Pool, name string) *documents.Server {
	u := coretest.NewTester("alice")

	fut := future.New[core.Identity]()
	require.NoError(t, fut.Resolve(u.Identity))

	srv := documents.NewServer(fut.ReadOnly, db, nil, nil, "debug")
	bs := hyper.NewStorage(db, logging.New("mintter/hyper", "debug"))
	_, err := daemon.Register(context.Background(), bs, u.Account, u.Device.PublicKey, time.Now())
	require.NoError(t, err)

	// since we cannot do _, err = srv.me.Await(context.Background())
	time.Sleep(10 * time.Millisecond)

	return srv
}

func updateDraft(ctx context.Context, t *testing.T, docapi *documents.Server, id string, updates []*documentsproto.DocumentChange) *documentsproto.Document {
	_, err := docapi.UpdateDraft(ctx, &documentsproto.UpdateDraftRequest{
		DocumentId: id,
		Changes:    updates,
	})
	require.NoError(t, err, "failed to update draft")

	draft, err := docapi.GetDraft(ctx, &documentsproto.GetDraftRequest{DocumentId: id})
	require.NoError(t, err, "failed to get draft after update")

	return draft
}
