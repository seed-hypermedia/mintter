package mttnet

import (
	"context"
	"fmt"
	"mintter/backend/db/sqliteschema"
	site "mintter/backend/genproto/documents/v1alpha"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/mttnet/sitesql"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
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

	conn, release, err := n.vcs.DB().Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	const q = `
SELECT
	` + sqliteschema.C_ChangesDerefObjectCodec + `,
	` + sqliteschema.C_ChangesDerefObjectHash + `,
	` + sqliteschema.C_ChangesDerefChangeCodec + `,
	` + sqliteschema.C_ChangesDerefChangeHash + `
FROM ` + sqliteschema.T_ChangesDeref + `
WHERE ` + sqliteschema.C_ChangesDerefIsDraft + ` = 0;`

	var (
		objectCodec int
		objectHash  []byte
		changeCodec int
		changeHash  []byte
	)
	objMap := make(map[cid.Cid][]cid.Cid)

	if err := sqlitex.Exec(conn, q, func(stmt *sqlite.Stmt) error {
		stmt.Scan(&objectCodec, &objectHash, &changeCodec, &changeHash)

		oid := cid.NewCidV1(uint64(objectCodec), objectHash)
		chid := cid.NewCidV1(uint64(changeCodec), changeHash)
		objMap[oid] = append(objMap[oid], chid)
		return nil
	}); err != nil {
		return nil, err
	}

	out := &p2p.ListObjectsResponse{
		Objects: make([]*p2p.Object, 0, len(objMap)),
	}

	for obj, changes := range objMap {
		objpb := &p2p.Object{
			Id:        obj.String(),
			ChangeIds: make([]string, len(changes)),
		}

		for i, c := range changes {
			objpb.ChangeIds[i] = c.String()
		}

		out.Objects = append(out.Objects, objpb)
	}

	return out, nil
}
