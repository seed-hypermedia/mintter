package lndclient

import (
	"errors"

	"github.com/btcsuite/btcd/chaincfg"
)

// Network defines the chain that we operate on.
type Network string

const (
	// NetworkMainnet is bitcoin mainnet.
	NetworkMainnet Network = "mainnet"

	// NetworkTestnet is bitcoin testnet.
	NetworkTestnet Network = "testnet"

	// NetworkRegtest is bitcoin regtest.
	NetworkRegtest Network = "regtest"

	// NetworkSimnet is bitcoin simnet.
	NetworkSimnet Network = "simnet"
)

// ChainParams returns chain parameters based on a network name.
func (n Network) ChainParams() (*chaincfg.Params, error) {
	switch n {
	case NetworkMainnet:
		return &chaincfg.MainNetParams, nil

	case NetworkTestnet:
		return &chaincfg.TestNet3Params, nil

	case NetworkRegtest:
		return &chaincfg.RegressionNetParams, nil

	case NetworkSimnet:
		return &chaincfg.SimNetParams, nil

	default:
		return nil, errors.New("unknown network")
	}
}
