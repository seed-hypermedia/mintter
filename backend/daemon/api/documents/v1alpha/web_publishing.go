// Package documents provides the implementation of the Documents gRPC API.
package documents

import (
	context "context"
	"fmt"
	"mintter/backend/core"
	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/mttnet"
	"mintter/backend/mttnet/sitesql"
	"strings"

	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/emptypb"
)

// AddSite checks if the provided site hostname is a valid Mintter site and if so, add it to the database.
func (api *Server) AddSite(ctx context.Context, in *documents.AddSiteRequest) (*documents.SiteConfig, error) {
	if in.Hostname == "" {
		return nil, fmt.Errorf("add site: empty hostname provided")
	}
	if strings.Contains(strings.ToLower(in.Hostname), "notallow") {
		return nil, fmt.Errorf("add site: site " + in.Hostname + " is not a valid site")
	}
	if strings.Contains(strings.ToLower(in.Hostname), "taken") {
		return nil, fmt.Errorf("add site: site " + in.Hostname + " already taken")
	}

	resp, err := mttnet.GetSiteInfoHttp(in.Hostname)
	if err != nil {
		return nil, fmt.Errorf("add site: Could not get site [%s] info via http: %w", in.Hostname, err)
	}
	account, err := core.DecodePrincipal(resp.AccountId)
	if err != nil {
		return nil, fmt.Errorf("add site: got an invalid accountID [%s]: %w", resp.AccountId, err)
	}

	info, err := mttnet.AddrInfoFromStrings(resp.Addresses...)
	if err != nil {
		return nil, fmt.Errorf("add site: couldn't parse multiaddress: %w", err)
	}

	if err = api.disc.Connect(ctx, info); err != nil {
		return nil, fmt.Errorf("add site: couldn't connect to the remote site via p2p: %w", err)
	}

	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("add site: Cannot connect to internal db")
	}
	defer cancel()

	site, err := sitesql.GetSite(conn, in.Hostname)
	if err != nil {
		return nil, err
	}
	if site.SitesHostname == in.Hostname {
		return nil, fmt.Errorf("add site: site %s was already added", in.Hostname)
	}

	// make it a proxy call since we want to talk with the site by attaching headers
	header := metadata.New(map[string]string{mttnet.TargetSiteHostnameHeader: in.Hostname})
	ctx = metadata.NewIncomingContext(ctx, header) // Usually, the headers are written by the client in the outgoing context and server receives them in the incoming. But here we are writing the server directly
	ctx = context.WithValue(ctx, mttnet.TargetSiteAddrsHeader, strings.Join(resp.Addresses, ","))
	ctx = context.WithValue(ctx, mttnet.GRPCOriginAcc, resp.AccountId)
	var role documents.Member_Role
	if in.InviteToken != "" {
		res, err := api.RemoteCaller.RedeemInviteToken(ctx, &documents.RedeemInviteTokenRequest{
			Token: in.InviteToken,
		})
		if err != nil {
			return nil, fmt.Errorf("add site: couldn't redeem the attached token: %w", err)
		}

		role = res.Role
	} else {
		res, err := api.RemoteCaller.RedeemInviteToken(ctx, &documents.RedeemInviteTokenRequest{})
		if err != nil {
			return nil, fmt.Errorf("add site: please, contact to the site owner to get an invite token: %w", err)
		}

		role = res.Role
	}

	if err = sitesql.AddSite(conn, account, strings.Join(resp.Addresses, ","), in.Hostname, int64(role)); err != nil {
		return nil, fmt.Errorf("add site: could not insert site in the database: %w", err)
	}

	return &documents.SiteConfig{
		Hostname: in.Hostname,
		Role:     documents.Member_Role(role),
	}, nil
}

// RemoveSite removes locally a previously added site.
func (api *Server) RemoveSite(ctx context.Context, req *documents.RemoveSiteRequest) (*emptypb.Empty, error) {
	empty := &emptypb.Empty{}
	if req.Hostname == "" {
		return empty, fmt.Errorf("empty hostname")
	}

	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return empty, fmt.Errorf("Cannot connect to internal db")
	}
	defer cancel()
	return empty, sitesql.RemoveSite(conn, req.Hostname)
}

// ListSites lists all the added sites.
func (api *Server) ListSites(ctx context.Context, req *documents.ListSitesRequest) (*documents.ListSitesResponse, error) {
	var s []*documents.SiteConfig
	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return &documents.ListSitesResponse{}, fmt.Errorf("Cannot connect to internal db")
	}
	defer cancel()
	sites, err := sitesql.ListSites(conn)
	if err != nil {
		return &documents.ListSitesResponse{}, fmt.Errorf("Could not list sites: %w", err)
	}
	for _, info := range sites {
		s = append(s, &documents.SiteConfig{
			Hostname: info.SitesHostname,
			Role:     documents.Member_Role(info.SitesRole),
		})
	}
	return &documents.ListSitesResponse{
		Sites: s,
	}, nil
}

// ListWebPublicationRecords returns all the sites where a given document has been published to.
func (api *Server) ListWebPublicationRecords(ctx context.Context, req *documents.ListWebPublicationRecordsRequest) (*documents.ListWebPublicationRecordsResponse, error) {
	var ret []*documents.WebPublicationRecord
	conn, cancel, err := api.db.Conn(ctx)
	if err != nil {
		return &documents.ListWebPublicationRecordsResponse{}, fmt.Errorf("Cannot connect to internal db")
	}
	defer cancel()
	sites, err := sitesql.ListSites(conn)
	if err != nil {
		return &documents.ListWebPublicationRecordsResponse{}, fmt.Errorf("Could not list sites: %w", err)
	}
	for _, siteInfo := range sites {
		header := metadata.New(map[string]string{mttnet.TargetSiteHostnameHeader: siteInfo.SitesHostname})
		ctx = metadata.NewIncomingContext(ctx, header) // Usually, the headers are written by the client in the outgoing context and server receives them in the incoming. But here we are writing the server directly

		ctx = context.WithValue(ctx, mttnet.TargetSiteAddrsHeader, siteInfo.SitesAddresses)
		docs, err := api.RemoteCaller.ListWebPublications(ctx, &documents.ListWebPublicationsRequest{})
		if err != nil {
			continue
		}
		for _, doc := range docs.Publications {
			if req.DocumentId == doc.DocumentId && (req.Version == "" || req.Version == doc.Version) {
				if doc.Hostname != siteInfo.SitesHostname {
					return &documents.ListWebPublicationRecordsResponse{}, fmt.Errorf("found document [%s] in remote site [%s], but the site was added locally as [%s]", req.DocumentId, doc.Hostname, siteInfo.SitesHostname)
				}
				ret = append(ret, &documents.WebPublicationRecord{
					DocumentId: doc.DocumentId,
					Version:    doc.Version,
					Hostname:   doc.Hostname,
					Path:       doc.Path,
				})
			}
		}
	}
	return &documents.ListWebPublicationRecordsResponse{
		Publications: ret,
	}, nil
}
