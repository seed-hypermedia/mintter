package ipfsutil

import blockstore "github.com/ipfs/go-ipfs-blockstore"

var _ blockstore.Blockstore = (*NetworkBlockStore)(nil)
