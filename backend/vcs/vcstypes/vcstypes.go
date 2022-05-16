package vcstypes

import (
	"context"
	"fmt"
	"mintter/backend/ipfs"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcssql"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
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

	ccodec, chash := ipfs.DecodeCID(changeID)
	ciddb, err := vcssql.IPFSBlocksLookupPK(conn, chash, int(ccodec))
	if err != nil {
		return err
	}

	aiddb, err := vcssql.AccountsLookupPK(conn, c.Author.Hash())
	if err != nil {
		return err
	}

	var (
		alias string
		bio   string
		email string
	)

	for _, evt := range evts {
		switch {
		case evt.AliasChanged != "":
			alias = evt.AliasChanged
		case evt.BioChanged != "":
			bio = evt.BioChanged
		case evt.EmailChanged != "":
			email = evt.EmailChanged
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

	if err := vcssql.AccountsIndexProfile(conn, aiddb.AccountsID, alias, email, bio, ciddb.IPFSBlocksID); err != nil {
		return err
	}

	return nil
}

func (svc *Service) IndexDocumentChange(ctx context.Context, changeID cid.Cid, c vcs.Change, evts []DocumentEvent) error {
	if c.Kind != "mintter.Document" {
		return fmt.Errorf("unexpected change kind for document: %q", c.Kind)
	}

	return nil
}
