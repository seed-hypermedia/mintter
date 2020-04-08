package p2p

import (
	crypto "github.com/libp2p/go-libp2p-core/crypto"
	peer "github.com/libp2p/go-libp2p-core/peer"
)

// Node is a Mintter p2p node.
type Node struct {
	ID peer.ID

	privateKey crypto.PrivKey
}
