package mttnet

import (
	"context"
	"fmt"
	site "mintter/backend/genproto/documents/v1alpha"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/mttnet/sitesql"

	"go.uber.org/zap"
)

// ListObjects lists all the local objects.
func (srv *Server) ListObjects(ctx context.Context, in *p2p.ListObjectsRequest) (*p2p.ListObjectsResponse, error) {
	n, ok := srv.Node.Get()
	if !ok {
		return nil, fmt.Errorf("Node not ready yet")
	}
	if n.cfg.NoListing && srv.Site.hostname == "" {
		return &p2p.ListObjectsResponse{}, nil
	}

	if srv.Site.hostname != "" { //means this is a site. Sites don't sync out to every peer. Only peers that are subscribed to that site if NoLIsting is true
		remoteDeviceID, err := getRemoteID(ctx)
		if err != nil {
			n.log.Warn("Couldn't get remote caller in ListObjects.", zap.Error(err))
			return &p2p.ListObjectsResponse{}, fmt.Errorf("couldn't get account ID from device [%s]: %w", remoteDeviceID.String(), err)
		}
		remotAcc, err := n.AccountForDevice(ctx, remoteDeviceID)
		if err != nil {
			return &p2p.ListObjectsResponse{}, fmt.Errorf("couldn't get account ID from device [%s]: %w", remoteDeviceID.String(), err)
		}
		conn, cancel, err := n.vcs.DB().Conn(ctx)
		if err != nil {
			return &p2p.ListObjectsResponse{}, fmt.Errorf("Cannot connect to internal db: %w", err)
		}
		defer cancel()

		role, err := sitesql.GetMemberRole(conn, remotAcc)
		if (err != nil || role == site.Member_ROLE_UNSPECIFIED) && n.cfg.NoListing {
			n.log.Debug("Not serving content to remote peer since is not a site member", zap.String("remote AccountID", remotAcc.String()),
				zap.Error(err), zap.Int("Role", int(role)))
			return &p2p.ListObjectsResponse{}, nil
		}
		n.log.Debug("Allowing site content", zap.String("remote AccountID", remotAcc.String()), zap.Int("role", int(role)), zap.Bool("noListing", n.cfg.NoListing))
	}

	conn, release, err := n.vcs.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	if err := conn.BeginTx(false); err != nil {
		return nil, err
	}
	refs := conn.ListAllVersions("main")

	out := &p2p.ListObjectsResponse{
		Objects: make([]*p2p.Object, 0, len(refs)),
	}

	for obj, vers := range refs {
		objpb := &p2p.Object{
			Id:         obj.String(),
			VersionSet: make([]*p2p.Version, len(vers)),
		}

		for i, ver := range vers {
			objpb.VersionSet[i] = &p2p.Version{
				AccountId: ver.Account.String(),
				DeviceId:  ver.Device.String(),
				Version:   ver.Version.String(),
			}
		}

		out.Objects = append(out.Objects, objpb)
	}

	if err := conn.Commit(); err != nil {
		return nil, err
	}

	return out, nil
}
