// Package mttacc provides a model for retrieving and manipulating Mintter Account Objects.
package mttacc

import (
	"context"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"time"

	"github.com/ipfs/go-cid"
)

// Account-related attributes.
const (
	AttrAlias        vcsdb.Attribute = "mintter.account/alias"
	AttrEmail        vcsdb.Attribute = "mintter.account/email"
	AttrBio          vcsdb.Attribute = "mintter.account/bio"
	AttrRegistration vcsdb.Attribute = "mintter.account/registration"
	AttrProof        vcsdb.Attribute = "mintter.account.registration/proof"
	AttrDevice       vcsdb.Attribute = "mintter.account.registration/device"
)

// Register links device under a given account. Returns the CID of the resulting account object.
func Register(ctx context.Context, acc, device core.KeyPair, conn *vcsdb.Conn) (c cid.Cid, err error) {
	aid := acc.CID()

	perma, err := vcs.EncodePermanode(NewAccountPermanode(aid))
	if err != nil {
		return c, err
	}

	obj := conn.NewObject(perma)
	id := conn.EnsureIdentity(core.NewIdentity(acc.PublicKey, device))
	clock := hlc.NewClock()
	change := conn.NewChange(obj, id, nil, clock)

	proof, err := NewRegistrationProof(acc, device.CID())
	if err != nil {
		return c, err
	}

	reg := vcs.NewNodeIDv1(time.Now())

	batch := vcs.NewBatch(clock, device.Abbrev())
	batch.Add(reg, AttrDevice, device.CID())
	batch.Add(reg, AttrProof, []byte(proof))
	batch.Add(vcs.RootNode, AttrRegistration, reg)

	conn.AddDatoms(obj, change, batch.Dirty()...)
	conn.SaveVersion(obj, "main", id, vcsdb.LocalVersion{change})
	conn.EncodeChange(change, device)

	return perma.ID, nil
}

// GetDeviceProof searches for a registration proof of a device under an account.
func GetDeviceProof(conn *vcsdb.Conn, me core.Identity, account, device cid.Cid) (proof []byte, err error) {
	perma, err := vcs.EncodePermanode(NewAccountPermanode(account))
	if err != nil {
		return nil, err
	}

	obj := conn.LookupPermanode(perma.ID)
	localMe := conn.EnsureIdentity(me)
	ver := conn.GetVersion(obj, "main", localMe)
	cs := conn.ResolveChangeSet(obj, ver)

	regs := conn.QueryValuesByAttr(obj, cs, vcs.RootNode, AttrRegistration)
	for regs.Next() {
		rv := regs.Item().ValueAny().(vcs.NodeID)
		dd := conn.QueryLastValue(obj, cs, rv, AttrDevice)
		if !dd.Value.(cid.Cid).Equals(device) {
			continue
		}
		proof := conn.QueryLastValue(obj, cs, rv, AttrProof)
		if err := regs.Close(); err != nil {
			return nil, err
		}
		return proof.Value.([]byte), nil
	}
	if regs.Err() != nil {
		return nil, regs.Err()
	}

	return nil, fmt.Errorf("proof not found")
}
