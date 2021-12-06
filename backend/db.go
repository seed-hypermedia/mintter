package backend

import (
	"context"
	"fmt"
	"time"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"

	"mintter/backend/badgergraph"
	"mintter/backend/db/graphschema"
)

type graphdb struct {
	db *badgergraph.DB
}

// StoreDevice stores the binding between account and device.
func (db *graphdb) StoreDevice(ctx context.Context, aid AccountID, did DeviceID) error {
retry:
	err := db.db.Update(func(txn *badgergraph.Txn) error {
		auid, err := txn.UID(graphschema.TypeAccount, aid.Hash())
		if err != nil {
			return err
		}

		puid, err := txn.UID(graphschema.TypePeer, did.Hash())
		if err != nil {
			return err
		}

		if err := txn.WriteTriple(auid, graphschema.PredAccountPeer, puid); err != nil {
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
		puid, err := txn.UID(graphschema.TypePeer, did.Hash())
		if err != nil {
			return err
		}

		auids, err := txn.ListReverseRelations(graphschema.PredAccountPeer, puid)
		if err != nil {
			return err
		}

		if len(auids) > 1 {
			return fmt.Errorf("found more than one account for peer %s", did)
		}

		ahash, err := txn.XID(graphschema.TypeAccount, auids[0])
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

func (db *graphdb) TouchDraft(ctx context.Context, docID cid.Cid, title, subtitle string, t time.Time) error {
	return db.db.Update(func(txn *badgergraph.Txn) error {
		uid, err := txn.UIDRead(graphschema.TypeDraft, docID.Hash())
		if err != nil {
			return err
		}

		if err := txn.WriteTriple(uid, graphschema.PredDocumentUpdateTime, t); err != nil {
			return err
		}

		// TODO: this implies that the user won't be able to remove title nor subtitle after it's written.
		// Is it worth it?

		if title != "" {
			if err := txn.WriteTriple(uid, graphschema.PredDocumentTitle, title); err != nil {
				return err
			}
		}

		if subtitle != "" {
			if err := txn.WriteTriple(uid, graphschema.PredDocumentSubtitle, subtitle); err != nil {
				return err
			}
		}

		return nil
	})
}

func (db *graphdb) IndexDraft(ctx context.Context,
	docID cid.Cid,
	author AccountID,
	title, subtitle string,
	createTime, updateTime time.Time,
) error {
	dhash := docID.Hash()
	ahash := author.Hash()

retry:

	err := db.db.Update(func(txn *badgergraph.Txn) error {
		duid, err := txn.UID(graphschema.TypeDraft, dhash)
		if err != nil {
			return err
		}

		auid, err := txn.UID(graphschema.TypeAccount, ahash)
		if err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentAuthor, auid); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentTitle, title); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentSubtitle, subtitle); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentCreateTime, createTime); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentUpdateTime, updateTime); err != nil {
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

func (db *graphdb) IndexPublication(ctx context.Context,
	docID cid.Cid,
	author AccountID,
	title, subtitle string,
	createTime, updateTime, publishTime time.Time,
) error {
	dhash := docID.Hash()
	ahash := author.Hash()

retry:

	err := db.db.Update(func(txn *badgergraph.Txn) error {
		duid, err := txn.UID(graphschema.TypePublication, dhash)
		if err != nil {
			return err
		}

		auid, err := txn.UID(graphschema.TypeAccount, ahash)
		if err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentAuthor, auid); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentTitle, title); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentSubtitle, subtitle); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentCreateTime, createTime); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentUpdateTime, updateTime); err != nil {
			return err
		}

		if err := txn.WriteTriple(duid, graphschema.PredDocumentPublishTime, publishTime); err != nil {
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

func (db *graphdb) ListAccountDevices() (map[AccountID][]DeviceID, error) {
	var out map[AccountID][]DeviceID
	if err := db.db.View(func(txn *badgergraph.Txn) error {
		auids, err := txn.ListNodesOfType(graphschema.TypeAccount)
		if err != nil && err != badger.ErrKeyNotFound {
			return err
		}

		if err == badger.ErrKeyNotFound {
			return nil
		}

		out = make(map[AccountID][]DeviceID, len(auids))
		for _, auid := range auids {
			ahash, err := txn.XID(graphschema.TypeAccount, auid)
			if err != nil {
				return err
			}

			aid := AccountID(cid.NewCidV1(codecAccountID, ahash))

			duids, err := txn.ListRelations(auid, graphschema.PredAccountPeer)
			if err != nil {
				return err
			}

			out[aid] = make([]DeviceID, len(duids))

			for i, duid := range duids {
				dhash, err := txn.XID(graphschema.TypePeer, duid)
				if err != nil {
					return err
				}

				out[aid][i] = DeviceID(cid.NewCidV1(cid.Libp2pKey, dhash))
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return out, nil
}

func (db *graphdb) ListAccounts(ctx context.Context) (objects []cid.Cid, err error) {
	if err := db.db.View(func(txn *badgergraph.Txn) error {
		uids, err := txn.ListNodesOfType(graphschema.TypeAccount)
		if err != nil {
			return err
		}

		objects = make([]cid.Cid, len(uids))

		for i, u := range uids {
			hash, err := txn.XID(graphschema.TypeAccount, u)
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
