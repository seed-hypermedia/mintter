// Package sites implements mintter-site server.
package sites

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"

	"mintter/backend/daemon/storage"
	groups "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/pkg/slicex"
	"net/http"
	"sync"

	"google.golang.org/grpc/codes"
	rpcpeer "google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/multiformats/go-multiaddr"
	"google.golang.org/protobuf/encoding/protojson"
)

// Website is the gate to manipulate internal node structures
type Website struct {
	blobs *future.ReadOnly[*hyper.Storage]
	node  *future.ReadOnly[*mttnet.Node]
	db    *future.ReadOnly[*sqlitex.Pool]
	url   string

	once        sync.Once
	setupSecret string
}

var errNodeNotReadyYet = errors.New("P2P node is not ready yet")

// NewServer creates a new server for the site.
func NewServer(url string, blobs *future.ReadOnly[*hyper.Storage], n *future.ReadOnly[*mttnet.Node], db *future.ReadOnly[*sqlitex.Pool]) *Website {
	return &Website{
		blobs: blobs,
		node:  n,
		db:    db,
		url:   url,
	}
}
func (ws *Website) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET")

	siteInfo, err := ws.GetSiteInfo(r.Context(), &groups.GetSiteInfoRequest{})
	if err != nil {
		if errors.Is(err, errNodeNotReadyYet) {
			w.Header().Set("Retry-After", "30")
			http.Error(w, err.Error(), http.StatusServiceUnavailable)
		} else {
			http.Error(w, "Could not get site info: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	data, err := protojson.MarshalOptions{Indent: "  ", EmitUnpopulated: true}.Marshal(siteInfo)
	if err != nil {
		http.Error(w, "Failed to marshal site info: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(data)
	if err != nil {
		return
	}
}

// GetSetupURL returns the secret URL to setup this site.
// We want to make the secret URL deterministic so that it persists across restarts.
// We could use a random string, but that would require persisting it in the database,
// which is not a problem, but seems unnecessary.
func (ws *Website) GetSetupURL(ctx context.Context) string {
	return ws.url + "/secret-invite/" + ws.getSetupSecret(ctx)
}

func (ws *Website) getSetupSecret(ctx context.Context) string {
	ws.once.Do(func() {
		node, err := ws.node.Await(ctx)
		if err != nil {
			panic(err)
		}

		signature, err := node.ID().DeviceKey().Sign([]byte("hypermedia-site-setup-secret"))
		if err != nil {
			panic(err)
		}

		sum := sha256.Sum256(signature)

		ws.setupSecret = base64.RawURLEncoding.EncodeToString(sum[:16])
	})

	return ws.setupSecret
}

const (
	keySiteGroup = "site_group_id"
	keySiteOwner = "site_owner_id"
)

// GetSiteInfo exposes the public information of a site. Which group is serving and how to reach the site via p2p.
func (ws *Website) GetSiteInfo(ctx context.Context, in *groups.GetSiteInfoRequest) (*groups.PublicSiteInfo, error) {
	n, ok := ws.node.Get()
	if !ok {
		return nil, errNodeNotReadyYet
	}

	db, err := ws.db.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	groupID, err := storage.GetKV(conn, keySiteGroup)
	if err != nil {
		return nil, fmt.Errorf("failed to get group id from the db: %w", err)
	}

	ai := n.AddrInfo()

	resp := &groups.PublicSiteInfo{
		PeerInfo: &groups.PeerInfo{
			PeerId:    ai.ID.String(),
			AccountId: n.ID().Account().Principal().String(),
			Addrs:     slicex.Map(ai.Addrs, multiaddr.Multiaddr.String),
		},
		GroupId: groupID,
	}

	if groupID != "" {
		entity, err := n.Blobs().LoadEntity(ctx, hyper.EntityID(groupID))
		if err != nil {
			return nil, err
		}

		if entity != nil {
			resp.GroupVersion = entity.Version().String()
		}
	}

	return resp, nil
}

// InitializeServer starts serving a group in this site.
func (ws *Website) InitializeServer(ctx context.Context, in *groups.InitializeServerRequest) (*groups.InitializeServerResponse, error) {
	n, ok := ws.node.Get()
	if !ok {
		return nil, errNodeNotReadyYet
	}

	if in.GroupId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "group ID is required")
	}

	gid, err := ws.GetGroupID(ctx)
	if err != nil {
		return nil, err
	}
	if gid != "" {
		return nil, status.Errorf(codes.FailedPrecondition, "site is already initialized")
	}

	link := ws.GetSetupURL(ctx)
	if link != in.Secret {
		return nil, status.Errorf(codes.PermissionDenied, "provided setup secret is not valid")
	}

	remoteDeviceID, err := getRemoteID(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to extract peer ID from headers: %w", err)
	}

	owner, err := n.AccountForDevice(ctx, remoteDeviceID)
	if err != nil {
		return nil, fmt.Errorf("couldn't get account ID from device [%s]: %w", remoteDeviceID.String(), err)
	}

	db, err := ws.db.Await(ctx)
	if err != nil {
		return nil, err
	}

	conn, release, err := db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	_, err = hypersql.EntitiesInsertOrIgnore(conn, in.GroupId)
	if err != nil {
		return nil, err
	}

	if err := storage.SetKV(conn, keySiteGroup, in.GroupId, false); err != nil {
		return nil, fmt.Errorf("failed to save group ID")
	}

	if err := storage.SetKV(conn, keySiteOwner, owner.String(), false); err != nil {
		return nil, fmt.Errorf("failed to save owner")
	}

	return &groups.InitializeServerResponse{}, nil
}

// GetGroupID returns the group ID this site is serving.
// It's empty if the site is not initialized yet.
func (ws *Website) GetGroupID(ctx context.Context) (string, error) {
	db, err := ws.db.Await(ctx)
	if err != nil {
		return "", err
	}

	conn, release, err := db.Conn(ctx)
	if err != nil {
		return "", fmt.Errorf("Failed to get db connection: %w", err)
	}
	defer release()

	groupID, err := storage.GetKV(conn, keySiteGroup)
	if err != nil {
		return "", err
	}

	return groupID, nil
}

// PublishBlobs publish blobs to the website.
func (ws *Website) PublishBlobs(ctx context.Context, in *groups.PublishBlobsRequest) (*groups.PublishBlobsResponse, error) {
	n, ok := ws.node.Get()
	if !ok {
		return nil, errNodeNotReadyYet
	}

	// Get caller identity
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return nil, err
	}

	callerAccount, err := n.AccountForDevice(ctx, pid)
	if err != nil {
		return nil, fmt.Errorf("couldn't get account ID from device [%s]: %w", pid.String(), err)
	}

	db, err := ws.db.Await(ctx)
	if err != nil {
		return nil, err
	}
	conn, release, err := db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Failed to get db connection: %w", err)
	}
	defer release()

	// Get the owner's view of the list of members.
	groupID, err := storage.GetKV(conn, keySiteGroup)
	if err != nil || groupID == "" {
		return nil, fmt.Errorf("error getting groupID on the site, is the site initialized?: %w", err)
	}

	var role groups.Role
	{
		edb, err := hypersql.LookupEnsure(conn, storage.LookupResource, groupID)
		if err != nil {
			return nil, fmt.Errorf("couldn't get group (%s) resource: %w", groupID, err)
		}

		owner, err := storage.GetKV(conn, keySiteOwner)
		if err != nil || owner == "" {
			return nil, fmt.Errorf("error getting owner on the site, is the site initialized?: %w", err)
		}

		if owner == callerAccount.String() {
			role = groups.Role_OWNER
		} else {
			groupOwner, err := hypersql.ResourceGetOwner(conn, edb)
			if err != nil {
				return nil, fmt.Errorf("couldn't get the owner of the group %s: %w", groupID, err)
			}

			pkdb, err := hypersql.LookupEnsure(conn, storage.LookupPublicKey, callerAccount)
			if err != nil {
				return nil, fmt.Errorf("couldn't get member entity for account [%s]: %w", callerAccount.String(), err)
			}

			// See if the caller is in the owner's group
			r, err := hypersql.GroupGetRole(conn, edb, groupOwner, pkdb)
			if err != nil {
				return nil, fmt.Errorf("couldn't get role of member %s in group %s: %w", callerAccount.String(), groupID, err)
			}

			role = groups.Role(r)
		}
	}

	if role != groups.Role_OWNER && role != groups.Role_EDITOR {
		return nil, status.Errorf(codes.PermissionDenied, "Caller [%s] does not have enough permissions to publish to this site.", callerAccount.String())
	}

	blobs, err := ws.blobs.Await(ctx)
	if err != nil {
		return nil, err
	}

	bs := blobs.IPFSBlockstore()

	var want []cid.Cid
	for _, x := range in.Blobs {
		c, err := cid.Parse(x)
		if err != nil {
			return nil, fmt.Errorf("failed to parse CID %s: %w", x, err)
		}

		ok, err := bs.Has(ctx, c)
		if err != nil {
			return nil, fmt.Errorf("failed to check if we have blob %s: %w", c.String(), err)
		}
		if !ok {
			want = append(want, c)
		}
	}

	// Pull those blobs we need.
	if len(want) > 0 {
		sess := n.Bitswap().NewSession(ctx)
		// We don't use sess.GetBlocks here because we care about the order of blobs for correct indexing.
		for _, c := range want {
			blk, err := sess.GetBlock(ctx, c)
			if err != nil {
				return nil, fmt.Errorf("could not get block %s: %w", c.String(), err)
			}

			if err := bs.Put(ctx, blk); err != nil {
				return nil, fmt.Errorf("could not store block %s: %w", c.String(), err)
			}
		}
	}

	return &groups.PublishBlobsResponse{}, nil
}

// getRemoteID gets the remote peer id if there is an opened p2p connection between them with context ctx.
func getRemoteID(ctx context.Context) (peer.ID, error) {
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		return "", fmt.Errorf("BUG: no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return "", err
	}

	return pid, nil
}
