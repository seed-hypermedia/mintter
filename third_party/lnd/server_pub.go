package lnd

import (
	"net"

	"github.com/lightningnetwork/lnd/chainreg"
	"github.com/lightningnetwork/lnd/chanacceptor"
	"github.com/lightningnetwork/lnd/channeldb"
	"github.com/lightningnetwork/lnd/keychain"
	"github.com/lightningnetwork/lnd/kvdb"
	"github.com/lightningnetwork/lnd/lnwallet/btcwallet"
	"github.com/lightningnetwork/lnd/tor"
	"github.com/lightningnetwork/lnd/walletunlocker"
	"github.com/lightningnetwork/lnd/watchtower"
	"github.com/lightningnetwork/lnd/watchtower/wtclient"
)

// Server exposes the internal server type.
type Server struct {
	server
}

// NewServer creates a new instance of the server which is to listen using the
// passed listener address.
func NewServer(cfg *Config,
	listenAddrs []net.Addr,

	graphDB *channeldb.DB,
	chanStateDB *channeldb.DB,
	heightHintDB kvdb.Backend,
	macaroonDB kvdb.Backend,
	decayedLogDB kvdb.Backend,
	towerClientDB wtclient.DB,
	towerServerDB watchtower.DB,
	walletDB btcwallet.LoaderOption,

	cc *chainreg.ChainControl,
	nodeKeyDesc *keychain.KeyDescriptor,
	chansToRestore walletunlocker.ChannelsToRecover,
	chanPredicate chanacceptor.ChannelAcceptor,
	torController *tor.Controller,
) (*server, error) {
	dbs := &databaseInstances{
		graphDB:       graphDB,
		chanStateDB:   chanStateDB,
		heightHintDB:  heightHintDB,
		macaroonDB:    macaroonDB,
		decayedLogDB:  decayedLogDB,
		towerClientDB: towerClientDB,
		towerServerDB: towerServerDB,
		walletDB:      walletDB,
	}

	return newServer(cfg, listenAddrs, dbs, cc, nodeKeyDesc, chansToRestore, chanPredicate, torController)
}
