package main

import (
	"context"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	ipfslite "github.com/hsanjuan/ipfs-lite"
	"github.com/ipfs/go-datastore"
	badger "github.com/ipfs/go-ds-badger"
	"github.com/libp2p/go-libp2p"
	connmgr "github.com/libp2p/go-libp2p-connmgr"
	"github.com/libp2p/go-libp2p-core/crypto"
	host "github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/libp2p/go-libp2p-core/peerstore"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	"github.com/libp2p/go-libp2p-peerstore/pstoreds"
	ma "github.com/multiformats/go-multiaddr"
	"github.com/textileio/go-threads/core/logstore"
	coreservice "github.com/textileio/go-threads/core/service"
	"github.com/textileio/go-threads/logstore/lstoreds"
	"github.com/textileio/go-threads/service"
	"github.com/textileio/go-threads/util"
	"go.uber.org/multierr"
	"google.golang.org/grpc"
)

const (
	defaultIpfsLitePath = "ipfslite"
	defaultLogstorePath = "logstore"
)

func DefaultService(repoPath string, peerKey crypto.PrivKey, opts ...ServiceOption) (sb *ServiceBootstrapper, err error) {
	config := &ServiceConfig{}
	for _, opt := range opts {
		if err := opt(config); err != nil {
			return nil, err
		}
	}

	if config.HostAddr == nil {
		addr, err := ma.NewMultiaddr("/ip4/0.0.0.0/tcp/0")
		if err != nil {
			return nil, err
		}
		config.HostAddr = addr
	}

	ipfsLitePath := filepath.Join(repoPath, defaultIpfsLitePath)
	if err := os.MkdirAll(ipfsLitePath, os.ModePerm); err != nil {
		return nil, err
	}
	litestore, err := ipfslite.BadgerDatastore(ipfsLitePath)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer func() {
		if err != nil {
			litestore.Close()
			cancel()
			return
		}
	}()

	pstore, err := pstoreds.NewPeerstore(ctx, litestore, pstoreds.DefaultOpts())
	if err != nil {
		return
	}

	if peerKey == nil {
		peerKey = util.LoadKey(ipfsLitePath)
	}

	kk, err := crypto.MarshalPrivateKey(peerKey)
	if err != nil {
		return
	}

	err = ioutil.WriteFile(filepath.Join(ipfsLitePath, "key"), kk, 0700)
	if err != nil {
		return
	}

	h, d, err := ipfslite.SetupLibp2p(
		ctx,
		peerKey,
		nil,
		[]ma.Multiaddr{config.HostAddr},
		libp2p.ConnectionManager(connmgr.NewConnManager(100, 400, time.Minute)),
		libp2p.Peerstore(pstore),
	)
	if err != nil {
		return
	}

	lite, err := ipfslite.New(ctx, litestore, h, d, nil)
	if err != nil {
		return
	}

	// Build a logstore
	logstorePath := filepath.Join(repoPath, defaultLogstorePath)
	err = os.MkdirAll(logstorePath, os.ModePerm)
	if err != nil {
		return
	}
	logstore, err := badger.NewDatastore(logstorePath, &badger.DefaultOptions)
	if err != nil {
		return
	}
	tstore, err := lstoreds.NewLogstore(ctx, logstore, lstoreds.DefaultOpts())
	if err != nil {
		cancel()
		if err := logstore.Close(); err != nil {
			return nil, err
		}
		litestore.Close()
		return nil, err
	}

	// Build a service
	api, err := service.NewService(ctx, h, lite.BlockStore(), lite, tstore, service.Config{
		Debug: config.Debug,
	}, config.GRPCOptions...)
	if err != nil {
		cancel()
		if err := logstore.Close(); err != nil {
			return nil, err
		}
		litestore.Close()
		return nil, err
	}

	return &ServiceBootstrapper{
		cancel:    cancel,
		Service:   api,
		litepeer:  lite,
		pstore:    pstore,
		logstore:  logstore,
		lstore:    tstore,
		litestore: litestore,
		host:      h,
		dht:       d,
	}, nil
}

type ServiceConfig struct {
	HostAddr    ma.Multiaddr
	Debug       bool
	GRPCOptions []grpc.ServerOption
}

type ServiceOption func(c *ServiceConfig) error

func WithServiceHostAddr(addr ma.Multiaddr) ServiceOption {
	return func(c *ServiceConfig) error {
		c.HostAddr = addr
		return nil
	}
}

func WithServiceDebug(enabled bool) ServiceOption {
	return func(c *ServiceConfig) error {
		c.Debug = enabled
		return nil
	}
}

func WithServiceGRPCOptions(opts ...grpc.ServerOption) ServiceOption {
	return func(c *ServiceConfig) error {
		c.GRPCOptions = opts
		return nil
	}
}

// ServiceBootstrapper ...
type ServiceBootstrapper struct {
	cancel context.CancelFunc
	coreservice.Service
	litepeer  *ipfslite.Peer
	pstore    peerstore.Peerstore
	logstore  datastore.Datastore
	lstore    logstore.Logstore
	litestore datastore.Datastore
	host      host.Host
	dht       *dht.IpfsDHT
}

// Bootstrap ...
func (tsb *ServiceBootstrapper) Bootstrap(addrs []peer.AddrInfo) {
	tsb.litepeer.Bootstrap(addrs)
}

// GetIpfsLite ...
func (tsb *ServiceBootstrapper) GetIpfsLite() *ipfslite.Peer {
	return tsb.litepeer
}

// Close ...
func (tsb *ServiceBootstrapper) Close() error {
	tsb.cancel()
	return multierr.Combine(
		tsb.dht.Close(),
		tsb.host.Close(),
		tsb.litestore.Close(),
		tsb.logstore.Close(),
		tsb.pstore.Close(),
		tsb.Service.Close(),
	)
}

func getFollowLink(ctx context.Context, svc coreservice.Service) (string, error) {
	// peerID := svc.Host().ID()

	return "", nil
}
