package mttnet

import (
	"context"
	"fmt"
	site "mintter/backend/genproto/documents/v1alpha"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/hyper/hypersql"
	"mintter/backend/mttnet/sitesql"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"go.uber.org/zap"
	"golang.org/x/exp/maps"
)

// ListObjects lists all the local objects.
func (srv *Server) ListObjects(ctx context.Context, in *p2p.ListObjectsRequest) (*p2p.ListObjectsResponse, error) {
	n, err := srv.Node.Await(ctx)
	if err != nil {
		return nil, fmt.Errorf("node is not ready yet: %w", err)
	}

	if n.cfg.NoListing && srv.Site.hostname == "" {
		return &p2p.ListObjectsResponse{}, nil
	}

	if srv.Site.hostname != "" { //means this is a site. Sites don't sync out to every peer. Only peers that are subscribed to that site if NoLIsting is true
		remoteDeviceID, err := getRemoteID(ctx)
		if err != nil {
			n.log.Warn("Couldn't get remote caller in ListObjects.", zap.Error(err))
			return nil, fmt.Errorf("couldn't get account ID from device [%s]: %w", remoteDeviceID.String(), err)
		}

		remotAcc, err := n.AccountForDevice(ctx, remoteDeviceID)
		if err != nil {
			return nil, fmt.Errorf("couldn't get account ID from device [%s]: %w", remoteDeviceID.String(), err)
		}

		conn, cancel, err := n.db.Conn(ctx)
		if err != nil {
			return nil, fmt.Errorf("Cannot connect to internal db: %w", err)
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

	objs := map[hyper.EntityID]*p2p.Object{}

	if err := n.blobs.Query(ctx, func(conn *sqlite.Conn) error {
		list, err := hypersql.ChangesListPublicNoData(conn)
		if err != nil {
			return err
		}

		for _, l := range list {
			eid := hyper.EntityID(l.ChangesViewEntity)
			obj, ok := objs[eid]
			if !ok {
				obj = &p2p.Object{
					Id: string(eid),
				}
				objs[eid] = obj
			}

			c := cid.NewCidV1(uint64(l.ChangesViewCodec), l.ChangesViewMultihash)
			obj.ChangeIds = append(obj.ChangeIds, c.String())
		}

		return nil
	}); err != nil {
		return nil, err
	}

	out := &p2p.ListObjectsResponse{
		Objects: maps.Values(objs),
	}

	return out, nil
}
