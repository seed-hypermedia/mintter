package relay

import (
	"strconv"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/host"
	relay_v1 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv1/relay"
	relay_v2 "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	connmgr "github.com/libp2p/go-libp2p-connmgr"
	ma "github.com/multiformats/go-multiaddr"
	manet "github.com/multiformats/go-multiaddr/net"
)

// Relay is the may struct to hold all the relay operations
type Relay struct {
	log     *zap.Logger    // The logger to write messages
	cfg     Config         // The configuration struct. Congifured via file only
	privKey crypto.PrivKey // Private key of the node
	host    host.Host      // Libp2p host (ID+Addresses)
}

// NewRelay is used to create a new relay based on both
// configuration cfg and private key priv_k. A logger must be provided
// as well
func NewRelay(log *zap.Logger, cfg Config, privK crypto.PrivKey) (*Relay, error) {
	return &Relay{
		log:     log,
		cfg:     cfg,
		privKey: privK,
	}, nil
}

// ID returns the p2p id of the relay in string format
func (r *Relay) ID() string {
	return r.host.ID().Pretty()
}

// ListeningAddrs returns all libp2p associated listening addresses of the relay.
func (r *Relay) ListeningAddrs() []ma.Multiaddr {
	return r.host.Addrs()
}

// Stop shuts down the relay, its Network, and services.
func (r *Relay) Stop() error {
	return r.host.Close()
}

// Start starts the relay non blocking. Returns nil on success an
// non empty error on error
func (r *Relay) Start() error {
	var opts []libp2p.Option

	// generate the options from the configuration passed at init time
	opts = append(opts,
		libp2p.UserAgent("relayd/1.0"),
		libp2p.Identity(r.privKey),
		libp2p.DisableRelay(),
		libp2p.ListenAddrStrings(r.cfg.Network.ListenAddrs...),
	)

	if len(r.cfg.Network.AnnounceAddrs) > 0 {
		var announce []ma.Multiaddr
		for _, s := range r.cfg.Network.AnnounceAddrs {
			a := ma.StringCast(s)
			announce = append(announce, a)
		}
		opts = append(opts,
			libp2p.AddrsFactory(func([]ma.Multiaddr) []ma.Multiaddr {
				return announce
			}),
		)
	} else {
		opts = append(opts,
			libp2p.AddrsFactory(func(addrs []ma.Multiaddr) []ma.Multiaddr {
				announce := make([]ma.Multiaddr, 0, len(addrs))
				for _, a := range addrs {
					if manet.IsPublicAddr(a) {
						announce = append(announce, a)
					}
				}
				return announce
			}),
		)
	}

	// Configure how many nodes will the relay accept
	mustConnMgr := func(mgr *connmgr.BasicConnMgr, err error) *connmgr.BasicConnMgr {
		if err != nil {
			panic(err)
		}
		return mgr
	}

	cm := mustConnMgr(connmgr.NewConnManager(
		r.cfg.ConnMgr.ConnMgrLo,
		r.cfg.ConnMgr.ConnMgrHi,
		connmgr.WithGracePeriod(r.cfg.ConnMgr.ConnMgrGrace),
	))

	opts = append(opts,
		libp2p.ConnectionManager(cm),
	)

	var err error
	r.host, err = libp2p.New(opts...)
	if err != nil {
		return err
	}

	addresses := []zapcore.Field{zap.String("PeerID", r.host.ID().Pretty())}
	for i, addr := range r.host.Addrs() {
		addresses = append(addresses, zap.String("Listening Address "+strconv.FormatInt(int64(i), 10), addr.String()))
	}
	r.log.Info("Relay information", addresses...)

	/*acl, err := NewACL(r.host, r.cfg.ACL)
	if err != nil {
		return err
	}*/

	if r.cfg.RelayV1.Enabled {
		_, err = relay_v1.NewRelay(r.host,
			relay_v1.WithResources(r.cfg.RelayV1.Resources), /*
				relay_v1.WithACL(acl)*/)
		if err != nil {
			return err
		}
		r.log.Info("RelayV1 is running!")
	}

	if r.cfg.RelayV2.Enabled {
		_, err = relay_v2.New(r.host,
			relay_v2.WithResources(r.cfg.RelayV2.Resources), /*
				relay_v2.WithACL(acl)*/)
		if err != nil {
			return err
		}
		r.log.Info("RelayV2 is running!")
	}
	return nil
}
