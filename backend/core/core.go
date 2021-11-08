package core

import (
	"errors"

	"github.com/libp2p/go-libp2p-core/crypto"
)

/*
Sync objects
======

? Do we need to add object types to the permanode?
	This could be useful for validating different object types.
	Account feed could have valid signatures patches but could invalidate a device so we need to distrust it.

BitSwap adds fetched blocks to block store. Why the fuck.

Get remote heads.
Load existing state.
Resolve missing changes.
Fetch missing changes.
Apply new changes to state.
Store state.

Apply changes to state.

Object as an interface + indexed properties? Single table with predicates.

Managing Changes
======
Load Changes


- [ ] Create blockstore on top of SQLite.
- [ ] Wrap blockstore passed to bitswap with putmany noop.
	- This is to allow fetching blobs without actually storing them until we verify the signatures.
*/

var ErrNotFound = errors.New("not found")

func NewDevice(pk crypto.PrivKey) (Device, error) {
	// TODO
	return Device{}, nil
}
