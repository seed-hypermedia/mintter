// Package entities implements the Entities API.
package entities

import (
	"context"
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
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Server implements Entities API.
type Server struct {
	blobs *hyper.Storage
}

// NewServer creates a new entities server.
func NewServer(blobs *hyper.Storage) *Server {
	return &Server{
		blobs: blobs,
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
		CreateTime: timestamppb.New(hlc.Unpack(info.HDChangesHlcTime).Time()),
		IsTrusted:  info.IsTrusted > 0,
	}

	deps, err := hypersql.ChangesGetDeps(conn, info.HDChangesBlob)
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
		if eid.HDEntitiesID == 0 {
			return errutil.NotFound("no such entity %s", in.Id)
		}

		changes, err := hypersql.ChangesInfoForEntity(conn, eid.HDEntitiesID)
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
				CreateTime: timestamppb.New(hlc.Unpack(ch.HDChangesHlcTime).Time()),
				IsTrusted:  ch.IsTrusted > 0,
			}
			heads[cs] = struct{}{}
			out.ChangesByTime = append(out.ChangesByTime, cs)

			deps, err := hypersql.ChangesGetDeps(conn, ch.HDChangesBlob)
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

		slices.SortFunc(out.ChangesByTime, func(a, b string) bool {
			return out.Changes[a].CreateTime.AsTime().Before(out.Changes[b].CreateTime.AsTime())
		})

		return nil
	}); err != nil {
		return nil, err
	}

	return out, nil
}
