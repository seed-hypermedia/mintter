package backend

import (
	"context"
	"fmt"

	"github.com/ipfs/go-cid"

	"mintter/backend/badgergraph"
)

type graphdb struct {
	db *badgergraph.DB
}

// StoreDevice stores the binding between account and device.
func (db *graphdb) StoreDevice(ctx context.Context, aid AccountID, did DeviceID) error {
	if err := db.db.Update(func(txn *badgergraph.Txn) error {
		auid, err := txn.UID(typeAccount, aid.Hash())
		if err != nil {
			return err
		}

		puid, err := txn.UID(typePeer, did.Hash())
		if err != nil {
			return err
		}

		if err := txn.WriteTriple(auid, pAccountPeer, puid); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return fmt.Errorf("failed to store account-device binding %s-%s: %w", aid, did, err)
	}

	return nil
}

func (db *graphdb) GetDeviceAccount(ctx context.Context, did DeviceID) (aid AccountID, err error) {
	if err := db.db.View(func(txn *badgergraph.Txn) error {
		puid, err := txn.UID(typePeer, did.Hash())
		if err != nil {
			return err
		}

		auids, err := txn.ListReverseRelations(pAccountPeer.FullName(), puid)
		if err != nil {
			return err
		}

		if len(auids) > 1 {
			return fmt.Errorf("found more than one account for peer %s", did)
		}

		ahash, err := txn.XID(typeAccount, auids[0])
		if err != nil {
			return err
		}

		aid = AccountID(cid.NewCidV1(codecAccountID, ahash))

		return nil
	}); err != nil {
		return AccountID{}, fmt.Errorf("failed to get account for device %s: %w", did, err)
	}

	return aid, nil
}

func (db *graphdb) ListAccounts(ctx context.Context) (objects []cid.Cid, err error) {
	if err := db.db.View(func(txn *badgergraph.Txn) error {
		uids, err := txn.ListIndexedNodes(badgergraph.NodeTypePredicate().FullName(), []byte(typeAccount))
		if err != nil {
			return err
		}

		objects = make([]cid.Cid, len(uids))

		for i, u := range uids {
			hash, err := txn.XID(typeAccount, u)
			if err != nil {
				return err
			}

			objects[i] = cid.NewCidV1(codecAccountID, hash)
		}

		return nil
	}); err != nil {
		return nil, fmt.Errorf("failed to get account uids: %w", err)
	}

	return objects, nil
}
