package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"
)

// ListObjects lists all the local objects.
func (n *RPCHandler) ListObjects(ctx context.Context, in *p2p.ListObjectsRequest) (*p2p.ListObjectsResponse, error) {
	if n.cfg.NoListing {
		return &p2p.ListObjectsResponse{}, nil
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
