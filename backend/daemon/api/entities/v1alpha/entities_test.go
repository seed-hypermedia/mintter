package entities

import (
	"context"
	"mintter/backend/core/coretest"
	daemon "mintter/backend/daemon/api/daemon/v1alpha"
	"mintter/backend/daemon/storage"
	entities "mintter/backend/genproto/entities/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/pkg/must"
	"mintter/backend/testutil"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"
)

var _ entities.EntitiesServer = (*Server)(nil)

func TestEntityTimeline(t *testing.T) {
	t.Parallel()

	alice := coretest.NewTester("alice")
	db := storage.MakeTestDB(t)
	blobs := hyper.NewStorage(db, zap.NewNop())
	api := NewServer(blobs, nil)
	ctx := context.Background()
	del := must.Do2(daemon.Register(ctx, blobs, alice.Account, alice.Device.PublicKey, time.Now()))

	e := hyper.NewEntity("fake-obj")

	c1, err := e.CreateChange(e.NextTimestamp(), alice.Account, del, map[string]any{
		"name": "Alice",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, c1))

	c2, err := e.CreateChange(e.NextTimestamp(), alice.Account, del, map[string]any{
		"country": "Wonderland",
	})
	require.NoError(t, err)
	require.NoError(t, blobs.SaveBlob(ctx, c2))

	want := &entities.EntityTimeline{
		Id: string(e.ID()),
		Changes: map[string]*entities.Change{
			c1.CID.String(): {
				Id:         c1.CID.String(),
				Author:     alice.Account.String(),
				CreateTime: timestamppb.New(c1.Decoded.(hyper.Change).HLCTime.Time()),
				IsTrusted:  true,
			},
			c2.CID.String(): {
				Id:         c2.CID.String(),
				Author:     alice.Account.String(),
				CreateTime: timestamppb.New(c2.Decoded.(hyper.Change).HLCTime.Time()),
				Deps:       []string{c1.CID.String()},
				IsTrusted:  true,
			},
		},
		LatestPublicVersion:  c2.CID.String(),
		LatestTrustedVersion: c2.CID.String(),
		ChangesByTime:        []string{c1.CID.String(), c2.CID.String()},
	}

	timeline, err := api.GetEntityTimeline(ctx, &entities.GetEntityTimelineRequest{Id: string(e.ID())})
	require.NoError(t, err)

	testutil.ProtoEqual(t, want, timeline, "timeline must match")
}
