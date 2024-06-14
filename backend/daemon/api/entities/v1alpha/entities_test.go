package entities

import (
	"context"
	"fmt"
	"seed/backend/core/coretest"
	daemon "seed/backend/daemon/api/daemon/v1alpha"
	"seed/backend/daemon/storage"
	entities "seed/backend/genproto/entities/v1alpha"
	"seed/backend/hyper"
	"seed/backend/pkg/must"
	"seed/backend/testutil"
	"strings"
	"sync"
	"testing"
	"time"

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

	//   c1 — c2
	//  /  \
	// c3  c4
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
	require.NoError(t, blobs.SaveDraftBlob(ctx, e.ID(), c4))
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
				IsDraft:    true,
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

	timeline, err := api.GetEntityTimeline(ctx, &entities.GetEntityTimelineRequest{Id: string(e.ID()), IncludeDrafts: true})
	require.NoError(t, err)
	testutil.ProtoEqual(t, want, timeline, "timeline with drafts must match")

	// Now without drafts.
	{
		want := &entities.EntityTimeline{
			Id:    string(e.ID()),
			Owner: alice.Account.String(),
			Changes: map[string]*entities.Change{
				c1.CID.String(): {
					Id:         c1.CID.String(),
					Author:     alice.Account.String(),
					CreateTime: timestamppb.New(c1.Decoded.(hyper.Change).HLCTime.Time()),
					Children:   []string{c2.CID.String(), c3.CID.String()},
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
			},
			Roots:         []string{c1.CID.String()},
			ChangesByTime: []string{c1.CID.String(), c2.CID.String(), c3.CID.String()},
			Heads:         []string{c2.CID.String(), c3.CID.String()},
			AuthorVersions: []*entities.AuthorVersion{
				{
					Author:      alice.Account.String(),
					Heads:       []string{c2.CID.String()},
					Version:     strings.Join([]string{c2.CID.String()}, "."),
					VersionTime: timestamppb.New(c2.Decoded.(hyper.Change).HLCTime.Time()),
				},
				{
					Author:      bob.Account.String(),
					Heads:       []string{c3.CID.String()},
					Version:     c3.CID.String(),
					VersionTime: timestamppb.New(c3.Decoded.(hyper.Change).HLCTime.Time()),
				},
			},
		}

		timeline, err := api.GetEntityTimeline(ctx, &entities.GetEntityTimelineRequest{Id: string(e.ID()), IncludeDrafts: false})
		require.NoError(t, err)
		testutil.ProtoEqual(t, want, timeline, "timeline without drafts must match")
	}
}
