package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"
)

func (n *rpcHandler) ListObjects(ctx context.Context, in *p2p.ListObjectsRequest) (*p2p.ListObjectsResponse, error) {
	refs, err := n.vcs.ListAllVersions(ctx)
	if err != nil {
		return nil, err
	}

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

	return out, nil
}
