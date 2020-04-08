// Package p2p provides networking capabilities for Mintter protocol over libp2p.
package p2p

import (
	"mintter/backend"

	protocol "github.com/libp2p/go-libp2p-protocol"
	"github.com/libp2p/go-libp2p/p2p/protocol/identify"
)

const (
	// ProtocolID for Mintter protocol over libp2p.
	ProtocolID = protocol.ID("/mtt")

	// Default value to give for peer connections in connmanager. Stolen from qri.
	supportValue = 100
	// Under this key we store support flag in the peer store.
	supportKey = "mtt-support"
)

// ServiceTag is type & version of the mtt service.
var ServiceTag = "mtt/" + backend.Version

func init() {
	identify.ClientVersion = ServiceTag
}

// Errors.
const (
	ErrNotConnected        = Error("no p2p connection")
	ErrUnsupportedProtocol = Error("peer doesn't support the Mintter protocol")
)

// Error is a constant type for errors.
type Error string

func (e Error) Error() string {
	return string(e)
}
