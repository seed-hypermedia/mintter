// Package documents provides the implementation of the Documents gRPC API.
package documents

import (
	"bytes"
	"context"
	"encoding/hex"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/daemon/api/documents/v1alpha/docmodel"
	groups "mintter/backend/daemon/api/groups/v1alpha"
	documents "mintter/backend/genproto/documents/v1alpha"
	groups_proto "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/mttnet"
	"strings"
	"time"

	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/logging"
	"mintter/backend/pkg/colx"
	"mintter/backend/pkg/dqb"
	"mintter/backend/pkg/future"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Discoverer is a subset of the syncing service that
// is able to discover given Mintter objects, optionally specifying versions.
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
	me       *future.ReadOnly[core.Identity]
	disc     Discoverer
	blobs    *hyper.Storage
	gwClient GatewayClient
}

// NewServer creates a new RPC handler.
func NewServer(me *future.ReadOnly[core.Identity], db *sqlitex.Pool, disc Discoverer, gwClient GatewayClient, LogLevel string) *Server {
	srv := &Server{
		db:       db,
		me:       me,
		disc:     disc,
		blobs:    hyper.NewStorage(db, logging.New("mintter/hyper", LogLevel)),
		gwClient: gwClient,
	}

	return srv
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

	me, err := api.me.Await(ctx)
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

	mut, err := docmodel.New(draft.Entity, me.DeviceKey(), del)
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

var qListAllDrafts = dqb.Str(`
  WITH RECURSIVE resource_authors AS (
	SELECT
	  r.iri,
	  r.create_time,
	  r.owner,
	  mv.meta,
	  pk.principal AS author_raw,
	  sb.ts,
	  sb.id AS blob_id
	FROM
	  resources r
	  JOIN structural_blobs sb ON r.id = sb.resource
	  JOIN public_keys pk ON sb.author = pk.id
	  JOIN meta_view mv ON r.iri = mv.iri
	WHERE
	  sb.author IS NOT NULL
	  AND r.iri GLOB :pattern
	  AND sb.id in (SELECT distinct blob from drafts)
	UNION ALL
	SELECT
	  ra.iri,
	  ra.create_time,
	  ra.owner,
	  sb.meta,
	  pk.principal,
	  sb.ts,
	  sb.id
	FROM
	  resource_authors ra
	  JOIN structural_blobs sb ON ra.iri = sb.resource
	  JOIN public_keys pk ON sb.author = pk.id
	WHERE
	  sb.author IS NOT NULL
	  AND ra.iri GLOB :pattern
  ),
  owners_raw AS (
	SELECT
	  id,
	  principal AS owner_raw
	FROM
	  public_keys
  ),
  latest_blobs AS (
	SELECT
	  ra.iri,
	  MAX(ra.ts) AS latest_ts,
	  b.multihash,
	  b.codec
	FROM
	  resource_authors ra
	  JOIN blobs b ON ra.blob_id = b.id
	  GROUP BY ra.iri
  )
  SELECT
	ra.iri,
	ra.create_time,
	GROUP_CONCAT(DISTINCT HEX(ra.author_raw)) AS authors_hex,
	ra.meta,
	MAX(ra.ts) AS latest_ts,
	HEX(oraw.owner_raw)
  FROM
	resource_authors ra
	LEFT JOIN owners_raw oraw ON ra.owner = oraw.id
	LEFT JOIN latest_blobs lb ON ra.iri = lb.iri
  GROUP BY
	ra.iri, ra.create_time, ra.meta
  ORDER BY latest_ts asc;
`)

// ListDrafts implements the corresponding gRPC method.
func (api *Server) ListDrafts(ctx context.Context, _ *documents.ListDraftsRequest) (*documents.ListDraftsResponse, error) {
	var (
		entities []hyper.EntityID
		err      error
	)
	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Can't get a connection from the db: %w", err)
	}
	defer cancel()
	resp := &documents.ListDraftsResponse{
		Documents: make([]*documents.Document, 0, len(entities)),
	}
	pattern := "hm://d/*"
	err = sqlitex.Exec(conn, qListAllDrafts(), func(stmt *sqlite.Stmt) error {
		var (
			id          = stmt.ColumnText(0)
			createTime  = stmt.ColumnInt64(1)
			editorsStr  = stmt.ColumnText(2)
			title       = stmt.ColumnText(3)
			updatedTime = stmt.ColumnInt64(4)
			ownerHex    = stmt.ColumnText(5)
		)
		editors := []string{}
		for _, editorHex := range strings.Split(editorsStr, ",") {
			editorBin, err := hex.DecodeString(editorHex)
			if err != nil {
				return err
			}
			editors = append(editors, core.Principal(editorBin).String())
		}
		ownerBin, err := hex.DecodeString(ownerHex)
		if err != nil {
			return err
		}
		pub := &documents.Document{
			Id:       id,
			Title:    title,
			Author:   core.Principal(ownerBin).String(),
			Editors:  editors,
			Children: []*documents.BlockNode{},

			CreateTime:  timestamppb.New(time.Unix(int64(createTime), 0)),
			UpdateTime:  timestamppb.New(time.Unix(int64(updatedTime/1000000), (updatedTime%1000000)*1000)),
			PublishTime: timestamppb.New(time.Unix(int64(updatedTime/1000000), (updatedTime%1000000)*1000)),
		}
		resp.Documents = append(resp.Documents, pub)
		return nil
	}, pattern)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

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
		Version:  mut.Entity().Version().String(),
	}, nil
}

// DeletePublication implements the corresponding gRPC method.
func (api *Server) DeletePublication(ctx context.Context, in *documents.DeletePublicationRequest) (*emptypb.Empty, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify publication ID to delete")
	}

	eid := hyper.EntityID(in.DocumentId)

	if err := api.blobs.DeleteEntity(ctx, eid); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

// PushPublication implements the corresponding gRPC method.
func (api *Server) PushPublication(ctx context.Context, in *documents.PushPublicationRequest) (*emptypb.Empty, error) {
	if in.DocumentId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify publication ID")
	}

	if in.Url == "" {
		return nil, status.Errorf(codes.InvalidArgument, "must specify an url")
	}

	// If no gwClient is set we can't do anything else.
	if api.gwClient == nil {
		return nil, status.Errorf(codes.FailedPrecondition, "there is no gwClient definition")
	}

	eid := hyper.EntityID(in.DocumentId)

	entity, err := api.blobs.LoadEntity(ctx, eid)

	if err != nil {
		return nil, status.Errorf(codes.Internal, "unable to get entity[%s]: %v", eid.String(), err)
	}

	if entity == nil {
		return nil, status.Errorf(codes.NotFound, "no published changes for entity %s", eid.String())
	}

	conn, cancelFcn, err := api.db.Conn(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "unable to get db connection: %v", err)
	}
	defer cancelFcn()

	gdb, err := hypersql.EntitiesLookupID(conn, entity.ID().String())
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "unable to find entity id [%s]: %v", entity.ID().String(), err)
	}
	if gdb.ResourcesID == 0 {
		return nil, status.Errorf(codes.NotFound, "document %s not found", entity.ID().String())
	}

	cids := []cid.Cid{}
	err = sqlitex.Exec(conn, groups.QCollectBlobs(), func(stmt *sqlite.Stmt) error {
		var (
			id        int64
			codec     int64
			multihash []byte
		)
		stmt.Scan(&id, &codec, &multihash)

		c := cid.NewCidV1(uint64(codec), multihash)
		cids = append(cids, c)
		return nil
	}, gdb.ResourcesID)
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "couldn't find referenced materials for document %s: %v", entity.ID().String(), err)
	}

	gc, err := api.gwClient.GatewayClient(ctx, in.Url)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get site client: %v", err)
	}

	if _, err := gc.PublishBlobs(ctx, &groups_proto.PublishBlobsRequest{
		Blobs: colx.SliceMap(cids, cid.Cid.String),
	}); err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "failed to push blobs to the gateway: %v", err)
	}
	return &emptypb.Empty{}, nil
}

var qListAllPublications = dqb.Str(`
  WITH RECURSIVE resource_authors AS (
	SELECT
	  r.iri,
	  r.create_time,
	  r.owner,
	  mv.meta,
	  pk.principal AS author_raw,
	  sb.ts,
	  sb.id AS blob_id
	FROM
	  resources r
	  JOIN structural_blobs sb ON r.id = sb.resource
	  JOIN public_keys pk ON sb.author = pk.id
	  JOIN meta_view mv ON r.iri = mv.iri
	WHERE
	  sb.author IS NOT NULL
	  AND r.iri GLOB :pattern
	  AND sb.id not in (SELECT distinct blob from drafts) 
	UNION ALL
	SELECT
	  ra.iri,
	  ra.create_time,
	  ra.owner,
	  sb.meta,
	  pk.principal,
	  sb.ts,
	  sb.id
	FROM
	  resource_authors ra
	  JOIN structural_blobs sb ON ra.iri = sb.resource
	  JOIN public_keys pk ON sb.author = pk.id
	WHERE
	  sb.author IS NOT NULL
	  AND ra.iri GLOB :pattern
  ),
  owners_raw AS (
	SELECT
	  id,
	  principal AS owner_raw
	FROM
	  public_keys
  ),
  latest_blobs AS (
	SELECT
	  ra.iri,
	  MAX(ra.ts) AS latest_ts,
	  b.multihash,
	  b.codec
	FROM
	  resource_authors ra
	  JOIN blobs b ON ra.blob_id = b.id
	  GROUP BY ra.iri
  )
  SELECT
	ra.iri,
	ra.create_time,
	GROUP_CONCAT(DISTINCT HEX(ra.author_raw)) AS authors_hex,
	ra.meta,
	MAX(ra.ts) AS latest_ts,
	HEX(oraw.owner_raw),
	lb.multihash AS latest_multihash,
	lb.codec AS latest_codec
  FROM
	resource_authors ra
	LEFT JOIN owners_raw oraw ON ra.owner = oraw.id
	LEFT JOIN latest_blobs lb ON ra.iri = lb.iri
  GROUP BY
	ra.iri, ra.create_time, ra.meta
  ORDER BY latest_ts asc;
`)

var qListTrustedPublications = dqb.Str(`
  WITH RECURSIVE resource_authors AS (
	SELECT
	  r.iri,
	  r.create_time,
	  r.owner,
	  mv.meta,
	  pk.principal AS author_raw,
	  sb.ts,
	  sb.id AS blob_id
	FROM
	  resources r
	  JOIN structural_blobs sb ON r.id = sb.resource
	  JOIN public_keys pk ON sb.author = pk.id
	  JOIN meta_view mv ON r.iri = mv.iri
	  JOIN trusted_accounts ON trusted_accounts.id = r.owner
	WHERE
	  sb.author IS NOT NULL
	  AND r.iri GLOB :pattern
	  AND r.id not in (SELECT resource from drafts) 
	UNION ALL
	SELECT
	  ra.iri,
	  ra.create_time,
	  ra.owner,
	  sb.meta,
	  pk.principal,
	  sb.ts,
	  sb.id
	FROM
	  resource_authors ra
	  JOIN structural_blobs sb ON ra.iri = sb.resource
	  JOIN public_keys pk ON sb.author = pk.id
	WHERE
	  sb.author IS NOT NULL
	  AND ra.iri GLOB :pattern
  ),
  owners_raw AS (
	SELECT
	  id,
	  principal AS owner_raw
	FROM
	  public_keys
  ),
  latest_blobs AS (
	SELECT
	  ra.iri,
	  MAX(ra.ts) AS latest_ts,
	  b.multihash,
	  b.codec
	FROM
	  resource_authors ra
	  JOIN blobs b ON ra.blob_id = b.id
	  GROUP BY ra.iri
  )
  SELECT
	ra.iri,
	ra.create_time,
	GROUP_CONCAT(DISTINCT HEX(ra.author_raw)) AS authors_hex,
	ra.meta,
	MAX(ra.ts) AS latest_ts,
	HEX(oraw.owner_raw),
	lb.multihash AS latest_multihash,
	lb.codec AS latest_codec
  FROM
	resource_authors ra
	LEFT JOIN owners_raw oraw ON ra.owner = oraw.id
	LEFT JOIN latest_blobs lb ON ra.iri = lb.iri
  GROUP BY
	ra.iri, ra.create_time, ra.meta
  ORDER BY latest_ts asc;
`)

// ListPublications implements the corresponding gRPC method.
func (api *Server) ListPublications(ctx context.Context, in *documents.ListPublicationsRequest) (*documents.ListPublicationsResponse, error) {
	var (
		entities []hyper.EntityID
		err      error
	)
	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Can't get a connection from the db: %w", err)
	}
	defer cancel()
	resp := &documents.ListPublicationsResponse{
		Publications: make([]*documents.Publication, 0, len(entities)),
	}
	pattern := "hm://d/*"
	query := qListAllPublications
	if in.TrustedOnly {
		query = qListTrustedPublications
	}
	err = sqlitex.Exec(conn, query(), func(stmt *sqlite.Stmt) error {
		var (
			id          = stmt.ColumnText(0)
			createTime  = stmt.ColumnInt64(1)
			editorsStr  = stmt.ColumnText(2)
			title       = stmt.ColumnText(3)
			updatedTime = stmt.ColumnInt64(4)
			ownerHex    = stmt.ColumnText(5)
			mhash       = stmt.ColumnBytes(6)
			codec       = stmt.ColumnInt64(7)
		)
		editors := []string{}
		for _, editorHex := range strings.Split(editorsStr, ",") {
			editorBin, err := hex.DecodeString(editorHex)
			if err != nil {
				return err
			}
			editors = append(editors, core.Principal(editorBin).String())
		}
		ownerBin, err := hex.DecodeString(ownerHex)
		if err != nil {
			return err
		}
		version := cid.NewCidV1(uint64(codec), mhash)
		pub := &documents.Publication{
			Version: version.String(),
			Document: &documents.Document{
				Id:       id,
				Title:    title,
				Author:   core.Principal(ownerBin).String(),
				Editors:  editors,
				Children: []*documents.BlockNode{},

				CreateTime:  timestamppb.New(time.Unix(int64(createTime), 0)),
				UpdateTime:  timestamppb.New(time.Unix(int64(updatedTime/1000000), (updatedTime%1000000)*1000)),
				PublishTime: timestamppb.New(time.Unix(int64(updatedTime/1000000), (updatedTime%1000000)*1000)),
			},
		}
		resp.Publications = append(resp.Publications, pub)
		return nil
	}, pattern)
	if err != nil {
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

func (api *Server) getMe() (core.Identity, error) {
	me, ok := api.me.Get()
	if !ok {
		return core.Identity{}, status.Errorf(codes.FailedPrecondition, "account is not initialized yet")
	}
	return me, nil
}

func (api *Server) getDelegation(ctx context.Context) (cid.Cid, error) {
	me, err := api.getMe()
	if err != nil {
		return cid.Undef, err
	}

	var out cid.Cid

	// TODO(burdiyan): need to cache this. Makes no sense to always do this.
	if err := api.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		acc := me.Account().Principal()
		dev := me.DeviceKey().Principal()

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
