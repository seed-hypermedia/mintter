package relay

import (
	"encoding/hex"
	"fmt"
	"seed/backend/pkg/libp2px"
	"seed/backend/pkg/must"
	"strconv"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/crypto"
	"github.com/libp2p/go-libp2p/core/host"
	rcmgr "github.com/libp2p/go-libp2p/p2p/host/resource-manager"
	"github.com/libp2p/go-libp2p/p2p/net/connmgr"
	"github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
	ma "github.com/multiformats/go-multiaddr"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Relay is a libp2p node that provides a Circuit Relay service.
type Relay struct {
	log  *zap.Logger
	cfg  Config
	host host.Host
}

// NewRelay is used to create a new relay based on both
// configuration file (json with keys, filters, etc) and a logger.
func NewRelay(log *zap.Logger, cfg Config) (*Relay, error) {
	if cfg.PrivKey == "" {
		return nil, fmt.Errorf("config must have private key specified")
	}

	return &Relay{
		log: log,
		cfg: cfg,
	}, nil
}

// Host returns the underlying libp2p host.
func (r *Relay) Host() host.Host {
	return r.host
}

// ID returns the p2p id of the relay in string format.
func (r *Relay) ID() string {
	return r.host.ID().String()
}

// ListeningAddrs returns all libp2p associated listening addresses of the relay.
func (r *Relay) ListeningAddrs() []ma.Multiaddr {
	return r.host.Addrs()
}

// Stop shuts down the relay, its Network, and services.
func (r *Relay) Stop() error {
	return r.host.Close()
}

// Start starts the relay non blocking. Returns nil on success and
// non empty error on error.
func (r *Relay) Start() error {
	keyBytes, err := hex.DecodeString(r.cfg.PrivKey)
	if err != nil {
		return fmt.Errorf("failed to decode private key string: %w", err)
	}
	key, err := crypto.UnmarshalPrivateKey(keyBytes)
	if err != nil {
		return fmt.Errorf("failed to unmarshal private key: %w", err)
	}

	opts := []libp2p.Option{
		libp2p.UserAgent("HyperMediaRelay/0.1"),
		libp2p.Identity(key),
		libp2p.DisableRelay(),
		libp2p.EnableRelayService(relay.WithResources(r.cfg.RelayV2.Resources)),
		libp2p.ListenAddrStrings(libp2px.DefaultListenAddrs(r.cfg.Port)...),
		libp2px.WithPublicAddrsOnly(),
		libp2p.ForceReachabilityPublic(),
		libp2p.ConnectionManager(must.Do2(connmgr.NewConnManager(
			r.cfg.ConnMgr.ConnMgrLo,
			r.cfg.ConnMgr.ConnMgrHi,
			connmgr.WithGracePeriod(r.cfg.ConnMgr.ConnMgrGrace),
		))),
		libp2p.ResourceManager(must.Do2(rcmgr.NewResourceManager(rcmgr.NewFixedLimiter(rcmgr.InfiniteLimits)))),
	}

	r.host, err = libp2p.New(opts...)
	if err != nil {
		return err
	}

	addresses := []zapcore.Field{zap.String("PeerID", r.host.ID().String())}
	for i, addr := range r.host.Addrs() {
		addresses = append(addresses, zap.String("Listening Address "+strconv.FormatInt(int64(i), 10), addr.String()))
	}
	r.log.Info("Relay information", addresses...)

	r.log.Info("RelayV2 is running!")
	return nil
}
