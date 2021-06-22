package backend

import (
	"context"
	"fmt"
	"time"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"

	"mintter/backend/badgergraph"
)

type graphdb struct {
	db *badgergraph.DB
}

// StoreDevice stores the binding between account and device.
func (db *graphdb) StoreDevice(ctx context.Context, aid AccountID, did DeviceID) error {
retry:
	err := db.db.Update(func(txn *badgergraph.Txn) error {
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
	})
	if err == nil {
		return nil
	}

	if err == badger.ErrConflict {
		goto retry
	}

	return fmt.Errorf("failed to store account-device binding %s-%s: %w", aid, did, err)
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

func (db *graphdb) IndexDocument(ctx context.Context,
	docID cid.Cid,
	author AccountID,
	title string,
	createTime, updateTime time.Time,
) error {
	dhash := docID.Hash()
	ahash := author.Hash()

retry:

	err := db.db.Update(func(txn *badgergraph.Txn) error {
		duid, err := txn.UID(typeDocument, dhash)
		if err != nil {
			return err
		}

		auid, err := txn.UID(typeAccount, ahash)
		if err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, pDocumentAuthor, auid); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, pDocumentTitle, title); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, pDocumentCreateTime, createTime.UTC().Format(time.RFC3339)); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, pDocumentUpdateTime, createTime.UTC().Format(time.RFC3339)); err != nil {
			return err
		}

		return nil
	})
	if err == nil {
		return nil
	}

	if err == badger.ErrConflict {
		goto retry
	}

	return fmt.Errorf("failed to index document %s: %w", docID, err)
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
