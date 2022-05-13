package vcssql

import (
	"fmt"
	"mintter/backend/core"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
)

func ListAccountDevices(conn *sqlite.Conn) (map[cid.Cid][]cid.Cid, error) {
	list, err := DevicesList(conn)
	if err != nil {
		return nil, err
	}

	out := make(map[cid.Cid][]cid.Cid)

	for _, l := range list {
		if l.DevicesCodec != core.CodecDeviceKey {
			return nil, fmt.Errorf("invalid device codec: %s", cid.CodecToStr[uint64(l.DevicesCodec)])
		}

		if l.AccountsCodec != core.CodecAccountKey {
			return nil, fmt.Errorf("invalid account codec: %s", cid.CodecToStr[uint64(l.DevicesCodec)])
		}

		did := cid.NewCidV1(uint64(l.DevicesCodec), l.DevicesMultihash)
		aid := cid.NewCidV1(uint64(l.AccountsCodec), l.AccountsMultihash)

		out[aid] = append(out[aid], did)
	}

	return out, nil
}
