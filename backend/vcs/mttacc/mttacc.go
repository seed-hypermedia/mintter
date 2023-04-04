// Package mttacc provides a model for retrieving and manipulating Mintter Account Objects.
package mttacc

import (
	"context"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"mintter/backend/vcs/hlc"
	vcsdb "mintter/backend/vcs/sqlitevcs"

	"crawshaw.io/sqlite/sqlitex"
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

	oid := perma.ID

	proof, err := NewRegistrationProof(acc, device.CID())
	if err != nil {
		return c, err
	}

	me := core.NewIdentity(acc.PublicKey, device)

	change := vcs.NewChange(me, oid, nil, vcsdb.KindRegistration, hlc.NewClock().Now(), proof)

	vc, err := change.Block()
	if err != nil {
		return c, err
	}

	defer sqlitex.Save(conn.InternalConn())(&err)
	conn.NewObject(perma)
	conn.StoreChange(vc)
	if err := conn.Err(); err != nil {
		return c, err
	}

	return perma.ID, nil
}
