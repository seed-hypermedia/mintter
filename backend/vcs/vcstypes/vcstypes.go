package vcstypes

import (
	"context"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

type Repo struct {
	vcs *vcs.SQLite
	me  core.Identity
}

func NewRepo(me core.Identity, v *vcs.SQLite) *Repo {
	return &Repo{me: me, vcs: v}
}

func (r *Repo) GetAccountDeviceProof(ctx context.Context, account, device cid.Cid) ([]byte, error) {
	conn, release, err := r.vcs.DB().Conn(ctx)
	if err != nil {
		return nil, err
	}

	res, err := vcssql.AccountDevicesGetProof(conn, account.Hash(), device.Hash())
	release()
	if err != nil {
		return nil, err
	}

	if res.AccountDevicesProof == nil {
		return nil, fmt.Errorf("account-device not found")
	}

	return res.AccountDevicesProof, nil
}

func (r *Repo) CreateDocument(ctx context.Context) (*Document, error) {
	dp := NewDocumentPermanode(r.me.AccountID())

	blk, err := vcs.EncodeBlock[vcs.Permanode](dp)
	if err != nil {
		return nil, err
	}

	if err := r.vcs.StorePermanode(ctx, blk, dp); err != nil {
		return nil, err
	}

	doc := NewDocument(blk.Cid(), dp.PermanodeOwner(), dp.PermanodeCreateTime())

	return doc, nil
}

func (r *Repo) LoadAccount(ctx context.Context, oid cid.Cid, ver vcs.Version) (*Account, error) {
	var p AccountPermanode

	// If we requested an account key, we need to convert it into an account object id.
	if oid.Prefix().Codec == core.CodecAccountKey {
		p = NewAccountPermanode(oid)
		blk, err := vcs.EncodeBlock[vcs.Permanode](p)
		if err != nil {
			return nil, err
		}
		oid = blk.Cid()
	} else {
		pblk, err := vcs.LoadPermanode[AccountPermanode](ctx, r.vcs.BlockGetter(), oid)
		if err != nil {
			return nil, err
		}

		p = pblk.Value
	}

	if ver.IsZero() {
		vv, err := r.vcs.LoadNamedVersion(ctx, oid, r.me.AccountID(), r.me.DeviceKey().CID(), "main")
		if err != nil {
			return nil, err
		}
		ver = vv
	}

	doc := NewAccount(oid, p.Owner)

	if err := r.vcs.IterateChanges(ctx, oid, ver, func(c vcs.RecordedChange) error {
		var evt []AccountEvent
		if err := cbornode.DecodeInto(c.Body, &evt); err != nil {
			return err
		}

		for _, e := range evt {
			if err := doc.Apply(e, c.CreateTime); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return doc, nil
}

func (r *Repo) LoadPublication(ctx context.Context, oid cid.Cid, ver vcs.Version) (*Document, error) {
	if ver.IsZero() {
		vv, err := r.vcs.LoadNamedVersion(ctx, oid, r.me.AccountID(), r.me.DeviceKey().CID(), "main")
		if err != nil {
			return nil, err
		}
		ver = vv
	}

	pblk, err := vcs.LoadPermanode[DocumentPermanode](ctx, r.vcs.BlockGetter(), oid)
	if err != nil {
		return nil, err
	}

	p := pblk.Value

	doc := NewDocument(oid, p.Owner, p.CreateTime)

	if err := r.vcs.IterateChanges(ctx, oid, ver, func(c vcs.RecordedChange) error {
		var evt []DocumentEvent
		if err := cbornode.DecodeInto(c.Body, &evt); err != nil {
			return err
		}

		for _, e := range evt {
			if err := doc.Apply(e, c.CreateTime); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return doc, nil
}

func (r *Repo) CommitPublication(ctx context.Context, pub *Document, oldVer vcs.Version) (c vcs.RecordedChange, err error) {
	evts := pub.Events()
	if evts == nil {
		return
	}

	body, err := cbornode.DumpObject(evts)
	if err != nil {
		return c, err
	}

	recorded, err := r.vcs.RecordChange(ctx, pub.state.ID, r.me, oldVer, "mintter.Document", body)
	if err != nil {
		return c, err
	}

	newVer := vcs.NewVersion(recorded.LamportTime, recorded.ID)

	if err := r.vcs.StoreNamedVersion(ctx, pub.state.ID, r.me, "main", newVer); err != nil {
		return c, err
	}

	return recorded, nil
}

func (r *Repo) StoreAccountDeviceRegistration(ctx context.Context, account, device cid.Cid, proof RegistrationProof) error {
	conn, release, err := r.vcs.DB().Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func(conn *sqlite.Conn) error {
		adb, err := r.lookupAccountID(conn, account)
		if err != nil {
			return err
		}

		ddb, err := r.lookupDeviceID(conn, device)
		if err != nil {
			return err
		}

		if err := vcssql.AccountDevicesInsertOrIgnore(conn, adb, ddb, proof); err != nil {
			return err
		}

		return nil
	})
}

func (r *Repo) lookupAccountID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	ohash := c.Hash()

	res, err := vcssql.AccountsLookupPK(conn, ohash)
	if err != nil {
		return 0, err
	}

	if res.AccountsID != 0 {
		return res.AccountsID, nil
	}

	insert, err := vcssql.AccountsInsertPK(conn, ohash)
	if err != nil {
		return 0, err
	}

	if insert.AccountsID == 0 {
		return 0, fmt.Errorf("failed to insert account")
	}

	return insert.AccountsID, nil
}

func (r *Repo) lookupDeviceID(conn *sqlite.Conn, c cid.Cid) (int, error) {
	dhash := c.Hash()

	res, err := vcssql.DevicesLookupPK(conn, dhash)
	if err != nil {
		return 0, err
	}

	if res.DevicesID != 0 {
		return res.DevicesID, nil
	}

	insert, err := vcssql.DevicesInsertPK(conn, dhash)
	if err != nil {
		return 0, err
	}

	if insert.DevicesID == 0 {
		return 0, fmt.Errorf("failed to insert account")
	}

	return insert.DevicesID, nil
}
