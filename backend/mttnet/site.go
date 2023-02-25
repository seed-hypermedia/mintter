// Package mttnet exposes the site functions to be exposed over p2p.
package mttnet

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"encoding/json"
	"fmt"
	site "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/mttnet/sitesql"
	"mintter/backend/vcs/vcssql"
	"net/http"
	"net/url"
	"reflect"
	"runtime"
	"strings"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p/core/peer"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	rpcpeer "google.golang.org/grpc/peer"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	// MttHeader is the headers bearing the remote site hostname to proxy calls to.
	MttHeader = "x-mintter-site-hostname"
	// SiteAccountIDCtxKey is the key to pass the account id via context down to a proxied call
	// In initial site add, the account is not in the database and it needs to proxy to call redeemtoken.
	SiteAccountIDCtxKey = "x-mintter-site-account-id"
	// WellKnownPath is the path (to be completed with http(s)+domain) to call to get data from site.
	WellKnownPath = ".well-known"
)

// CreateInviteToken creates a new invite token for registering a new member.
func (srv *Server) CreateInviteToken(ctx context.Context, in *site.CreateInviteTokenRequest) (*site.InviteToken, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return &site.InviteToken{}, err
	}
	if proxied {
		retValue, ok := res.(*site.InviteToken)
		if !ok {
			return &site.InviteToken{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	if in.Role == site.Member_OWNER {
		return &site.InviteToken{}, fmt.Errorf("Cannot create owner token, please update the owner manually in site config")
	}
	// generate random number string for the token. Substitute for proper signed jwt
	newToken := randStr(12)

	if in.ExpireTime != nil && in.ExpireTime.AsTime().Before(time.Now()) {
		return &site.InviteToken{}, fmt.Errorf("expiration time must be in the future")
	}
	expirationTime := time.Now().Add(srv.InviteTokenExpirationDelay)
	if in.ExpireTime != nil {
		expirationTime = in.ExpireTime.AsTime()
	}

	n, ok := srv.Node.Get()
	if !ok {
		return &site.InviteToken{}, fmt.Errorf("Node not ready yet")
	}
	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.InviteToken{}, fmt.Errorf("Cannot connect to internal db")
	}
	defer cancel()
	if err = sitesql.AddToken(conn, newToken, expirationTime, in.Role); err != nil {
		return &site.InviteToken{}, fmt.Errorf("Cannot add token to db: %w", err)
	}

	return &site.InviteToken{
		Token:      newToken,
		ExpireTime: &timestamppb.Timestamp{Seconds: expirationTime.Unix(), Nanos: int32(expirationTime.Nanosecond())},
	}, nil
}

// RedeemInviteToken redeems a previously created invite token to register a new member.
func (srv *Server) RedeemInviteToken(ctx context.Context, in *site.RedeemInviteTokenRequest) (*site.RedeemInviteTokenResponse, error) {
	acc, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return &site.RedeemInviteTokenResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.RedeemInviteTokenResponse)
		if !ok {
			return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	n, ok := srv.Node.Get()
	if !ok {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Node not ready yet")
	}
	if acc.String() == srv.ownerID {
		n.log.Debug("TOKEN REDEEMED", zap.String("Site Owner", srv.ownerID), zap.String("Role", "OWNER"))
		srv.accountsDB[acc.String()] = site.Member_OWNER
		return &site.RedeemInviteTokenResponse{Role: site.Member_OWNER}, nil
	}

	// check if that account was already redeemed in the past
	if role, ok := srv.accountsDB[acc.String()]; ok {
		return &site.RedeemInviteTokenResponse{Role: role}, nil
	}

	if in.Token == "" { // TODO(juligasa): substitute with proper regexp match
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Invalid token format. Only site owner can add a site without a token")
	}

	conn, cancel, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Cannot connect to internal db")
	}
	defer cancel()
	tokenInfo, err := sitesql.GetToken(conn, in.Token)
	if err != nil {
		n.log.Debug("TOKEN NOT VALID", zap.String("Provided token", in.Token), zap.Error(err))
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("token not valid (nonexisting, already redeemed or expired)")
	}

	if tokenInfo.ExpirationTime.Before(time.Now()) {
		_ = sitesql.RemoveToken(conn, in.Token)
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("expired token")
	}

	// redeem the token
	if err = sitesql.RemoveToken(conn, in.Token); err != nil {
		return &site.RedeemInviteTokenResponse{}, fmt.Errorf("Could not redeem the token %w", err)
	}

	// We upsert the new role
	srv.accountsDB[acc.String()] = tokenInfo.Role

	n.log.Debug("TOKEN REDEEMED", zap.String("Caller account", acc.String()), zap.String("Site Owner", srv.ownerID), zap.String("Role", "EDITOR"))
	return &site.RedeemInviteTokenResponse{Role: tokenInfo.Role}, nil
}

// GetSiteInfo Gets public-facing site information.
func (srv *Server) GetSiteInfo(ctx context.Context, in *site.GetSiteInfoRequest) (*site.SiteInfo, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return &site.SiteInfo{}, err
	}
	if proxied {
		retValue, ok := res.(*site.SiteInfo)
		if !ok {
			return &site.SiteInfo{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	return &site.SiteInfo{
		Hostname:    srv.hostname,
		Title:       srv.title,
		Description: srv.description,
		Owner:       srv.ownerID,
	}, nil
}

// UpdateSiteInfo updates public-facing site information. Doesn't support partial updates, hence all the fields must be provided.
func (srv *Server) UpdateSiteInfo(ctx context.Context, in *site.UpdateSiteInfoRequest) (*site.SiteInfo, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return &site.SiteInfo{}, err
	}
	if proxied {
		retValue, ok := res.(*site.SiteInfo)
		if !ok {
			return &site.SiteInfo{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	if in.Title != "" {
		srv.title = in.Title
	}
	if in.Description != "" {
		srv.description = in.Description
	}

	return &site.SiteInfo{
		Hostname:    srv.hostname,
		Title:       srv.title,
		Description: srv.description,
		Owner:       srv.ownerID,
	}, nil
}

// ListMembers lists registered members on the site.
func (srv *Server) ListMembers(ctx context.Context, in *site.ListMembersRequest) (*site.ListMembersResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return &site.ListMembersResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.ListMembersResponse)
		if !ok {
			return &site.ListMembersResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	var members []*site.Member
	for accID, role := range srv.accountsDB {
		members = append(members, &site.Member{
			AccountId: accID,
			Role:      role,
		})
	}
	return &site.ListMembersResponse{Members: members}, nil
}

// GetMember gets information about a specific member.
func (srv *Server) GetMember(ctx context.Context, in *site.GetMemberRequest) (*site.Member, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return &site.Member{}, err
	}
	if proxied {
		retValue, ok := res.(*site.Member)
		if !ok {
			return &site.Member{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	role, ok := srv.accountsDB[in.AccountId]
	if !ok {
		return &site.Member{}, fmt.Errorf("Member not found")
	}
	return &site.Member{AccountId: in.AccountId, Role: role}, nil
}

// DeleteMember deletes an existing member.
func (srv *Server) DeleteMember(ctx context.Context, in *site.DeleteMemberRequest) (*emptypb.Empty, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_OWNER, in)
	if err != nil {
		return &emptypb.Empty{}, err
	}
	if proxied {
		retValue, ok := res.(*emptypb.Empty)
		if !ok {
			return &emptypb.Empty{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	roleToDelete, ok := srv.accountsDB[in.AccountId]
	if !ok {
		return &emptypb.Empty{}, fmt.Errorf("Member not found")
	}
	if roleToDelete == site.Member_OWNER {
		return &emptypb.Empty{}, fmt.Errorf("Site owner cannot be deleted, please, change it manually in site config")
	}
	delete(srv.accountsDB, in.AccountId)
	return &emptypb.Empty{}, nil
}

// PublishDocument publishes and pins the document to the public web site.
func (srv *Server) PublishDocument(ctx context.Context, in *site.PublishDocumentRequest) (*site.PublishDocumentResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return &site.PublishDocumentResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.PublishDocumentResponse)
		if !ok {
			return &site.PublishDocumentResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	_, err = url.Parse(in.Path)
	if err != nil {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Path [%s] is not a valid path", in.Path)
	}
	// TODO(juligasa): call getPublication on the site for the document published and all of the referenced documents
	// GetPublication is going to call discover object that calls sync, and it'll sync everything. Instead, since site and editor already connected, call
	// a new function to pull the document directly from the editor, without syncyng
	/*doc, err := srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{DocumentId: in.DocumentId, Version: in.Version, LocalOnly: false})
	if err != nil {
		return &site.PublishDocumentResponse{}, fmt.Errorf("Cannot pull document [%s] version [%s]", in.DocumentId, in.Version)
	}
	*/
	// If path already taken, we update in case doc_ids match (just updating the version) error otherwise
	for key, record := range srv.WebPublicationRecordDB {
		if record.Document.ID == in.DocumentId && record.Document.Version == in.Version {
			return &site.PublishDocumentResponse{}, fmt.Errorf("Provided document+version already exists in path [%s]", in.Path)
		}
		if record.Path == in.Path {
			if record.Document.ID != in.DocumentId {
				return &site.PublishDocumentResponse{}, fmt.Errorf("Path [%s] already taken by a different Document ID", in.Path)
			}
			delete(srv.WebPublicationRecordDB, key)
		}
	}

	var refs []docInfo
	for _, ref := range in.ReferencedDocuments {
		refs = append(refs, docInfo{ID: ref.DocumentId, Version: ref.Version})
	}

	srv.WebPublicationRecordDB[randStr(8)] = PublicationRecord{
		Document:   docInfo{ID: in.DocumentId, Version: in.Version},
		Path:       in.Path,
		Hostname:   srv.hostname,
		References: refs,
	}
	return &site.PublishDocumentResponse{}, nil
}

// UnpublishDocument un-publishes (un-lists) a given document. Only the author of that document or the owner can unpublish.
func (srv *Server) UnpublishDocument(ctx context.Context, in *site.UnpublishDocumentRequest) (*site.UnpublishDocumentResponse, error) {
	acc, proxied, res, err := srv.checkPermissions(ctx, site.Member_EDITOR, in)
	if err != nil {
		return &site.UnpublishDocumentResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.UnpublishDocumentResponse)
		if !ok {
			return &site.UnpublishDocumentResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	var toDelete []string
	for key, record := range srv.WebPublicationRecordDB {
		if record.Document.ID == in.DocumentId && (in.Version == "" || in.Version == record.Document.Version) {
			doc, err := srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{
				DocumentId: record.Document.ID,
				Version:    record.Document.Version,
				LocalOnly:  true,
			})
			if err != nil {
				return &site.UnpublishDocumentResponse{}, fmt.Errorf("Couldn't find the actual document to unpublish although it was found in the database: %w", err)
			}
			docAcc, err := cid.Decode(doc.Document.Author)
			if err != nil {
				return &site.UnpublishDocumentResponse{}, fmt.Errorf("Couldn't parse doc cid: %w", err)
			}
			if acc.String() != docAcc.String() && srv.ownerID != acc.String() {
				return &site.UnpublishDocumentResponse{}, fmt.Errorf("You are not the author of the document, nor site owner")
			}
			toDelete = append(toDelete, key)
		}
	}
	for _, record := range toDelete {
		delete(srv.WebPublicationRecordDB, record)
	}
	return &site.UnpublishDocumentResponse{}, nil
}

// ListWebPublications lists all the published documents.
func (srv *Server) ListWebPublications(ctx context.Context, in *site.ListWebPublicationsRequest) (*site.ListWebPublicationsResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return &site.ListWebPublicationsResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.ListWebPublicationsResponse)
		if !ok {
			return &site.ListWebPublicationsResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	var publications []*site.WebPublicationRecord
	for _, record := range srv.WebPublicationRecordDB {
		publications = append(publications, &site.WebPublicationRecord{
			DocumentId: record.Document.ID,
			Version:    record.Document.Version,
			Hostname:   srv.hostname,
			Path:       record.Path,
		})
	}
	return &site.ListWebPublicationsResponse{Publications: publications}, nil
}

// GetPath gets a publication given the path it has been publish to.
func (srv *Server) GetPath(ctx context.Context, in *site.GetPathRequest) (*site.GetPathResponse, error) {
	_, proxied, res, err := srv.checkPermissions(ctx, site.Member_ROLE_UNSPECIFIED, in)
	if err != nil {
		return &site.GetPathResponse{}, err
	}
	if proxied {
		retValue, ok := res.(*site.GetPathResponse)
		if !ok {
			return &site.GetPathResponse{}, fmt.Errorf("Format of proxied return value not recognized")
		}
		return retValue, nil
	}
	ret := &site.Publication{}
	err = fmt.Errorf("No publication was found in provided path")
	for _, v := range srv.WebPublicationRecordDB { // we first look in the db because we may have the document but was unpublished (removed from the database but not from the storage)
		if in.Path == v.Path {
			ret, err = srv.localFunctions.GetPublication(ctx, &site.GetPublicationRequest{
				DocumentId: v.Document.ID,
				LocalOnly:  true,
			})
			if err != nil {
				return &site.GetPathResponse{}, fmt.Errorf("Could not get local document although was found in the list of published documents: %w", err)
			}
			break
		}
	}
	return &site.GetPathResponse{Publication: ret}, err
}

func getRemoteSiteFromHeader(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", fmt.Errorf("There is no metadata provided in context")
	}
	token := md.Get(MttHeader)
	if len(token) != 1 {
		return "", fmt.Errorf("Header [%s] not found in metadata", MttHeader)
	}
	return token[0], nil
}

// getRemoteID gets the remote peer id if there is an opened p2p connection between them with context ctx.
func getRemoteID(ctx context.Context) (cid.Cid, error) {
	info, ok := rpcpeer.FromContext(ctx)
	if !ok {
		return cid.Cid{}, fmt.Errorf("BUG: no peer info in context for grpc")
	}

	pid, err := peer.Decode(info.Addr.String())
	if err != nil {
		return cid.Cid{}, err
	}

	return peer.ToCid(pid), nil
}

func randStr(length int) string {
	randomBytes := make([]byte, 32)
	_, err := rand.Read(randomBytes)
	if err != nil {
		panic(err)
	}
	return base32.StdEncoding.EncodeToString(randomBytes)[:length]
}

// Client dials a remote peer if necessary and returns the RPC client handle.
func (srv *Server) Client(ctx context.Context, device cid.Cid) (site.WebSiteClient, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	pid, err := peer.FromCid(device)
	if err != nil {
		return nil, err
	}

	if err := n.Connect(ctx, n.p2p.Peerstore().PeerInfo(pid)); err != nil {
		return nil, err
	}
	return n.client.DialSite(ctx, pid)
}

func (srv *Server) checkPermissions(ctx context.Context, requiredRole site.Member_Role, params ...interface{}) (cid.Cid, bool, interface{}, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return cid.Cid{}, false, nil, fmt.Errorf("Node not ready yet")
	}

	remoteHostname, err := getRemoteSiteFromHeader(ctx)
	if err != nil && srv.hostname == "" { // no headers and not a site
		return cid.Cid{}, false, nil, fmt.Errorf("This node is not a site, please provide a proper headers to proxy the call to a remote site: %w", err)
	}

	acc := n.me.AccountID()
	n.log.Debug("Check permissions", zap.String("Site hostname", srv.hostname), zap.String("remoteHostname", remoteHostname), zap.Error(err))
	if err == nil && srv.hostname != remoteHostname && srv.hostname != "" {
		return acc, false, nil, fmt.Errorf("Hostnames don't match. This site's hostname is [%s] but called with headers [%s]", srv.hostname, remoteHostname)
	}

	if err == nil && srv.hostname != remoteHostname && srv.hostname == "" { //This call is intended to be proxied so its site's duty to check permission
		// proxy to remote
		if len(params) == 0 {
			n.log.Error("Headers found, meaning this call should be proxied, but remote function params not provided")
			return acc, false, nil, fmt.Errorf("In order to proxy a call (headers found) you need to provide a valid proxy func and a params")
		}
		n.log.Debug("Headers found, meaning this call should be proxied and authentication will take place at the remote site", zap.String(MttHeader, remoteHostname))

		pc, _, _, _ := runtime.Caller(1)
		proxyFcnList := strings.Split(runtime.FuncForPC(pc).Name(), ".")
		proxyFcn := proxyFcnList[len(proxyFcnList)-1]
		res, errInterface := srv.proxyToSite(ctx, remoteHostname, proxyFcn, params...)
		if errInterface != nil {
			err, ok := errInterface.(error)
			if !ok {
				return acc, true, res, fmt.Errorf("Proxied call returned unknown second parameter. Error type expected")
			}
			return acc, true, res, err
		}
		return acc, true, res, nil
	}

	if err != nil || srv.hostname == remoteHostname { //either a proxied call or a direct call without headers (nodejs)
		// this would mean this is a proxied call so we take the account from the remote caller ID
		remoteDeviceID, err := getRemoteID(ctx)
		if err == nil {
			// this would mean this is a proxied call so we take the account from the remote caller ID
			remotAcc, err := n.AccountForDevice(ctx, remoteDeviceID)
			if err != nil {
				return cid.Cid{}, false, nil, fmt.Errorf("couldn't get account ID from device ID: %w", err)
			}

			n.log.Debug("PROXIED CALL", zap.String("Local AccountID", acc.String()), zap.String("Remote AccountID", remotAcc.String()), zap.Error(err))
			acc = remotAcc
		} else {
			// this would mean we cannot get remote ID it must be a local call
			n.log.Debug("LOCAL CALL", zap.String("Local AccountID", acc.String()), zap.String("remoteHostname", remoteHostname), zap.Error(err))
		}
	}

	if requiredRole == site.Member_OWNER && acc.String() != srv.ownerID {
		return cid.Cid{}, false, nil, fmt.Errorf("Unauthorized. Required role: %d", requiredRole)
	} else if requiredRole == site.Member_EDITOR && acc.String() != srv.ownerID {
		role, ok := srv.Site.accountsDB[acc.String()]
		if !ok || (ok && role != requiredRole) {
			return cid.Cid{}, false, nil, fmt.Errorf("Unauthorized. Required role: %d", requiredRole)
		}
	}
	return acc, false, nil, nil
}

// ServeHTTP serves the content for the well-known path.
func (srv *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	encoder := json.NewEncoder(w)
	w.Header().Set("Content-Type", "application/json")
	var siteInfo wellKnownInfo
	n, ok := srv.Node.Get()
	if !ok {
		w.Header().Set("Retry-After", "30")
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = encoder.Encode("Error: site p2p node not ready yet")
		return
	}

	siteInfo.AccountID = n.me.AccountID().String()

	pid := n.me.DeviceKey().ID()
	addrinfo := n.Libp2p().Peerstore().PeerInfo(pid)
	mas, err := peer.AddrInfoToP2pAddrs(&addrinfo)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = encoder.Encode("Error: failed to get own site addresses")
		return
	}

	for _, addr := range mas {
		siteInfo.Addresses = append(siteInfo.Addresses, addr.String())
	}
	_ = encoder.Encode(siteInfo)
}

// proxyToSite calls a remote site function over libp2p.
func (srv *Server) proxyToSite(ctx context.Context, hostname string, proxyFcn string, params ...interface{}) (interface{}, interface{}) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Can't proxy. Local p2p node not ready yet")
	}

	siteAccount, err := srv.localFunctions.GetSiteAccount(hostname)
	if err != nil {
		siteAccountCtx := ctx.Value(SiteAccountIDCtxKey)
		if siteAccountCtx == nil {
			return nil, fmt.Errorf("Cannot get site accountID: %w", err)
		}
		siteAccount, ok = siteAccountCtx.(string)
		if !ok {
			return nil, fmt.Errorf("Cannot get site accountID")
		}
	}

	conn, release, err := n.VCS().DB().Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	all, err := vcssql.ListAccountDevices(conn)
	if err != nil {
		n.log.Debug("couldn't list devices", zap.String("msg", err.Error()))
		return nil, fmt.Errorf("couldn't list devices from account ID %s", siteAccount)
	}

	siteAccountID, err := cid.Decode(siteAccount)
	if err != nil {
		return nil, fmt.Errorf("Could not decode site account ID: %w", err)
	}
	devices, found := all[siteAccountID]
	if !found {
		return nil, fmt.Errorf("couldn't find devices information of the account %s. Please connect to the remote peer first ", siteAccount)
	}
	remoteHostname, _ := getRemoteSiteFromHeader(ctx)
	ctx = metadata.AppendToOutgoingContext(ctx, MttHeader, remoteHostname)
	for _, deviceID := range devices {
		sitec, err := srv.Client(ctx, deviceID)
		if err != nil {
			continue
		}

		n.log.Debug("Remote site contacted, now try to call a remote function", zap.String("Function name", proxyFcn))

		in := []reflect.Value{reflect.ValueOf(ctx)}
		for _, param := range params {
			in = append(in, reflect.ValueOf(param))
		}
		in = append(in, reflect.ValueOf([]grpc.CallOption{}))

		f := reflect.ValueOf(sitec).MethodByName(proxyFcn)
		if !f.IsValid() {
			return nil, fmt.Errorf("Won't call %s since it does not exist", proxyFcn)
		}
		if f.Type().NumOut() != 2 {
			return nil, fmt.Errorf("Proxied call %s expected to return 2 (return value + error) param but returns %d", proxyFcn, f.Type().NumOut())
		}
		if len(params) != f.Type().NumIn()-2 {
			return nil, fmt.Errorf("function %s needs %d params, %d provided", proxyFcn, f.Type().NumIn(), len(params)+2)
		}
		res := f.CallSlice(in)
		n.log.Debug("Remote call finished successfully", zap.String("First param type", res[0].Kind().String()), zap.String("Second param type", res[1].Kind().String()))
		return res[0].Interface(), res[1].Interface()
	}
	return nil, fmt.Errorf("none of the devices associated with the provided account were reachable")
}
