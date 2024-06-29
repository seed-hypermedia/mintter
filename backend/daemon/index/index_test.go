package index

import "github.com/ipfs/boxo/blockstore"

var _ blockstore.Blockstore = (*Index)(nil)
