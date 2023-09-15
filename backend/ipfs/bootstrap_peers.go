// NOTE: copied from go-ipfs/config/bootstrap_peers.go

package ipfs

// DefaultBootstrapAddresses are the hardcoded bootstrap addresses
// for IPFS. they are nodes run by the IPFS team. docs on these later.
// As with all p2p networks, bootstrap is an important security concern.
//
// NOTE: This is here -- and not inside cmd/ipfs/init.go -- because of an
// import dependency issue. TODO: move this into a config/default/ package.
var DefaultBootstrapAddresses = []string{
	"/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
	"/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
	"/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
	"/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
	"/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",      // mars.i.ipfs.io
	"/ip4/104.131.131.82/udp/4001/quic/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ", // mars.i.ipfs.io
	"/ip4/23.20.24.146/tcp/55001/p2p/12D3KooWAAmbS5QL7vcf9A9r5A4Q3qhs8ZH8gPwXQixrS8FWD28w", // mintter gateway
}
