package sites

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"mintter/backend/cmd/mintter-site/sitesql"
	groups "mintter/backend/genproto/groups/v1alpha"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"net/http"
	"strings"

	"crawshaw.io/sqlite/sqlitex"
	"google.golang.org/protobuf/encoding/protojson"
)

// Website is the gate to manipulate internal node structures
type Website struct {
	// Network of the node.
	Net *future.ReadOnly[*mttnet.Node]
	// DB access to the node
	DB *sqlitex.Pool
}

func (ws *Website) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET")

	n, ok := ws.Net.Get()
	if !ok {
		w.Header().Set("Retry-After", "30")
		http.Error(w, "P2P node is not ready yet", http.StatusServiceUnavailable)
		return
	}
	// TODO(juligasa): get GroupID and version from DB, include new keys in db meta and store that value whenever
	// we update the site and the initial InitializeServer (to be done as well)
	resp := &groups.PublicSiteInfo{
		PeerInfo:     &groups.PeerInfo{},
		GroupId:      "",
		GroupVersion: "",
	}

	for _, address := range n.AddrInfo().Addrs {
		resp.PeerInfo.Addrs = append(resp.PeerInfo.Addrs, address.String())
	}
	resp.PeerInfo.PeerId = n.ID().DeviceKey().PeerID().String()
	resp.PeerInfo.AccountId = n.ID().Account().ID().String()
	data, err := protojson.Marshal(resp)
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
		panic(err)
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
