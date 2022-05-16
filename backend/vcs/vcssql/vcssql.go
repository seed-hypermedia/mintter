package vcssql

import (
	"mintter/backend/core"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
)

func ListAccountDevices(conn *sqlite.Conn) (map[cid.Cid][]cid.Cid, error) {
	list, err := AccountDevicesList(conn)
	if err != nil {
		return nil, err
	}

	out := make(map[cid.Cid][]cid.Cid)

	for _, l := range list {
		did := cid.NewCidV1(uint64(core.CodecDeviceKey), l.DevicesMultihash)
		aid := cid.NewCidV1(uint64(core.CodecAccountKey), l.AccountsMultihash)

		out[aid] = append(out[aid], did)
	}

	return out, nil
}
