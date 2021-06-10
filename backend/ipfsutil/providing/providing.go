// Package providing implements a mechanism to provide and reprovide CIDs
// on the content routing system (DHT). It stores provided items
// in the TTL blockstore and aims to strike a balance between correctness
// and over-providing.
package providing

import (
	"context"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-log/v2"
	"go.etcd.io/bbolt"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
)

var logger = log.Logger("providing")

// Strategy is a function that returns items to be reprovided.
type Strategy func(context.Context) (<-chan cid.Cid, error)

// Provider implements the functionality for providing and reproviding items on the DHT.
type Provider struct {
	// ProvideTimeout is the max duration of the Provide call of the Routing.
	ProvideTimeout time.Duration

	// ReprovideTickInterval is the interval for internal tick of the reprovide process.
	// On each tick provider will attempt to reprovide all the records, but will do that
	// only if needed (new records or if the last provide time was longer than provide TTL value).
	ReprovideTickInterval time.Duration

	// ProvideTTL is the time after which the record should be reprovided again. Normally records
	// on the IPFS DHT should be reprovided every 12 hours, sometimes it's set to 6 hours, and
	// libp2p discovery system reprovides records every 3 hours. YMMV.
	//
	// Reproviding happens only at tick times. TTL should be set so that it's tolerable to delay
	// until the next tick happens.
	ProvideTTL time.Duration

	rt       Routing
	strategy Strategy
	db       *bbolt.DB
}

var bucketProvided = []byte("/provided/")

// Routing is a subset of the routing.ContentRouting interface.
type Routing interface {
	Provide(context.Context, cid.Cid, bool) error
}

// New creates a new provider using filename to open BoltDB database which will be used for storing
// last provide times for provided items.
func New(filename string, rt Routing, s Strategy) (*Provider, error) {
	opts := *bbolt.DefaultOptions
	opts.Timeout = 10 * time.Second
	// We can disable freelist sync because our database will
	// be pretty small, and we don't even do deletes now.
	opts.NoFreelistSync = true

	db, err := bbolt.Open(filename, 0666, &opts)
	if err != nil {
		return nil, fmt.Errorf("failed to open bolt database: %w", err)
	}

	prov := &Provider{
		ProvideTimeout:        1 * time.Minute,
		ReprovideTickInterval: 1 * time.Hour,
		ProvideTTL:            6 * time.Hour,

		rt:       rt,
		db:       db,
		strategy: s,
	}

	if err := prov.db.Update(func(txn *bbolt.Tx) error {
		_, err := txn.CreateBucketIfNotExists(bucketProvided)
		return err
	}); err != nil {
		return nil, err
	}

	return prov, nil
}

// Close closes the provider.
func (p *Provider) Close() error {
	return p.db.Close()
}

// StartReproviding starts the reprovider. It blocks and returns
// an error if something fails or ctx gets canceled.
// Caller should make sure routing is ready before calling this.
func (p *Provider) StartReproviding(ctx context.Context) (err error) {
	// Create a timer that would fire immediately.
	timer := time.NewTimer(time.Millisecond)
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timer.C:
			// TODO: batch size is arbitrary. In future, we could get estimated number of blocks to reprovide,
			// and adjust batch size dynamically. If we have lots of blocks, but batch size is too small, we
			// could overload the routing system.
			const batchSize = 10

			if err := p.reprovideAll(ctx, batchSize); err != nil {
				return err
			}

			timer.Reset(p.ReprovideTickInterval)
		}
	}
}

// Provide is used to provide a single record. It's blocking, and it will
// check the last provide time for this item, and only provide if needed.
// Caller should make sure routing is ready to provide before calling Provide.
func (p *Provider) Provide(ctx context.Context, c cid.Cid) error {
	var shouldProvide bool
	if err := p.db.View(func(txn *bbolt.Tx) error {
		shouldProvide = p.shouldProvide(ctx, txn, c)
		return nil
	}); err != nil {
		return err
	}

	if !shouldProvide {
		return nil
	}

	if err := p.provideOne(ctx, c); err != nil {
		return fmt.Errorf("failed to provide record %s: %w", c, err)
	}

	if err := p.db.Update(func(txn *bbolt.Tx) error {
		txn.Bucket(bucketProvided).Put(c.Bytes(), encodeUint64(uint64(time.Now().Unix())))

		return nil
	}); err != nil {
		return fmt.Errorf("failed to store provide record %s: %w", c, err)
	}

	return nil
}

func (p *Provider) reprovideAll(ctx context.Context, batchSize int) error {
	ch, err := p.strategy(ctx)
	if err != nil {
		return fmt.Errorf("failed to call strategy: %w", err)
	}
	// TODO: get stats about how many blocks we have, and adjust the batch size dynamically.
	nextBatch := make([]cid.Cid, 0, batchSize)

	g, ctx := errgroup.WithContext(ctx)

	handleBatch := func(batch []cid.Cid) {
		g.Go(func() error {
			times := make([]uint64, len(batch))
			if err := p.db.View(func(txn *bbolt.Tx) error {
				for i, c := range batch {
					if !p.shouldProvide(ctx, txn, c) {
						continue
					}

					if err := p.provideOne(ctx, c); err != nil {
						logger.Debug("ProvideError", zap.Error(err), zap.String("cid", c.String()))
						continue
					}

					times[i] = uint64(time.Now().Unix())
				}
				return nil
			}); err != nil {
				return err
			}

			if err := p.db.Batch(func(txn *bbolt.Tx) error {
				for i, at := range times {
					if at == 0 {
						continue
					}

					if err := txn.Bucket(bucketProvided).Put(batch[i].Bytes(), encodeUint64(at)); err != nil {
						return err
					}
				}
				return nil
			}); err != nil {
				return err
			}

			return nil

		})
		nextBatch = make([]cid.Cid, 0, batchSize)
	}

	var i int
	for c := range ch {
		i++
		if len(nextBatch) < cap(nextBatch) {
			nextBatch = append(nextBatch, c)
			continue
		}

		handleBatch(nextBatch)
		nextBatch = append(nextBatch, c)
	}

	if len(nextBatch) > 0 {
		handleBatch(nextBatch)
	}

	return g.Wait()
}

func (p *Provider) provideOne(ctx context.Context, c cid.Cid) error {
	ctx, cancel := context.WithTimeout(ctx, p.ProvideTimeout)
	defer cancel()

	return p.rt.Provide(ctx, c, true)
}

func (p *Provider) shouldProvide(ctx context.Context, txn *bbolt.Tx, c cid.Cid) bool {
	v := txn.Bucket(bucketProvided).Get(c.Bytes())
	if v == nil {
		return true
	}

	return time.Since(time.Unix(int64(binary.BigEndian.Uint64(v)), 0)) > p.ProvideTTL
}

// TODO: implement a method to delete provide marks.

func encodeUint64(i uint64) []byte {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, i)
	return b
}
