// Package sites implements mintter-site server.
package sites

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"mintter/backend/cmd/mintter-site/sitesql"
	"mintter/backend/daemon/storage"
	groups "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"net/http"
	"sync"

	"google.golang.org/grpc/codes"
	rpcpeer "google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/protobuf/encoding/protojson"
)

// Website is the gate to manipulate internal node structures
type Website struct {
	// Network of the node.
	node *future.ReadOnly[*mttnet.Node]
	// db access to the node.
	db *future.ReadOnly[*sqlitex.Pool]
	// url is the protocol + hostname the group is being served at.
	url string

	once        sync.Once
	setupSecret string
}

var errNodeNotReadyYet = errors.New("P2P node is not ready yet")

// NewServer creates a new server for the site.
func NewServer(url string, n *future.ReadOnly[*mttnet.Node], db *future.ReadOnly[*sqlitex.Pool]) *Website {
	return &Website{
		node: n,
		db:   db,
		url:  url,
	}
}
func (ws *Website) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET")
	siteInfo, err := ws.GetSiteInfo(context.Background(), &groups.GetSiteInfoRequest{})

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
		return nil, fmt.Errorf("Failed to get db connection: %w", err)
	}
	defer release()

	gid, err := sitesql.GetServedGroupID(conn)
	if err != nil {
		return nil, fmt.Errorf("Failed to get group id from the db: %w", err)
	}

	resp := &groups.PublicSiteInfo{
		PeerInfo: &groups.PeerInfo{},
		GroupId:  gid.KVValue,
	}

	for _, address := range n.AddrInfo().Addrs {
		resp.PeerInfo.Addrs = append(resp.PeerInfo.Addrs, address.String())
	}
	resp.PeerInfo.PeerId = n.ID().DeviceKey().PeerID().String()
	resp.PeerInfo.AccountId = n.ID().Account().ID().String()

	groupID, err := sitesql.GetServedGroupID(conn)
	if err != nil {
		return nil, fmt.Errorf("Could not get group ID: %w", err)
	}
	if groupID.KVValue == "" {
		// The site is not initialized yet
		return resp, nil
	}

	entity, err := n.Blobs().LoadEntity(ctx, hyper.EntityID(groupID.KVValue))
	if err != nil {
		return nil, fmt.Errorf("could not get entity [%s]: %w", groupID.KVValue, err)
	}

	if entity != nil {
		resp.GroupVersion = entity.Version().String()
	}

	return resp, nil
}

// InitializeServer starts serving a group in this site.
func (ws *Website) InitializeServer(ctx context.Context, in *groups.InitializeServerRequest) (*groups.InitializeServerResponse, error) {
	n, ok := ws.node.Get()
	if !ok {
		return nil, errNodeNotReadyYet
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

	_, err = n.AccountForDevice(ctx, remoteDeviceID)
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

	if err := sitesql.SetServedGroupID(conn, in.GroupId); err != nil {
		return nil, err
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

	dbgroup, err := sitesql.GetServedGroupID(conn)
	if err != nil {
		return "", err
	}

	return dbgroup.KVValue, nil
}

// PublishBlobs publish blobs to the website.
func (ws *Website) PublishBlobs(ctx context.Context, in *groups.PublishBlobsRequest) (*groups.PublishBlobsResponse, error) {
	if len(in.Blobs) < 1 {
		return nil, fmt.Errorf("Please, provide at least 1 blob to publish")
	}

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
		return nil, fmt.Errorf("Failed to get db connection: %w", err)
	}
	defer release()

	// Get caller identity
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return nil, err
	}

	authorAcc, err := n.AccountForDevice(ctx, pid)
	if err != nil {
		return nil, fmt.Errorf("couldn't get account ID from device [%s]: %w", pid.String(), err)
	}

	// Get the owner's view of the list of members.
	groupID, err := sitesql.GetServedGroupID(conn)
	if err != nil || groupID.KVValue == "" {
		return nil, fmt.Errorf("Error getting groupID on the site, is the site initialized?: %w", err)
	}

	edb, err := hypersql.LookupEnsure(conn, storage.LookupResource, groupID.KVValue)
	if err != nil {
		return nil, fmt.Errorf("Could not get group (%s) resource: %w", groupID.KVValue, err)
	}

	groupOwner, err := hypersql.ResourceGetOwner(conn, edb)
	if err != nil {
		return nil, fmt.Errorf("Could not get the owner of the group %s: %w", groupID.KVValue, err)
	}

	pkdb, err := hypersql.LookupEnsure(conn, storage.LookupPublicKey, authorAcc)
	if err != nil {
		return nil, fmt.Errorf("couldn't get member entity for account [%s]: %w", authorAcc.String(), err)
	}

	// See if the caller is in the owner's group
	role, err := hypersql.GroupGetRole(conn, edb, groupOwner, pkdb)
	if err != nil {
		return nil, fmt.Errorf("Could not get role of member %s in group %s: %w", authorAcc.String(), groupID.KVValue, err)
	}

	if role == int64(groups.Role_ROLE_UNSPECIFIED) {
		return nil, status.Errorf(codes.PermissionDenied, "Caller [%s] does not have enough permissions to publish to this site.", authorAcc.String())
	}

	want := []cid.Cid{}
	for _, cIDStr := range in.Blobs {
		c, err := cid.Parse(cIDStr)
		if err != nil {
			return nil, fmt.Errorf("Could not parse provided blob [%s]: %w", cIDStr, err)
		}
		res, err := hypersql.BlobsHave(conn, c.Hash())
		if err != nil {
			return nil, fmt.Errorf("Could not verify if we had blob [%s] or not: %w", c.String(), err)
		}
		if res.Have == 0 {
			want = append(want, c)
		}
	}
	ses := n.Bitswap().NewSession(ctx)
	blkCh, err := ses.GetBlocks(ctx, want)
	if err != nil {
		return nil, fmt.Errorf("Could not get bitswap channel: %w", err)
	}
	for {
		blk, ok := <-blkCh
		if !ok {
			return &groups.PublishBlobsResponse{}, nil
		}
		if err := n.Blobs().IPFSBlockstore().Put(ctx, blk); err != nil {
			return nil, fmt.Errorf("Could not store block %s", blk.Cid().String())
		}
	}
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
