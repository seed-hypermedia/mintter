// Package entities implements the Entities API.
package entities

import (
	"context"
	"fmt"
	"mintter/backend/core"
	entities "mintter/backend/genproto/entities/v1alpha"
	"mintter/backend/hlc"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/pkg/errutil"
	"mintter/backend/pkg/maps"
	"sort"
	"strings"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"golang.org/x/exp/slices"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Discoverer is an interface for discovering objects.
type Discoverer interface {
	DiscoverObject(context.Context, hyper.EntityID, hyper.Version) error
}

// Server implements Entities API.
type Server struct {
	blobs *hyper.Storage
	disc  Discoverer
}

// NewServer creates a new entities server.
func NewServer(blobs *hyper.Storage, disc Discoverer) *Server {
	return &Server{
		blobs: blobs,
		disc:  disc,
	}
}

// GetChange implements the Changes server.
func (api *Server) GetChange(ctx context.Context, in *entities.GetChangeRequest) (out *entities.Change, err error) {
	if in.Id == "" {
		return nil, errutil.MissingArgument("id")
	}

	c, err := cid.Decode(in.Id)
	if err != nil {
		return nil, errutil.ParseError("id", in.Id, c, err)
	}

	if err := api.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		size, err := hypersql.BlobsGetSize(conn, c.Hash())
		if err != nil {
			return err
		}
		if size.BlobsSize < 0 {
			return errutil.NotFound("no such change %s", c)
		}

		out, err = getChange(conn, c, size.BlobsID)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return out, nil
}

func getChange(conn *sqlite.Conn, c cid.Cid, id int64) (*entities.Change, error) {
	var out *entities.Change
	info, err := hypersql.ChangesGetInfo(conn, id)
	if err != nil {
		return nil, err
	}

	out = &entities.Change{
		Id:         c.String(),
		Author:     core.Principal(info.PublicKeysPrincipal).String(),
		CreateTime: timestamppb.New(hlc.Unpack(info.StructuralBlobsTs).Time()),
		IsTrusted:  info.IsTrusted > 0,
	}

	deps, err := hypersql.ChangesGetDeps(conn, info.StructuralBlobsID)
	if err != nil {
		return nil, err
	}
	if len(deps) > 0 {
		out.Deps = make([]string, len(deps))
		for i, d := range deps {
			out.Deps[i] = cid.NewCidV1(uint64(d.BlobsCodec), d.BlobsMultihash).String()
		}
	}

	return out, nil
}

// GetEntityTimeline implements the Entities server.
func (api *Server) GetEntityTimeline(ctx context.Context, in *entities.GetEntityTimelineRequest) (*entities.EntityTimeline, error) {
	if in.Id == "" {
		return nil, errutil.MissingArgument("id")
	}

	out := &entities.EntityTimeline{
		Id: in.Id,
	}

	if err := api.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		eid, err := hypersql.EntitiesLookupID(conn, in.Id)
		if err != nil {
			return err
		}
		if eid.ResourcesID == 0 {
			return errutil.NotFound("no such entity %s", in.Id)
		}

		changes, err := hypersql.ChangesInfoForEntity(conn, eid.ResourcesID)
		if err != nil {
			return err
		}
		if len(changes) == 0 {
			return errutil.NotFound("no changes for entity %s", in.Id)
		}

		out.Changes = make(map[string]*entities.Change, len(changes))

		heads := map[string]struct{}{}
		for _, ch := range changes {
			c := cid.NewCidV1(uint64(ch.BlobsCodec), ch.BlobsMultihash)
			cs := c.String()
			chpb := &entities.Change{
				Id:         cs,
				Author:     core.Principal(ch.PublicKeysPrincipal).String(),
				CreateTime: timestamppb.New(hlc.Unpack(ch.StructuralBlobsTs).Time()),
				IsTrusted:  ch.IsTrusted > 0,
			}
			heads[cs] = struct{}{}
			out.ChangesByTime = append(out.ChangesByTime, cs)

			deps, err := hypersql.ChangesGetDeps(conn, ch.StructuralBlobsID)
			if err != nil {
				return err
			}
			if len(deps) > 0 {
				chpb.Deps = make([]string, len(deps))
				for i, d := range deps {
					ds := cid.NewCidV1(uint64(d.BlobsCodec), d.BlobsMultihash).String()
					delete(heads, ds)
					chpb.Deps[i] = ds
				}
			}
			out.Changes[cs] = chpb
		}
		publicHeads := maps.Keys(heads)
		sort.Strings(publicHeads)

		trusted := make(map[string]struct{}, len(publicHeads))
		queue := slices.Clone(publicHeads)
		for len(queue) > 0 {
			c := queue[0]
			queue = queue[1:]

			ch := out.Changes[c]
			if ch.IsTrusted {
				trusted[c] = struct{}{}
				continue
			}

			queue = append(queue, ch.Deps...)
		}

		trustedHeads := maps.Keys(trusted)
		sort.Strings(trustedHeads)

		out.LatestPublicVersion = strings.Join(publicHeads, ".")
		out.LatestTrustedVersion = strings.Join(trustedHeads, ".")

		slices.SortFunc(out.ChangesByTime, func(a, b string) int {
			at, bt := out.Changes[a].CreateTime.AsTime(), out.Changes[b].CreateTime.AsTime()

			if at.Equal(bt) {
				return 0
			}

			if at.Before(bt) {
				return -1
			}

			return +1
		})

		return nil
	}); err != nil {
		return nil, err
	}

	return out, nil
}

// DiscoverEntity implements the Entities server.
func (api *Server) DiscoverEntity(ctx context.Context, in *entities.DiscoverEntityRequest) (*entities.DiscoverEntityResponse, error) {
	if api.disc == nil {
		return nil, status.Errorf(codes.FailedPrecondition, "discovery is not enabled")
	}

	if in.Id == "" {
		return nil, errutil.MissingArgument("id")
	}

	ver := hyper.Version(in.Version)

	heads, err := ver.Parse()
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid version %q: %v", in.Version, err)
	}

	if err := api.disc.DiscoverObject(ctx, hyper.EntityID(in.Id), ver); err != nil {
		return nil, err
	}

	for _, h := range heads {
		ok, err := api.blobs.IPFSBlockstore().Has(ctx, h)
		if err != nil {
			return nil, fmt.Errorf("failed to check if block %s exists: %w", h, err)
		}
		if !ok {
			return nil, status.Errorf(codes.Unavailable, "discovery attempt failed: couldn't find the desired version %q", in.Version)
		}
	}

	return &entities.DiscoverEntityResponse{}, nil
}
