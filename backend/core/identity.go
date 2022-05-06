package core

import "github.com/ipfs/go-cid"

type Identity struct {
	account       cid.Cid
	deviceKeyPair KeyPair
}

func NewIdentity(acc cid.Cid, device KeyPair) Identity {
	if acc.Prefix().Codec != CodecAccountKey {
		panic("not account key")
	}

	if device.Codec() != CodecDeviceKey {
		panic("not device key")
	}

	return Identity{
		account:       acc,
		deviceKeyPair: device,
	}
}

func (i Identity) AccountID() cid.Cid { return i.account }

func (i Identity) DeviceKey() KeyPair { return i.deviceKeyPair }
