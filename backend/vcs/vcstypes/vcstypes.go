package vcstypes

import (
	"context"
	"mintter/backend/core"
	"mintter/backend/vcs"

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
