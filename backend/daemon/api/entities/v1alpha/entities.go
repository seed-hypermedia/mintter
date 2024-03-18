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
	"mintter/backend/pkg/colx"
	"mintter/backend/pkg/dqb"
	"mintter/backend/pkg/errutil"
	"sort"
	"strconv"
	"strings"

	"github.com/lithammer/fuzzysearch/fuzzy"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
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
		CreateTime: timestamppb.New(hlc.Timestamp(info.StructuralBlobsTs).Time()),
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

	// Prepare the response that will be filled in later.
	out := &entities.EntityTimeline{
		Id:      in.Id,
		Changes: make(map[string]*entities.Change),
	}

	// Initialize some lookup tables and indexes.
	var (
		// Lookup for short database IDs to CID strings.
		changeLookup = make(map[int64]string)

		// Lookup for short database IDs to account IDs.
		accountLookup = make(map[int64]string)

		accounts colx.SmallSet[string]

		// Set of leaf changes in the entire DAG.
		heads colx.SmallSet[string]

		headsByAuthor = make(map[string]*colx.SmallSet[string])

		// Queue for doing tree traversal to find author heads.
		queue [][]string
	)

	if err := api.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		edb, err := hypersql.EntitiesLookupID(conn, in.Id)
		if err != nil {
			return err
		}
		if edb.ResourcesID == 0 {
			return errutil.NotFound("no such entity %s", in.Id)
		}

		// Process all the changes and their deps.
		if err := sqlitex.Exec(conn, qGetEntityTimeline(), func(stmt *sqlite.Stmt) error {
			var (
				idShort     = stmt.ColumnInt64(0)
				codec       = stmt.ColumnInt64(1)
				hash        = stmt.ColumnBytesUnsafe(2)
				ts          = stmt.ColumnInt64(3)
				isTrusted   = stmt.ColumnInt(4)
				authorID    = stmt.ColumnInt64(5)
				authorBytes = stmt.ColumnBytesUnsafe(6)
				deps        = stmt.ColumnText(7)
			)

			idLong := cid.NewCidV1(uint64(codec), hash).String()
			changeLookup[idShort] = idLong

			// The database query already sorts by timestamp,
			// so we can just append.
			out.ChangesByTime = append(out.ChangesByTime, idLong)

			author, ok := accountLookup[authorID]
			if !ok {
				author = core.Principal(authorBytes).String()
				accountLookup[authorID] = author
			}

			accounts.Put(author)

			if _, ok := headsByAuthor[author]; !ok {
				headsByAuthor[author] = &colx.SmallSet[string]{}
			}

			change := &entities.Change{
				Id:         idLong,
				Author:     author,
				CreateTime: timestamppb.New(hlc.Timestamp(ts).Time()),
				IsTrusted:  isTrusted > 0,
			}

			if deps == "" {
				out.Roots = append(out.Roots, idLong)
			} else {
				depsShort := strings.Fields(deps)
				change.Deps = make([]string, len(depsShort))
				for i, depShort := range depsShort {
					depInt, err := strconv.Atoi(depShort)
					if err != nil {
						return fmt.Errorf("failed to parse dep %q as int: %w", depShort, err)
					}
					depLong, ok := changeLookup[int64(depInt)]
					if !ok {
						return fmt.Errorf("missing causal dependency lookup %q for change %q", depShort, idLong)
					}

					change.Deps[i] = depLong
					out.Changes[depLong].Children = append(out.Changes[depLong].Children, idLong)
					heads.Delete(depLong)
				}
			}

			heads.Put(idLong)
			out.Changes[idLong] = change

			// Iterate over author heads, and find path to the current change
			// if found remove the head
			// in the end add this change to the authors head
			authorHeads := headsByAuthor[author]
			for _, head := range authorHeads.Slice() {
				if isDescendant(out, queue, head, idLong) {
					authorHeads.Delete(head)
				}
			}

			authorHeads.Put(idLong)
			return nil
		}, edb.ResourcesID); err != nil {
			return err
		}

		// Sometimes we know about a document from a link,
		// but don't have any changes for it. We don't want this to be an error,
		// so we just stop further processing and return an empty timeline.
		if len(changeLookup) == 0 {
			return nil
		}

		owner, ok := accountLookup[edb.ResourcesOwner]
		if !ok {
			return fmt.Errorf("BUG: missing owner for entity %q after processing the timeline", in.Id)
		}

		out.Owner = owner
		out.Heads = sortChanges(out, heads.Slice())

		for _, author := range accounts.Slice() {
			av := &entities.AuthorVersion{
				Author: author,
				Heads:  sortChanges(out, headsByAuthor[author].Slice()),
			}
			av.Version = strings.Join(av.Heads, ".")
			av.VersionTime = out.Changes[av.Heads[len(av.Heads)-1]].CreateTime
			out.AuthorVersions = append(out.AuthorVersions, av)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return out, nil
}

var qGetEntityTimeline = dqb.Str(`
	SELECT
		structural_blobs.id,
		blobs.codec,
		blobs.multihash,
		structural_blobs.ts,
		trusted_accounts.id > 0 AS is_trusted,
		public_keys.id AS author_id,
		public_keys.principal AS author,
		group_concat(change_deps.parent, ' ') AS deps
	FROM structural_blobs
	JOIN blobs INDEXED BY blobs_metadata ON blobs.id = structural_blobs.id
	JOIN public_keys ON public_keys.id = structural_blobs.author
	LEFT JOIN change_deps ON change_deps.child = structural_blobs.id
	LEFT JOIN drafts ON (drafts.resource, drafts.blob) = (structural_blobs.resource, structural_blobs.id)
	LEFT JOIN trusted_accounts ON trusted_accounts.id = structural_blobs.author
	WHERE structural_blobs.resource IS NOT NULL
		AND structural_blobs.type = 'Change'
		AND structural_blobs.resource = :resource
		AND drafts.blob IS NULL
	GROUP BY change_deps.child
	ORDER BY structural_blobs.ts
`)

func sortChanges(timeline *entities.EntityTimeline, heads []string) []string {
	slices.SortFunc(heads, func(a, b string) int {
		aa := timeline.Changes[a]
		bb := timeline.Changes[b]

		at := aa.CreateTime.AsTime()
		bt := bb.CreateTime.AsTime()

		if at.Equal(bt) {
			return strings.Compare(aa.Author, bb.Author)
		}

		if at.Before(bt) {
			return -1
		}

		return +1
	})

	return heads
}

func isDescendant(timeline *entities.EntityTimeline, queue [][]string, parent, descendant string) bool {
	queue = queue[:0]
	queue = append(queue, timeline.Changes[parent].Children)

	for len(queue) > 0 {
		nodes := queue[len(queue)-1]
		queue = queue[:len(queue)-1]
		for _, node := range nodes {
			if node == descendant {
				return true
			}
			children := timeline.Changes[node].Children
			if len(children) > 0 {
				queue = append(queue, children)
			}
		}
	}

	return false
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

// SearchEntities implements the Fuzzy search of entities.
func (api *Server) SearchEntities(ctx context.Context, in *entities.SearchEntitiesRequest) (*entities.SearchEntitiesResponse, error) {
	var titles []string
	var iris []string
	var owners []string
	const limit = 30
	if err := api.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		err := sqlitex.Exec(conn, qGetEntityTitles(), func(stmt *sqlite.Stmt) error {
			titles = append(titles, stmt.ColumnText(0))
			iris = append(iris, stmt.ColumnText(1))
			ownerID := core.Principal(stmt.ColumnBytes(2)).String()
			owners = append(owners, ownerID)
			return nil
		})
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}
	ranks := fuzzy.RankFindNormalizedFold(in.Query, titles)
	sort.Slice(ranks, func(i, j int) bool {
		return ranks[i].Distance < ranks[j].Distance
	})
	matchingEntities := []*entities.Entity{}
	for i, rank := range ranks {
		if i >= limit {
			break
		}
		matchingEntities = append(matchingEntities, &entities.Entity{
			Id:    iris[rank.OriginalIndex],
			Title: rank.Target,
			Owner: owners[rank.OriginalIndex]})
	}
	return &entities.SearchEntitiesResponse{Entities: matchingEntities}, nil
}

var qGetEntityTitles = dqb.Str(`
	SELECT meta, iri, principal
	FROM meta_view;`)
