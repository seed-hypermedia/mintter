package backend

import (
	"context"
	"fmt"
	"mintter/backend/ipfs"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"go.uber.org/multierr"
)

type graphdb struct {
	pool *sqlitex.Pool
}

// StoreDevice stores the binding between account and device.
func (db *graphdb) StoreDevice(ctx context.Context, aid AccountID, did DeviceID) (err error) {
	acodec, ahash := ipfs.DecodeCID(cid.Cid(aid))
	if acodec != codecAccountID {
		panic("BUG: wrong codec for account")
	}

	dcodec, dhash := ipfs.DecodeCID(cid.Cid(did))
	if dcodec != cid.Libp2pKey {
		panic("BUG: wrong codec for device")
	}

	return db.pool.WithTx(ctx, func(conn *sqlite.Conn) error {
		return multierr.Combine(
			accountsInsertOrIgnore(conn, ahash, int(acodec)),
			devicesInsertOrIgnore(conn, dhash, int(dcodec), ahash, int(acodec)),
		)
	})
}

func (db *graphdb) GetAccountForDevice(ctx context.Context, did DeviceID) (aid AccountID, err error) {
	conn, release, err := db.pool.Conn(ctx)
	if err != nil {
		return AccountID{}, err
	}
	defer release()

	res, err := accountsGetForDevice(conn, did.Hash())
	if err != nil {
		return AccountID{}, err
	}

	if res.AccountsMultihash == nil {
		return AccountID{}, errNotFound
	}

	if res.AccountsCodec != int(codecAccountID) {
		return AccountID{}, fmt.Errorf("bad account codec %s", cid.CodecToStr[uint64(res.AccountsCodec)])
	}

	return AccID(cid.NewCidV1(uint64(res.AccountsCodec), res.AccountsMultihash)), nil
}

func (db *graphdb) ListAccountDevices(ctx context.Context) (map[AccountID][]DeviceID, error) {
	conn, release, err := db.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	list, err := devicesList(conn)
	if err != nil {
		return nil, err
	}

	out := make(map[AccountID][]DeviceID)

	for _, l := range list {
		if l.DevicesCodec != cid.Libp2pKey {
			return nil, fmt.Errorf("invalid device codec: %s", cid.CodecToStr[uint64(l.DevicesCodec)])
		}

		if l.AccountsCodec != int(codecAccountID) {
			return nil, fmt.Errorf("invalid account codec: %s", cid.CodecToStr[uint64(l.DevicesCodec)])
		}

		did := DeviceID(cid.NewCidV1(uint64(l.DevicesCodec), l.DevicesMultihash))
		aid := AccID(cid.NewCidV1(uint64(l.AccountsCodec), l.AccountsMultihash))

		out[aid] = append(out[aid], did)
	}

	return out, nil
}
