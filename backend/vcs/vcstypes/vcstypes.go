package vcstypes

import (
	"context"
	"fmt"
	"mintter/backend/ipfs"
	"mintter/backend/pkg/must"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
)

type Service struct {
	db  *sqlitex.Pool
	vcs *vcs.SQLite
}

func NewService(db *sqlitex.Pool) *Service {
	return &Service{
		db:  db,
		vcs: vcs.New(db),
	}
}

func (svc *Service) IndexAccountChange(ctx context.Context, changeID cid.Cid, c vcs.Change, evts []AccountEvent) error {
	if c.Kind != "mintter.Account" {
		return fmt.Errorf("unexpected change kind for account: %q", c.Kind)
	}

	conn, release, err := svc.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	ocodec, ohash := ipfs.DecodeCID(c.Object)

	oiddb, err := vcssql.IPFSBlocksLookupPK(conn, ohash, int(ocodec))
	if err != nil {
		return err
	}

	ccodec, chash := ipfs.DecodeCID(changeID)
	ciddb, err := vcssql.IPFSBlocksLookupPK(conn, chash, int(ccodec))
	if err != nil {
		return err
	}

	aiddb, err := vcssql.AccountsLookupPK(conn, c.Author.Hash())
	if err != nil {
		return err
	}

	addAttr := func(name string, value []byte) error {
		return vcssql.ObjectIndexInsertOrIgnore(conn, oiddb.IPFSBlocksID, name, ciddb.IPFSBlocksID, value)
	}

	for _, evt := range evts {
		switch {
		case evt.AliasChanged != "":
			if err := addAttr("alias", must.Two(cbornode.DumpObject(evt.AliasChanged))); err != nil {
				return err
			}
		case evt.BioChanged != "":
			if err := addAttr("bio", must.Two(cbornode.DumpObject(evt.BioChanged))); err != nil {
				return err
			}
		case evt.EmailChanged != "":
			if err := addAttr("email", must.Two(cbornode.DumpObject(evt.EmailChanged))); err != nil {
				return err
			}
		case evt.DeviceRegistered.Proof != nil:
			var diddb int
			{
				dhash := evt.DeviceRegistered.Device.Hash()
				ddb, err := vcssql.DevicesLookupPK(conn, dhash)
				if err != nil {
					return err
				}
				diddb = ddb.DevicesID

				if diddb == 0 {
					ddb, err := vcssql.DevicesInsertPK(conn, dhash)
					if err != nil {
						return err
					}
					diddb = ddb.DevicesID
				}
			}

			// TODO: avoid unnecessary insert query if not needed.

			// TODO: verify proof, and store in revoked table if it's bad.

			if err := vcssql.AccountDevicesInsertOrIgnore(conn, aiddb.AccountsID, diddb, ciddb.IPFSBlocksID); err != nil {
				return err
			}
		default:
			return fmt.Errorf("BUG: unknown account event type: %+v", evt)
		}
	}

	return nil
}

func (svc *Service) IndexDocumentChange(ctx context.Context, changeID cid.Cid, c vcs.Change, evts []DocumentEvent) error {
	if c.Kind != "mintter.Document" {
		return fmt.Errorf("unexpected change kind for document: %q", c.Kind)
	}

	return nil
}
