// Package providing implements a mechanism to provide and reprovide CIDs
// on the content routing system (DHT). It stores provided items
// in the TTL blockstore and aims to strike a balance between correctness
// and over-providing.
package providing

import (
	"context"
	"fmt"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	dshelp "github.com/ipfs/go-ipfs-ds-help"
	"github.com/libp2p/go-libp2p-core/routing"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

// Option is a functional option type for provider.
type Option func(*Provider)

// WithProvideTimeout sets timeout for providing a single item.
func WithProvideTimeout(d time.Duration) Option {
	return func(p *Provider) {
		p.provideTimeout = d
	}
}

// WithWorkerCount sets the number of processing workers for providing queue.
func WithWorkerCount(num int) Option {
	return func(p *Provider) {
		p.workerCount = num
	}
}

// WithReprovideTickInterval sets the value for reprovide interval.
// Every tick we try to reprovide all the block, but only provide
// the ones that we need to, by deduplicating using the underlying datastore.
// This can be a lot smaller than the actual reprovide interval required.
func WithReprovideTickInterval(d time.Duration) Option {
	return func(p *Provider) {
		p.reprovideTickInterval = d
	}
}

// WithProvideTTL sets the TTL for provided items.
func WithProvideTTL(d time.Duration) Option {
	return func(p *Provider) {
		p.provideTTL = d
	}
}

type ttlTxn interface {
	datastore.Txn
	datastore.TTL
}

// Provider implements the functionality for providing and reproviding items on the DHT.
type Provider struct {
	ds datastore.TTLDatastore
	rt routing.ContentRouting

	provideTimeout        time.Duration
	reprovideTickInterval time.Duration
	provideTTL            time.Duration
	workerCount           int

	queue chan cid.Cid
}

// New creates a new provider.
func New(rt routing.ContentRouting, ds datastore.TTLDatastore) *Provider {
	return &Provider{
		ds: ds,
		rt: rt,

		provideTimeout:        1 * time.Minute,
		reprovideTickInterval: 2 * time.Hour,
		provideTTL:            6 * time.Hour,
		workerCount:           16,

		queue: make(chan cid.Cid),
	}
}

// Run the provider system. It blocks and will return
// an error if something fails or ctx gets canceled.
func (p *Provider) Run(ctx context.Context) error {
	timer := time.NewTimer(time.Hour)
	if !timer.Stop() {
		<-timer.C
	}
	defer timer.Stop()

	// Wait for routing to be ready.
	// If dual dht get to the wan one
	// If simple dht call routing table size until it's > 0.

	// Start providing workers. They get tasks from the queue and provide.
	g, ctx := errgroup.WithContext(ctx)
	for i := 0; i < p.workerCount; i++ {
		g.Go(func() error {
			return p.worker(ctx)
		})
	}

Loop:
	for {
		// Get all the stuff.
		// Push to the queue.

		// We've drained the timer initially, or it would have fired already in the select
		// bellow, so it's safe to call reset here directly.
		timer.Reset(p.reprovideTickInterval)
		select {
		case <-ctx.Done():
			break Loop
		case <-timer.C:
			continue
		}
	}

	return g.Wait()
}

func (p *Provider) worker(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case cid, ok := <-p.queue:
			if !ok {
				return nil
			}

			// TODO: txn
			if err := p.provide(ctx, nil, cid); err != nil {
				return err
			}
		}
	}
}

func (p *Provider) provide(ctx context.Context, txn interface {
	datastore.TTL
	datastore.Txn
}, c cid.Cid) error {
	key := datastore.NewKey("/providing").Child(dshelp.MultihashToDsKey(c.Hash()))
	provided, err := txn.Has(key)
	if err != nil {
		return fmt.Errorf("failed txn.Has: %w", err)
	}
	if provided {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, p.provideTimeout)
	defer cancel()

	// TODO: add retry with backoff here, or get rid of that at all.
	var retry int
	for retry != 3 {
		err := p.rt.Provide(ctx, c, true)
		if err == nil {
			break
		}

		p.log.Debug("ProvideError", zap.Error(err), zap.String("cid", c.String()))
	}

	if err := txn.PutWithTTL(key, nil, p.provideTTL); err != nil {
		return fmt.Errorf("failed txn.Put: %w", err)
	}

	return nil
}
