package mttnet

import (
	"context"
	"mintter/backend/core"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"

	"github.com/ipfs/go-cid"
)

func (n *rpcHandler) ListObjects(ctx context.Context, in *p2p.ListObjectsRequest) (*p2p.ListObjectsResponse, error) {
	me := n.me.AccountID()

	refs, err := n.vcs.ListVersionsByOwner(ctx, me)
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

type SyncResult struct {
	Devices       []cid.Cid
	Errs          []error
	NumSyncOK     int
	NumSyncFailed int
}

func (n *Node) Sync(ctx context.Context) (res SyncResult, err error) {
	// We only want one sync loop running at a time.
	v, err, _ := n.singleflight.Do("sync", func() (any, error) {
		conn, release, err := n.vcs.DB().Conn(ctx)
		if err != nil {
			return res, err
		}
		devices, err := vcssql.DevicesList(conn)
		release()
		if err != nil {
			return res, err
		}

		res.Devices = make([]cid.Cid, len(devices))
		res.Errs = make([]error, len(devices))

		// TODO: make this concurrent.
		for i, dev := range devices {
			did := cid.NewCidV1(core.CodecDeviceKey, dev.DevicesMultihash)
			res.Devices[i] = did

			err := n.syncWithPeer(ctx, did)
			if err == errDialSelf {
				err = nil
			}

			res.Errs[i] = err

			if err == nil {
				res.NumSyncOK++
			} else {
				res.NumSyncFailed++
			}
		}

		return res, nil
	})

	return v.(SyncResult), err
}

func (n *Node) syncWithPeer(ctx context.Context, device cid.Cid) error {
	c, err := n.RPCClient(ctx, device)
	if err != nil {
		return err
	}

	resp, err := c.ListObjects(ctx, &p2p.ListObjectsRequest{})
	if err != nil {
		return err
	}

	sess := n.bitswap.NewSession(ctx)
	for _, obj := range resp.Objects {
		oid, err := cid.Decode(obj.Id)
		if err != nil {
			return err
		}

		for _, ver := range obj.VersionSet {
			vv, err := vcs.ParseVersion(ver.Version)
			if err != nil {
				return err
			}
			// TODO: pass in identity information of the remote version, not our own.
			if err := n.syncer.SyncFromVersion(ctx, n.me.AccountID(), n.me.DeviceKey().CID(), oid, sess, vv); err != nil {
				return err
			}
		}
	}
	return nil
}
