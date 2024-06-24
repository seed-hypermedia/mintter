// Package documents provides the implementation of the Documents gRPC API.
package documents

import (
	"bytes"
	"context"
	"encoding/hex"
	"fmt"
	"math"
	"seed/backend/core"
	"seed/backend/daemon/api/documents/v1alpha/docmodel"
	"seed/backend/daemon/apiutil"
	documents "seed/backend/genproto/documents/v1alpha"
	"seed/backend/hlc"
	"seed/backend/mttnet"
	"strings"
	"time"

	"seed/backend/hyper"
	"seed/backend/hyper/hypersql"
	"seed/backend/logging"
	"seed/backend/pkg/dqb"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Discoverer is a subset of the syncing service that
// is able to discover given Hyper media objects, optionally specifying versions.
type Discoverer interface {
	DiscoverObject(context.Context, hyper.EntityID, hyper.Version) error
	// TODO: this is here temporarily. Eventually we need to provide from the vcs
	// so every time we save a main version, we need to provide the leaf changes.
	ProvideCID(cid.Cid) error
	Connect(context.Context, peer.AddrInfo) error
}

// GatewayClient used to connect to the gateway and push content.
type GatewayClient interface {
	// GatewayClient used to connect to the gateway and push content.
	GatewayClient(context.Context, string) (mttnet.GatewayClient, error)
}

// Server implements DocumentsServer gRPC API.
type Server struct {
	db       *sqlitex.Pool
	keys     core.KeyStore
	disc     Discoverer
	blobs    *hyper.Storage
	gwClient GatewayClient
}

// NewServer creates a new RPC handler.
func NewServer(keys core.KeyStore, db *sqlitex.Pool, disc Discoverer, gwClient GatewayClient, LogLevel string) *Server {
	srv := &Server{
		db:       db,
		keys:     keys,
		disc:     disc,
		blobs:    hyper.NewStorage(db, logging.New("seed/hyper", LogLevel)),
		gwClient: gwClient,
	}

	return srv
}

// RegisterServer registers the server with the gRPC server.
func (srv *Server) RegisterServer(rpc grpc.ServiceRegistrar) {
	documents.RegisterContentGraphServer(rpc, srv)
	documents.RegisterDraftsServer(rpc, srv)
	documents.RegisterPublicationsServer(rpc, srv)
	documents.RegisterChangesServer(rpc, srv)
	documents.RegisterCommentsServer(rpc, srv)
	documents.RegisterMergeServer(rpc, srv)
}

// CreateDraft implements the corresponding gRPC method.
func (api *Server) CreateDraft(ctx context.Context, in *documents.CreateDraftRequest) (out *documents.Document, err error) {
	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	if in.ExistingDocumentId != "" {
		eid := hyper.EntityID(in.ExistingDocumentId)

		_, err := api.blobs.FindDraft(ctx, eid)
		if err == nil {
			return nil, status.Errorf(codes.FailedPrecondition, "draft for %s already exists", in.ExistingDocumentId)
		}

		var entity *hyper.Entity
		if in.Version == "" {
			entity, err = api.blobs.LoadEntity(ctx, eid)
			if err != nil {
				return nil, err
			}
		} else {
			heads, err := hyper.Version(in.Version).Parse()
			if err != nil {
				return nil, status.Errorf(codes.InvalidArgument, "unable to parse version %s: %v", in.Version, err)
			}

			entity, err = api.blobs.LoadEntityFromHeads(ctx, eid, heads...)
			if err != nil {
				return nil, err
			}
		}

		del, err := api.getDelegation(ctx)
		if err != nil {
			return nil, err
		}

		hb, err := entity.CreateChange(entity.NextTimestamp(), me.DeviceKey(), del, map[string]any{
			// Using the dummy field which will be cleared in future updates,
			// because all changes must have patches.
			"isDraft": true,
		}, hyper.WithAction("Update"))
		if err != nil {
			return nil, err
		}

		if err := api.blobs.SaveDraftBlob(ctx, eid, hb); err != nil {
			return nil, err
		}

		return api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: in.ExistingDocumentId})
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	dm, err := docmodel.Create(me, del)
	if err != nil {
		return nil, err
	}

	_, err = dm.Commit(ctx, api.blobs)
	if err != nil {
		return nil, err
	}

	return api.GetDraft(ctx, &documents.GetDraftRequest{
		DocumentId: string(dm.Entity().ID()),
	})
}

// UpdateDraft implements the corresponding gRPC method.
func (api *Server) UpdateDraft(ctx context.Context, in *documents.UpdateDraftRequest) (*documents.UpdateDraftResponse, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID")
	}

	if in.Changes == nil {
		return nil, status.Errorf(codes.InvalidArgument, "must send some changes to apply to the document")
	}

	me, err := api.keys.GetKey(ctx, "main")
	if err != nil {
		return nil, err
	}

	eid := hyper.EntityID(in.DocumentId)

	draft, err := api.blobs.LoadDraft(ctx, eid)
	if err != nil {
		return nil, err
	}
	if draft == nil {
		return nil, status.Errorf(codes.NotFound, "no draft for entity %s", eid)
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	mut, err := docmodel.New(draft.Entity, me, del)
	if err != nil {
		return nil, err
	}

	if err := mut.RestoreDraft(draft.CID, draft.Change); err != nil {
		return nil, fmt.Errorf("failed to restore draft: %w", err)
	}

	for _, op := range in.Changes {
		switch o := op.Op.(type) {
		case *documents.DocumentChange_SetTitle:
			if err := mut.SetTitle(o.SetTitle); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_MoveBlock_:
			if err := mut.MoveBlock(o.MoveBlock.BlockId, o.MoveBlock.Parent, o.MoveBlock.LeftSibling); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_DeleteBlock:
			if err := mut.DeleteBlock(o.DeleteBlock); err != nil {
				return nil, err
			}
		case *documents.DocumentChange_ReplaceBlock:
			if err := mut.ReplaceBlock(o.ReplaceBlock); err != nil {
				return nil, err
			}
		default:
			panic("BUG: unhandled document change")
		}
	}

	blob, err := mut.Commit(ctx, api.blobs)
	if err != nil {
		return nil, err
	}

	updated, err := api.GetDraft(ctx, &documents.GetDraftRequest{DocumentId: in.DocumentId})
	if err != nil {
		return nil, fmt.Errorf("failed to get draft after applying update: %w", err)
	}

	return &documents.UpdateDraftResponse{
		ChangeId:        blob.CID.String(),
		UpdatedDocument: updated,
	}, nil
}

// GetDraft implements the corresponding gRPC method.
func (api *Server) GetDraft(ctx context.Context, in *documents.GetDraftRequest) (*documents.Document, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID to get the draft")
	}

	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	eid := hyper.EntityID(in.DocumentId)

	entity, err := api.blobs.LoadDraftEntity(ctx, eid)
	if err != nil {
		return nil, err
	}
	if entity == nil {
		return nil, status.Errorf(codes.NotFound, "not found draft for entity %s", eid)
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	mut, err := docmodel.New(entity, me.DeviceKey(), del)
	if err != nil {
		return nil, err
	}

	return mut.Hydrate(ctx, api.blobs)
}

// ListDrafts implements the corresponding gRPC method.
func (api *Server) ListDrafts(ctx context.Context, req *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	if err := apiutil.ValidatePageSize(&req.PageSize); err != nil {
		return nil, err
	}

	type Cursor struct {
		Ts       int64 `json:"t"`
		Resource int64 `json:"r"`
	}

	var cursor Cursor
	if req.PageToken == "" {
		cursor.Ts = math.MaxInt64
		cursor.Resource = math.MaxInt64
	} else {
		if err := apiutil.DecodePageToken(req.PageToken, &cursor, me.DeviceKey()); err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "%v", err)
		}
	}

	resp := &documents.ListDraftsResponse{}

	if err := api.db.WithSave(ctx, func(conn *sqlite.Conn) error {
		var (
			count      int32
			lastCursor Cursor
		)
		return sqlitex.Exec(conn, qListAllDrafts(), func(stmt *sqlite.Stmt) error {
			// This is necessary to always return empty page token when we reach the last result.
			if count == req.PageSize {
				var err error
				resp.NextPageToken, err = apiutil.EncodePageToken(lastCursor, me.DeviceKey())
				return err
			}
			count++

			var (
				iri            = stmt.ColumnText(0)
				createTime     = stmt.ColumnInt64(1)
				updateTime     = stmt.ColumnInt64(2)
				author         = stmt.ColumnBytesUnsafe(3)
				editors        = strings.Split(stmt.ColumnText(4), ",")
				meta           = stmt.ColumnText(5)
				cursorResource = stmt.ColumnInt64(6)
			)

			lastCursor.Resource = cursorResource
			lastCursor.Ts = updateTime

			for i, x := range editors {
				data, err := hex.DecodeString(x)
				if err != nil {
					return fmt.Errorf("failed to decode editor: %w", err)
				}

				editors[i] = core.Principal(data).String()
			}

			doc := &documents.Document{
				Id:         iri,
				Title:      meta,
				Author:     core.Principal(author).String(),
				Editors:    editors,
				CreateTime: timestamppb.New(time.Unix(createTime, 0)),
				UpdateTime: timestamppb.New(hlc.Timestamp(updateTime).Time()),
			}

			resp.Documents = append(resp.Documents, doc)

			return nil
		}, cursor.Ts, cursor.Resource, req.PageSize)
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

var qListAllDrafts = dqb.Str(`
	WITH RECURSIVE
	-- Finding the drafts we want, sorted as desired in the output,
	-- and filtered out to find the requested page.
	subset AS (
		SELECT structural_blobs.*
		FROM drafts
		JOIN structural_blobs ON structural_blobs.id = drafts.blob
		WHERE structural_blobs.ts < :cursor_ts AND drafts.resource < :cursor_resource
		ORDER BY structural_blobs.ts DESC, structural_blobs.resource DESC
		LIMIT :page_size + 1
	),
	-- Resolving the DAG of changes for each document
	-- starting from the draft changes and following the dependency links.
	cset AS (
		SELECT * FROM subset
		UNION
		SELECT structural_blobs.*
		FROM structural_blobs
		JOIN blob_links ON blob_links.target = structural_blobs.id
		JOIN cset ON cset.id = blob_links.source
		WHERE blob_links.type = 'change/dep'
	)
	-- Reducing the DAG of changes for each document to get the current state.
	SELECT
		resources.iri AS iri,
		resources.create_time AS create_time,
		MAX(cset.ts) AS update_time,
		authors.principal AS author,
		GROUP_CONCAT(DISTINCT HEX(public_keys.principal)) AS editors,
		-- CRDT conflict resolution: greatest timestamp wins, greatest public key is a tie-breaker.
		(JSONB_GROUP_ARRAY(cset.meta ORDER BY ts DESC, public_keys.principal DESC) FILTER (WHERE cset.meta IS NOT NULL))->>'0' AS meta,
		MAX(resources.id) AS cursor_resource
	FROM cset
	JOIN public_keys ON public_keys.id = cset.author
	JOIN resources ON resources.id = cset.resource
	JOIN public_keys authors ON authors.id = resources.owner
	GROUP BY resource
	ORDER BY update_time DESC, resources.id DESC;
`)

func (api *Server) ListDocumentDrafts(ctx context.Context, in *documents.ListDocumentDraftsRequest) (*documents.ListDocumentDraftsResponse, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID to get the draft")
	}

	resp := &documents.ListDocumentDraftsResponse{}

	if err := api.db.WithSave(ctx, func(conn *sqlite.Conn) error {
		edb, err := hypersql.EntitiesLookupID(conn, in.DocumentId)
		if err != nil {
			return err
		}
		if edb.ResourcesID == 0 {
			return status.Errorf(codes.NotFound, "document %s not found", in.DocumentId)
		}

		return sqlitex.Exec(conn, qListDocumentDrafts(), func(stmt *sqlite.Stmt) error {
			var (
				createTime = stmt.ColumnInt64(0)
				updateTime = stmt.ColumnInt64(1)
				author     = stmt.ColumnBytesUnsafe(2)
				editors    = strings.Split(stmt.ColumnText(3), ",")
				meta       = stmt.ColumnText(4)
			)
			for i, x := range editors {
				data, err := hex.DecodeString(x)
				if err != nil {
					return fmt.Errorf("failed to decode editor: %w", err)
				}

				editors[i] = core.Principal(data).String()
			}

			doc := &documents.Document{
				Id:         in.DocumentId,
				Title:      meta,
				Author:     core.Principal(author).String(),
				Editors:    editors,
				CreateTime: timestamppb.New(time.Unix(createTime, 0)),
				UpdateTime: timestamppb.New(hlc.Timestamp(updateTime).Time()),
			}

			resp.Drafts = append(resp.Drafts, doc)

			return err
		}, edb.ResourcesID)
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

var qListDocumentDrafts = dqb.Str(`
	WITH RECURSIVE
	-- Resolve the change DAG starting from the draft change for a given resource.
	cset (id) AS (
		SELECT blob FROM drafts
		WHERE resource = :resource
		UNION
		SELECT blob_links.target
		FROM blob_links
		JOIN cset ON cset.id = blob_links.source AND blob_links.type = 'change/dep'
	)
	-- Process the resolved change DAG to get the current state of the resource.
	SELECT
		resources.create_time AS create_time,
		MAX(sb.ts) AS update_time,
		authors.principal AS author,
		GROUP_CONCAT(DISTINCT HEX(editors.principal)) AS editors,
		(JSONB_GROUP_ARRAY(sb.meta ORDER BY ts DESC, editors.principal DESC) FILTER (WHERE sb.meta IS NOT NULL))->>'0' AS meta
	FROM cset
	JOIN structural_blobs sb ON sb.id = cset.id
	JOIN resources ON resources.id = sb.resource
	JOIN public_keys editors ON editors.id = sb.author
	JOIN public_keys authors ON authors.id = resources.owner
	GROUP BY sb.resource
	ORDER BY update_time DESC, resources.id DESC;
`)

// PublishDraft implements the corresponding gRPC method.
func (api *Server) PublishDraft(ctx context.Context, in *documents.PublishDraftRequest) (*documents.Publication, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID to get the draft")
	}

	eid := hyper.EntityID(in.DocumentId)

	oid, err := eid.CID()
	if err != nil {
		return nil, fmt.Errorf("failed to convert document to CID: %w", err)
	}

	ch, err := api.blobs.GetDraft(ctx, eid)
	if err != nil {
		return nil, err
	}

	// The isDraft field should only be there when draft doesn't have any other content changed.
	_, isDraft := ch.Patch["isDraft"]
	if len(ch.Patch) > 1 && isDraft {
		return nil, fmt.Errorf("BUG: isDraft field wasn't removed")
	}

	// When the draft doesn't actually have meaningful changes,
	// we don't want to fail, nor do we want to publish it,
	// so instead we act as if we published something, but return the previous version instead,
	// while deleting the current draft.
	if len(ch.Patch) <= 1 && isDraft {
		if err := api.blobs.DeleteDraft(ctx, eid); err != nil {
			return nil, fmt.Errorf("failed to delete empty draft when publishing: %w", err)
		}
		prev := hyper.NewVersion(ch.Deps...)
		return api.GetPublication(ctx, &documents.GetPublicationRequest{
			DocumentId: in.DocumentId,
			Version:    prev.String(),
			LocalOnly:  true,
		})
	}

	c, err := api.blobs.PublishDraft(ctx, eid)
	if err != nil {
		return nil, err
	}

	if api.disc != nil {
		if err := api.disc.ProvideCID(oid); err != nil {
			return nil, err
		}
	}

	return api.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: in.DocumentId,
		Version:    c.String(),
		LocalOnly:  true,
	})
}

// DeleteDraft implements the corresponding gRPC method.
func (api *Server) DeleteDraft(ctx context.Context, in *documents.DeleteDraftRequest) (*emptypb.Empty, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify draft ID to delete")
	}

	eid := hyper.EntityID(in.DocumentId)

	if err := api.blobs.DeleteDraft(ctx, eid); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

// GetPublication implements the corresponding gRPC method.
func (api *Server) GetPublication(ctx context.Context, in *documents.GetPublicationRequest) (docpb *documents.Publication, err error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify document ID to get the draft")
	}

	eid := hyper.EntityID(in.DocumentId)
	version := hyper.Version(in.Version)

	pub, err := api.loadPublication(ctx, eid, version)
	if err == nil {
		return pub, nil
	}

	// We can only attempt to handle not found errors.
	if status.Code(err) != codes.NotFound {
		return nil, err
	}

	// If no discoverer is set we can't do anything else.
	if api.disc == nil {
		return nil, err
	}

	// We should only attempt to discover publication if didn't specify local only.
	if in.LocalOnly {
		return nil, err
	}

	// TODO(burdiyan): if we are doing the discovery without a version,
	// we'll wait until timeout because we don't know when to stop looking.
	// Ideally we should only be discovering docs with specific version,
	// but sometimes we don't want the latest version we can possibly find.
	// In those cases, we could at least optimize the UI, and maybe display
	// the document dynamically as we're finding it. Although that would require
	// a lot of trickery between frontend and backend, it would optimize
	// time to the first (more or less) meaningful result.
	if err := api.disc.DiscoverObject(ctx, eid, version); err != nil {
		return nil, status.Errorf(codes.NotFound, "failed to discover object %q at version %q: %s", eid, version, err.Error())
	}

	return api.loadPublication(ctx, eid, version)
}

func (api *Server) loadPublication(ctx context.Context, docid hyper.EntityID, version hyper.Version) (docpb *documents.Publication, err error) {
	var entity *hyper.Entity
	if version != "" {
		heads, err := hyper.Version(version).Parse()
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "bad version: %v", err)
		}

		entity, err = api.blobs.LoadEntityFromHeads(ctx, docid, heads...)
		if err != nil {
			return nil, err
		}
	} else {
		entity, err = api.blobs.LoadEntity(ctx, docid)
		if err != nil {
			return nil, err
		}
	}
	if entity == nil {
		return nil, status.Errorf(codes.NotFound, "no published changes for entity %s", docid)
	}

	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	mut, err := docmodel.New(entity, me.DeviceKey(), del)
	if err != nil {
		return nil, err
	}

	doc, err := mut.Hydrate(ctx, api.blobs)
	if err != nil {
		return nil, err
	}
	doc.PublishTime = doc.UpdateTime

	return &documents.Publication{
		Document: doc,
		Version:  doc.Version,
	}, nil
}

// PushPublication implements the corresponding gRPC method.
func (api *Server) PushPublication(ctx context.Context, in *documents.PushPublicationRequest) (*emptypb.Empty, error) {
	panic("TODO push publication")

	// if in.DocumentId == "" {
	// 	return nil, status.Errorf(codes.InvalidArgument, "must specify publication ID")
	// }

	// if in.Url == "" {
	// 	return nil, status.Errorf(codes.InvalidArgument, "must specify an url")
	// }

	// // If no gwClient is set we can't do anything else.
	// if api.gwClient == nil {
	// 	return nil, status.Errorf(codes.FailedPrecondition, "there is no gwClient definition")
	// }

	// eid := hyper.EntityID(in.DocumentId)

	// entity, err := api.blobs.LoadEntity(ctx, eid)

	// if err != nil {
	// 	return nil, status.Errorf(codes.Internal, "unable to get entity[%s]: %v", eid.String(), err)
	// }

	// if entity == nil {
	// 	return nil, status.Errorf(codes.NotFound, "no published changes for entity %s", eid.String())
	// }

	// conn, cancelFcn, err := api.db.Conn(ctx)
	// if err != nil {
	// 	return nil, status.Errorf(codes.Internal, "unable to get db connection: %v", err)
	// }
	// defer cancelFcn()

	// gdb, err := hypersql.EntitiesLookupID(conn, entity.ID().String())
	// if err != nil {
	// 	return nil, status.Errorf(codes.NotFound, "unable to find entity id [%s]: %v", entity.ID().String(), err)
	// }
	// if gdb.ResourcesID == 0 {
	// 	return nil, status.Errorf(codes.NotFound, "document %s not found", entity.ID().String())
	// }

	// cids := []cid.Cid{}
	// err = sqlitex.Exec(conn, groups.QCollectBlobs(), func(stmt *sqlite.Stmt) error {
	// 	var (
	// 		id        int64
	// 		codec     int64
	// 		multihash []byte
	// 	)
	// 	stmt.Scan(&id, &codec, &multihash)

	// 	c := cid.NewCidV1(uint64(codec), multihash)
	// 	cids = append(cids, c)
	// 	return nil
	// }, gdb.ResourcesID)
	// if err != nil {
	// 	return nil, status.Errorf(codes.NotFound, "couldn't find referenced materials for document %s: %v", entity.ID().String(), err)
	// }

	// gc, err := api.gwClient.GatewayClient(ctx, in.Url)
	// if err != nil {
	// 	return nil, status.Errorf(codes.Internal, "failed to get site client: %v", err)
	// }

	// if _, err := gc.PublishBlobs(ctx, &groups_proto.PublishBlobsRequest{
	// 	Blobs: colx.SliceMap(cids, cid.Cid.String),
	// }); err != nil {
	// 	return nil, status.Errorf(codes.FailedPrecondition, "failed to push blobs to the gateway: %v", err)
	// }
	// return &emptypb.Empty{}, nil
}

var qListAllPublications = dqb.Str(`
	WITH RECURSIVE
	-- Selecting owner's changes for each document, and resolving their dependencies.
	cset (blob, author, ts, resource, meta, iri, create_time, owner) AS (
		-- Selecting owner's changes that are not drafts.
		SELECT
			sb.id,
			sb.author,
			sb.ts,
			sb.resource,
			sb.meta,
			resources.iri,
			resources.create_time,
			resources.owner
		FROM resources
		JOIN structural_blobs sb ON sb.resource = resources.id AND resources.owner = sb.author
		LEFT JOIN drafts ON drafts.blob = sb.id
		WHERE resources.iri GLOB 'hm://d/*'
		AND drafts.blob IS NULL
		UNION
		-- Resolving the dependencies.
		SELECT
			sb.id,
			sb.author,
			sb.ts,
			sb.resource,
			sb.meta,
			cset.iri,
			cset.create_time,
			cset.owner
		FROM blob_links
		JOIN cset ON cset.blob = blob_links.source AND blob_links.type = 'change/dep'
		JOIN structural_blobs sb ON sb.id = blob_links.target AND sb.resource = cset.resource
	)
	-- Processing the changes grouping by resource.
	SELECT
		cset.iri AS iri,
		cset.create_time AS create_time,
		MAX(cset.ts) AS update_time,
		owners.principal AS author,
		GROUP_CONCAT(DISTINCT HEX(editors.principal)) AS editors,
		-- CRDT conflict resolution: greatest timestamp wins, greatest public key is a tie-breaker.
		(JSONB_GROUP_ARRAY(cset.meta ORDER BY cset.ts DESC, editors.principal DESC) FILTER (WHERE cset.meta IS NOT NULL))->>'0' AS meta
	FROM cset
	JOIN public_keys owners ON owners.id = cset.owner
	JOIN public_keys editors ON editors.id = cset.author
	GROUP BY resource HAVING (update_time < :cursor_update_time AND iri < :cursor_iri)
	ORDER BY update_time DESC, iri DESC
	LIMIT :page_size + 1;
`)

var qListTrustedPublications = dqb.Str(`
	WITH RECURSIVE
	-- Selecting owner's changes for each document, and resolving their dependencies.
	cset (blob, author, ts, resource, meta, iri, create_time, owner) AS (
		-- Selecting owner's changes that are not drafts.
		SELECT
			sb.id,
			sb.author,
			sb.ts,
			sb.resource,
			sb.meta,
			resources.iri,
			resources.create_time,
			resources.owner
		FROM resources
		JOIN trusted_accounts ON trusted_accounts.id = resources.owner
		JOIN structural_blobs sb ON sb.resource = resources.id AND resources.owner = sb.author
		LEFT JOIN drafts ON drafts.blob = sb.id
		WHERE resources.iri GLOB 'hm://d/*'
		AND drafts.blob IS NULL
		UNION
		-- Resolving the dependencies.
		SELECT
			sb.id,
			sb.author,
			sb.ts,
			sb.resource,
			sb.meta,
			cset.iri,
			cset.create_time,
			cset.owner
		FROM blob_links
		JOIN cset ON cset.blob = blob_links.source AND blob_links.type = 'change/dep'
		JOIN structural_blobs sb ON sb.id = blob_links.target AND sb.resource = cset.resource
	)
	-- Processing the changes grouping by resource.
	SELECT
		cset.iri AS iri,
		cset.create_time AS create_time,
		MAX(cset.ts) AS update_time,
		owners.principal AS author,
		GROUP_CONCAT(DISTINCT HEX(editors.principal)) AS editors,
		-- CRDT conflict resolution: greatest timestamp wins, greatest public key is a tie-breaker.
		(JSONB_GROUP_ARRAY(cset.meta ORDER BY cset.ts DESC, editors.principal DESC) FILTER (WHERE cset.meta IS NOT NULL))->>'0' AS meta
	FROM cset
	JOIN public_keys owners ON owners.id = cset.owner
	JOIN public_keys editors ON editors.id = cset.author
	GROUP BY resource HAVING (update_time < :cursor_update_time AND iri < :cursor_iri)
	ORDER BY update_time DESC, iri DESC
	LIMIT :page_size + 1;
`)

// ListPublications implements the corresponding gRPC method.
func (api *Server) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	if err := apiutil.ValidatePageSize(&in.PageSize); err != nil {
		return nil, err
	}

	type Cursor struct {
		UpdateTime int64  `json:"u"`
		IRI        string `json:"i"`
	}

	var cursor Cursor
	if in.PageToken == "" {
		cursor.UpdateTime = math.MaxInt64
		cursor.IRI = string([]rune{0xFFFF}) // Max string.
	} else {
		if err := apiutil.DecodePageToken(in.PageToken, &cursor, nil); err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "%v", err)
		}
	}

	resp := &documents.ListPublicationsResponse{}

	if err := api.db.WithSave(ctx, func(conn *sqlite.Conn) error {
		var (
			count      int32
			lastCursor Cursor
		)

		q := qListAllPublications
		if in.TrustedOnly {
			q = qListTrustedPublications
		}

		return sqlitex.Exec(conn, q(), func(stmt *sqlite.Stmt) error {
			if count == in.PageSize {
				var err error
				resp.NextPageToken, err = apiutil.EncodePageToken(lastCursor, nil)
				return err
			}
			count++

			var (
				iri        = stmt.ColumnText(0)
				createTime = stmt.ColumnInt64(1)
				updateTime = stmt.ColumnInt64(2)
				author     = stmt.ColumnBytesUnsafe(3)
				editors    = strings.Split(stmt.ColumnText(4), ",")
				meta       = stmt.ColumnText(5)
			)

			lastCursor.UpdateTime = updateTime
			lastCursor.IRI = iri

			for i, x := range editors {
				data, err := hex.DecodeString(x)
				if err != nil {
					return fmt.Errorf("failed to decode editor: %w", err)
				}
				editors[i] = core.Principal(data).String()
			}

			pub := &documents.Publication{
				Document: &documents.Document{
					Id:         iri,
					Title:      meta,
					Author:     core.Principal(author).String(),
					Editors:    editors,
					CreateTime: timestamppb.New(time.Unix(createTime, 0)),
					UpdateTime: timestamppb.New(hlc.Timestamp(updateTime).Time()),
				},
			}
			pub.Document.PublishTime = pub.Document.UpdateTime

			resp.Publications = append(resp.Publications, pub)

			return nil
		}, cursor.UpdateTime, cursor.IRI, in.PageSize)
	}); err != nil {
		return nil, err
	}

	return resp, nil
}

// ListAccountPublications implements the corresponding gRPC method.
func (api *Server) ListAccountPublications(ctx context.Context, in *documents.ListAccountPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	if in.AccountId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify account ID to list publications for")
	}

	acc, err := core.DecodePrincipal(in.AccountId)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid account ID: %v", err)
	}

	var accID int64
	var list []hypersql.EntitiesListByPrefixResult
	if err := api.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		list, err = hypersql.EntitiesListByPrefix(conn, "hm://d/*")
		if err != nil {
			return err
		}

		dbAccount, err := hypersql.PublicKeysLookupID(conn, acc)
		if err != nil {
			return err
		}

		accID = dbAccount.PublicKeysID
		return nil
	}); err != nil {
		return nil, err
	}

	out := &documents.ListPublicationsResponse{
		Publications: make([]*documents.Publication, 0, len(list)),
	}

	for _, x := range list {
		if x.ResourcesOwner != accID {
			continue
		}

		pub, err := api.GetPublication(ctx, &documents.GetPublicationRequest{
			DocumentId: x.ResourcesIRI,
			LocalOnly:  true,
		})
		if err != nil {
			continue
		}

		out.Publications = append(out.Publications, pub)
	}

	return out, nil
}

// MergeChanges implements the corresponding gRPC method. It merges changes and publishes them.
func (api *Server) MergeChanges(ctx context.Context, in *documents.MergeChangesRequest) (*documents.Publication, error) {
	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	if len(in.Versions) < 2 {
		return nil, fmt.Errorf("At least two versions are necessary for merging")
	}

	if in.Id == "" {
		return nil, fmt.Errorf("Document Id is a mandatory field")
	}

	allHeads := []cid.Cid{}
	for _, version := range in.Versions {
		heads, err := hyper.Version(version).Parse()
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "unable to parse version %s: %v", version, err)
		}
		allHeads = append(allHeads, heads...)
	}

	entity, err := api.blobs.LoadEntityFromHeads(ctx, hyper.EntityID(in.Id), allHeads...)
	if err != nil {
		return nil, err
	}

	if entity == nil {
		return nil, fmt.Errorf("nothing to merge, aborting")
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}
	hb, err := entity.CreateChange(entity.NextTimestamp(), me.DeviceKey(), del, nil, hyper.WithAction(hyper.ActionUpdate))

	if err != nil {
		return nil, err
	}

	if err := api.blobs.SaveBlob(ctx, hb); err != nil {
		return nil, err
	}

	oid, err := api.blobs.PublishBlob(ctx, hb.CID)
	if err != nil {
		return nil, err
	}

	if api.disc != nil {
		if err := api.disc.ProvideCID(oid); err != nil {
			return nil, err
		}
	}

	return api.GetPublication(ctx, &documents.GetPublicationRequest{
		DocumentId: entity.ID().String(),
		Version:    hb.CID.String(),
		LocalOnly:  true,
	})
}

// RebaseChanges implements the corresponding gRPC method.
func (api *Server) RebaseChanges(ctx context.Context, in *documents.RebaseChangesRequest) (*documents.Document, error) {
	me, err := api.getMe()
	if err != nil {
		return nil, err
	}

	del, err := api.getDelegation(ctx)
	if err != nil {
		return nil, err
	}

	allHeads := []cid.Cid{}
	draft, err := api.blobs.LoadDraft(ctx, hyper.EntityID(in.BaseDraftId))
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "Could not load draft with provided ID [%s]: %v", in.BaseDraftId, err)
	}

	for _, version := range in.Versions {
		heads, err := hyper.Version(version).Parse()
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "unable to parse version %s: %v", version, err)
		}
		allHeads = append(allHeads, heads...)
	}
	entity, err := api.blobs.LoadEntityFromHeads(ctx, hyper.EntityID(in.BaseDraftId), allHeads...)
	if err != nil {
		return nil, err
	}
	if entity == nil {
		return nil, fmt.Errorf("nothing to rebase, aborting")
	}

	_, err = entity.CreateChange(entity.NextTimestamp(), me.DeviceKey(), del, draft.Change.Patch)
	if err != nil {
		return nil, err
	}

	mut, err := docmodel.New(entity, me.DeviceKey(), del)
	if err != nil {
		return nil, err
	}

	return mut.Hydrate(ctx, api.blobs)
}

func (api *Server) getDelegation(ctx context.Context) (cid.Cid, error) {
	me, err := api.keys.GetKey(ctx, "main")
	if err != nil {
		return cid.Undef, err
	}

	var out cid.Cid

	// TODO(burdiyan): need to cache this. Makes no sense to always do this.
	if err := api.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		acc := me.Principal()
		dev := me.Principal()

		list, err := hypersql.KeyDelegationsList(conn, acc)
		if err != nil {
			return err
		}

		for _, res := range list {
			if bytes.Equal(dev, res.KeyDelegationsViewDelegate) {
				out = cid.NewCidV1(uint64(res.KeyDelegationsViewBlobCodec), res.KeyDelegationsViewBlobMultihash)
				return nil
			}
		}

		return nil
	}); err != nil {
		return cid.Undef, err
	}

	if !out.Defined() {
		return out, fmt.Errorf("BUG: failed to find our own key delegation")
	}

	return out, nil
}
