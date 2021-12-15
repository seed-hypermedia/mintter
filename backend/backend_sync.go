package backend

import (
	"context"
	"errors"
	"fmt"
	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/ipfs"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/peer"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

// SyncAccounts attempts to pull updates for known Mintter Accounts from the connected peers.
func (srv *backend) SyncAccounts(ctx context.Context) error {
	_, err := srv.readyIPFS()
	if err != nil {
		return err
	}

	all, err := srv.db.ListAccountDevices(ctx)
	if err != nil {
		return err
	}

	type result struct {
		Account AccountID
		Device  DeviceID
		Err     error
	}

	var count int
	c := make(chan result)

	me := srv.repo.acc.id

	for a, dd := range all {
		if a.Equals(me) {
			continue
		}

		for _, d := range dd {
			count++
			go func(a AccountID, d DeviceID) {
				pid := d.PeerID()
				err := func() error {
					if err := srv.syncObject(ctx, cid.Cid(a), pid); err != nil {
						return fmt.Errorf("failed to sync account for %s from %s: %w", a, d, err)
					}

					if err := srv.syncObject(ctx, newDocumentFeedID(a), pid); err != nil {
						return fmt.Errorf("failed to sync document feed for %s from %s: %w", a, d, err)
					}

					return err
				}()
				c <- result{Account: a, Device: d, Err: err}
			}(a, d)
		}
	}

	for i := 0; i < count; i++ {
		res := <-c
		err := res.Err
		if err == nil || errors.Is(err, context.Canceled) {
			continue
		}

		log := srv.log.Error
		if s, ok := status.FromError(err); ok && s.Code() == codes.Unavailable {
			log = srv.log.Debug
			err = errors.New("device unavailable")
		}

		log(LogMsgFailedToSyncDeviceAccount,
			zap.Error(err),
			zap.String("device", res.Device.String()),
			zap.String("peer", res.Device.PeerID().String()),
		)
	}

	return nil
}

func (srv *backend) syncObject(ctx context.Context, oid cid.Cid, pid peer.ID) error {
	ocodec, _ := ipfs.DecodeCID(oid)

	var handleFunc func(context.Context, *changeset) error
	switch ocodec {
	case codecAccountID:
		handleFunc = func(ctx context.Context, cs *changeset) error {
			account, err := accountFromState(cs)
			if err != nil {
				return fmt.Errorf("failed to apply account changes: %w", err)
			}

			deviceID := peer.ToCid(pid)
			if _, ok := account.Devices[deviceID.String()]; !ok {
				return fmt.Errorf("device %s is not found in account %s", deviceID, oid)
			}

			if err := srv.db.StoreDevice(ctx, AccountID(oid), DeviceID(deviceID)); err != nil {
				return fmt.Errorf("failed to store device of the connected peer %s: %w", deviceID, err)
			}

			return nil
		}
	case codecDocumentFeed:
		handleFunc = func(ctx context.Context, cs *changeset) error {
			for cs.Next() {
				var dfc DocumentFeedChange
				change := cs.Item()
				if err := dfc.UnmarshalVT(change.Body); err != nil {
					return fmt.Errorf("failed to unmarshal document feed event: %w", err)
				}

				docid, err := cid.Decode(dfc.DocumentPublished)
				if err != nil {
					return fmt.Errorf("failed to parse document id %s: %w", dfc.DocumentPublished, err)
				}

				if codec := docid.Prefix().Codec; codec != codecDocumentID {
					return fmt.Errorf("document change has a bad codec for document id: %s", cid.CodecToStr[codec])
				}

				if err := srv.syncObject(ctx, docid, pid); err != nil {
					return fmt.Errorf("failed to sync document %s: %w", docid, err)
				}
			}

			return nil
		}
	case codecDocumentID:
		handleFunc = func(ctx context.Context, cs *changeset) error {
			pub, err := publicationFromChanges(cs)
			if err != nil {
				return err
			}

			return srv.db.IndexPublication(ctx, oid, pub)
		}
	default:
		return fmt.Errorf("attempting to sync unsupported object type: %s", cid.CodecToStr[ocodec])
	}

	// Get remote version.
	conn, err := srv.dialPeer(ctx, pid)
	if err != nil {
		return err
	}

	c := p2p.NewP2PClient(conn)

	remoteVer, err := c.GetObjectVersion(ctx, &p2p.GetObjectVersionRequest{
		ObjectId: oid.String(),
	})
	if err != nil {
		return err
	}

	localVer, err := srv.GetObjectVersion(ctx, oid)
	if err != nil && err != errNotFound {
		return fmt.Errorf("failed to get local object version for device %s: %w", peer.ToCid(pid), err)
	}

	// TODO: for some reason when this check is removed, we are getting duplicate
	// publications after syncing multiple times. This should not happen.

	if proto.Equal(localVer, remoteVer) {
		return nil
	}

	mergedVer := remoteVer
	if localVer != nil {
		mergedVer = mergeVersions(localVer, remoteVer)
	}

	changes, err := resolvePatches(ctx, oid, mergedVer, srv.p2p.bs)
	if err != nil {
		return err
	}

	if err := handleFunc(ctx, changes); err != nil {
		return err
	}

	return srv.StoreVersion(ctx, mergedVer)
}
