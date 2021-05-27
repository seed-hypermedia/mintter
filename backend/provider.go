package backend

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

type providerOption func(*providing)

func withProvideTimeout(d time.Duration) providerOption {
	return func(p *providing) {
		p.provideTimeout = d
	}
}

func withProviderWorkers(num int) providerOption {
	return func(p *providing) {
		p.providerWorkers = num
	}
}

type ttlStore interface {
	datastore.TTL
	NewTransaction(readOnly bool) (datastore.Txn, error)
	Batch() (datastore.Batch, error)
}

type providing struct {
	rt              routing.ContentRouting
	log             *zap.Logger
	provideTTL      time.Duration
	reprovideTick   time.Duration
	providerWorkers int
	provideC        chan cid.Cid
	provideTimeout  time.Duration
	ds              ttlStore
}

func newProvider(rt routing.ContentRouting, log *zap.Logger, opts ...providerOption) *providing {
	prov := &providing{
		rt:              rt,
		log:             log,
		providerWorkers: 16,
		provideTimeout:  1 * time.Minute,
		provideTTL:      5 * time.Hour,
		reprovideTick:   2 * time.Hour,
	}

	for _, o := range opts {
		o(prov)
	}

	prov.provideC = make(chan cid.Cid, prov.providerWorkers*2)

	return prov
}

func (p *providing) Run(ctx context.Context) error {
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
	for i := 0; i < p.providerWorkers; i++ {
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
		timer.Reset(p.reprovideTick)
		select {
		case <-ctx.Done():
			break Loop
		case <-timer.C:
			continue
		}
	}

	return g.Wait()
}

func (p *providing) worker(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case cid, ok := <-p.provideC:
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

func (p *providing) provide(ctx context.Context, txn interface {
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
