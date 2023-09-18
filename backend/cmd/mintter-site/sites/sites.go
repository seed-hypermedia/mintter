package sites

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"mintter/backend/cmd/mintter-site/sitesql"
	"mintter/backend/core"
	groups "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"net/http"
	"strings"

	rpcpeer "google.golang.org/grpc/peer"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/libp2p/go-libp2p/core/peer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
)

// Website is the gate to manipulate internal node structures
type Website struct {
	// Network of the node.
	Node *future.ReadOnly[*mttnet.Node]
	// DB access to the node.
	DB *sqlitex.Pool
	// URL is the protocol + hostname the group is being served at.
	URL string
}

var errNodeNotReadyYet = errors.New("P2P node is not ready yet")

func NewServer(n *future.ReadOnly[*mttnet.Node], db *sqlitex.Pool) *Website {
	return &Website{
		Node: n,
		DB:   db,
	}
}
func (ws *Website) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	data, err := protojson.Marshal(siteInfo)
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

// RegisterSite registers this site under the passed hostname. It also prints to
// stdout the secret configuration string for this site. We store the secret so
// the same value is returned on subsequent calls with the same hostname.
func (ws *Website) RegisterSite(ctx context.Context, hostname string) (link string, err error) {
	conn, release, err := ws.DB.Conn(ctx)
	if err != nil {
		return "", err
	}
	defer release()
	if err = func() error {
		randomBytes := make([]byte, 16)
		_, err := rand.Read(randomBytes)
		if err != nil {
			return err
		}

		currentLink, err := sitesql.GetSiteRegistrationLink(conn)
		if err != nil {
			return err
		}
		link = currentLink.KVValue
		if link == "" || hostname != strings.Split(link, "/secret-invite/")[0] {
			link = hostname + "/secret-invite/" + base64.RawURLEncoding.EncodeToString(randomBytes)
			if err := sitesql.SetSiteRegistrationLink(conn, link); err != nil {
				return err
			}
		}

		// Print it to stdout so its visible from the command line.
		fmt.Println("Site Invitation secret token: " + link)

		return nil
	}(); err != nil {
		panic(err)
	}
	return
}

// GetSiteInfo exposes the public information of a site. Which group is serving and how to reach the site via p2p.
func (ws *Website) GetSiteInfo(ctx context.Context, in *groups.GetSiteInfoRequest) (*groups.PublicSiteInfo, error) {
	fmt.Println("INFO CALLED")
	n, ok := ws.Node.Get()
	if !ok {
		return nil, errNodeNotReadyYet
	}

	conn, release, err := ws.DB.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Failed to get db connection: %w", err)
	}
	defer release()

	siteInfo, err := sitesql.GetSiteInfo(conn, ws.URL)
	if err != nil {
		return nil, fmt.Errorf("Failed to get group id from the db: %w", err)
	}

	resp := &groups.PublicSiteInfo{
		PeerInfo:     &groups.PeerInfo{},
		GroupId:      siteInfo.EntitiesEID,
		GroupVersion: siteInfo.ServedSitesVersion,
	}
	if siteInfo.ServedSitesVersion == "" && siteInfo.EntitiesEID != "" {

		entity, err := n.Blobs().LoadEntity(ctx, hyper.EntityID(siteInfo.EntitiesEID))
		if err != nil {
			return nil, fmt.Errorf("could not get entity [%s]: %w", siteInfo.EntitiesEID, err)
		}
		resp.GroupVersion = entity.Version().String()
	}

	for _, address := range n.AddrInfo().Addrs {
		resp.PeerInfo.Addrs = append(resp.PeerInfo.Addrs, address.String())
	}
	resp.PeerInfo.PeerId = n.ID().DeviceKey().PeerID().String()
	resp.PeerInfo.AccountId = n.ID().Account().ID().String()

	return resp, nil
}

// InitializeServer starts serving a group in this site.
func (ws *Website) InitializeServer(ctx context.Context, in *groups.InitializeServerRequest) (*groups.InitializeServerResponse, error) {
	fmt.Println("INIT CALLED")
	n, ok := ws.Node.Get()
	if !ok {
		return nil, errNodeNotReadyYet
	}

	conn, release, err := ws.DB.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("Failed to get db connection: %w", err)
	}
	defer release()
	remoteDeviceID, err := getRemoteID(ctx)

	var remoteAcc core.Principal
	if err != nil {
		return nil, fmt.Errorf("Only remote calls accepted: %w", err)
	}

	remoteAcc, err = n.AccountForDevice(ctx, remoteDeviceID)
	if err != nil {
		return nil, fmt.Errorf("couldn't get account ID from device [%s]: %w", remoteDeviceID.String(), err)
	}

	link, err := sitesql.GetSiteRegistrationLink(conn)
	if err != nil {
		return nil, err
	}

	if link.KVValue != in.Secret {
		return nil, fmt.Errorf("Provided secret link not valid")
	}

	hostname := strings.Split(in.Secret, "/secret-invite/")[0]

	_, err = hypersql.EntitiesInsertOrIgnore(conn, in.GroupId)
	if err != nil {
		return nil, err
	}

	if err := sitesql.RegisterSite(conn, hostname, in.GroupId, "", remoteAcc); err != nil {
		return nil, err
	}

	return &groups.InitializeServerResponse{}, nil
}

// PublishBlobs publish blobs to the website.
func (ws *Website) PublishBlobs(ctx context.Context, in *groups.PublishBlobsRequest) (*groups.PublishBlobsResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "site setup is not implemented yet")
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
