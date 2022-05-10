package backend

import (
	"mintter/backend/core"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/multiformats/go-multihash"
)

// AccountID is the CID representation of the Mintter Account ID.
type AccountID cid.Cid

func AccID(c cid.Cid) AccountID {
	if c.Prefix().Codec != core.CodecAccountKey {
		panic("BUG: wront account id")
	}

	return AccountID(c)
}

// Hash returns the multihash part of the CID-encoded Account ID.
func (aid AccountID) Hash() multihash.Multihash {
	return cid.Cid(aid).Hash()
}

// Equals check if two Account IDs are equal.
func (aid AccountID) Equals(a AccountID) bool {
	return cid.Cid(aid).Equals(cid.Cid(a))
}

// String returns string representation of the account ID.
func (aid AccountID) String() string {
	return cid.Cid(aid).String()
}

// MarshalBinary implements encoding.BinaryMarshaler.
func (aid AccountID) MarshalBinary() ([]byte, error) {
	return cid.Cid(aid).MarshalBinary()
}

// UnmarshalBinary implements encoding.BinaryUnmarshaler.
func (aid *AccountID) UnmarshalBinary(data []byte) error {
	casted, err := cid.Cast(data)
	if err != nil {
		return err
	}
	*aid = AccID(casted)
	return nil
}

// IsZero checks whether account ID is zero value.
func (aid AccountID) IsZero() bool {
	return !cid.Cid(aid).Defined()
}

// DeviceID is the Libp2p peer ID wrapped as a CID.
type DeviceID cid.Cid

// Hash returns the multihash part of the CID-encoded Device ID.
func (did DeviceID) Hash() multihash.Multihash {
	return cid.Cid(did).Hash()
}

// String returns string representation of the device ID.
func (did DeviceID) String() string {
	return cid.Cid(did).String()
}

// PeerID converts the device ID into Libp2p peer ID.
func (did DeviceID) PeerID() peer.ID {
	pid, err := peer.FromCid(cid.Cid(did))
	if err != nil {
		// This can only happen if there's a bug in our system and it should be caught in tests.
		// DeviceID is supposed to be validated whenever it is instantiated.
		panic(err)
	}

	return pid
}

// Equals checks whether two device IDs are equal.
func (did DeviceID) Equals(d DeviceID) bool {
	return cid.Cid(did).Equals(cid.Cid(d))
}

// MarshalBinary implements encoding.BinaryMarshaler.
func (did DeviceID) MarshalBinary() ([]byte, error) {
	return cid.Cid(did).MarshalBinary()
}

// UnmarshalBinary implements encoding.BinaryUnmarshaler.
func (did *DeviceID) UnmarshalBinary(data []byte) error {
	casted, err := cid.Cast(data)
	if err != nil {
		return err
	}
	*did = DeviceID(casted)
	return nil
}
