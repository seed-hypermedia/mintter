package backend

import (
	"context"
	"fmt"
	p2p "mintter/backend/api/p2p/v1alpha"
	"reflect"
	"sync"
	"time"

	"github.com/libp2p/go-libp2p-core/event"
	"github.com/libp2p/go-libp2p-core/host"
	gostream "github.com/libp2p/go-libp2p-gostream"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
)

func (srv *backend) startBackgroundJobs(ctx context.Context) *errgroup.Group {
	g, ctx := errgroup.WithContext(ctx)

	// Start handlers for local libp2p events.
	g.Go(func() (err error) {
		sub, err := srv.p2p.libp2p.Host.EventBus().Subscribe([]interface{}{
			&event.EvtPeerIdentificationCompleted{},
		})
		if err != nil {
			return fmt.Errorf("failed to setup libp2p event listener: %w", err)
		}
		defer multierr.AppendInvoke(&err, multierr.Close(sub))

		return startLibp2pEventHandling(ctx, sub, srv.log, srv.handleLibp2pEvent)
	})

	// Start the Mintter P2P protocol listener.
	g.Go(func() error {
		return startMintterP2PProtocol(ctx, srv.p2p.libp2p.Host, &p2pAPI{back: srv})
	})

	// Start P2P node. This should actually start listenning on the network and bootstrap.
	g.Go(func() error {
		return srv.p2p.Start(ctx)
	})

	// Start reprovider when P2P node is ready to use.
	g.Go(func() error {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-srv.p2p.Ready():
			return srv.p2p.prov.StartReproviding(ctx)
		}
	})

	// Start pulling account updates.
	g.Go(func() error {
		return startAccountsSync(ctx, srv)
	})

	return g
}

func startAccountsSync(ctx context.Context, srv *backend) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-srv.p2p.Ready():
		break
	}

	t := time.NewTimer(time.Hour)
	t.Stop()
	defer t.Stop()

	for {
		if err := srv.SyncAccounts(ctx); err != nil {
			return err
		}

		t.Reset(accountsPullInterval)

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			continue
		}
	}
}

func startMintterP2PProtocol(ctx context.Context, h host.Host, api *p2pAPI) error {
	lis, err := gostream.Listen(h, ProtocolID)
	if err != nil {
		return err
	}

	s := grpc.NewServer()
	p2p.RegisterP2PServer(s, api)

	go func() {
		<-ctx.Done()
		s.GracefulStop()
	}()

	return s.Serve(lis)
}

func startLibp2pEventHandling(ctx context.Context, sub event.Subscription, log *zap.Logger, fn func(context.Context, interface{}) error) error {
	var wg sync.WaitGroup
	defer wg.Wait()

	// For some very-very-very annoying reason libp2p might deliver duplicate
	// events. This is especially annoying in tests, because after initial peer
	// verification is done we may go into another one because of the duplicate event.
	// I couldn't figure out why it was happenning, so I implemented a simply dedupe here.
	// We'll track events that we receive and launch handling for, and we remove them
	// from the map some time after they are handled.

	// On this channel handled events will be returned, so we can clean them up from the dedupe map.
	handled := make(chan interface{}, 10)

	seen := map[interface{}]struct{}{}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case evt := <-handled:
			delete(seen, evt)
		case evt, ok := <-sub.Out():
			if !ok {
				return fmt.Errorf("libp2p event channel closed")
			}

			// TODO: collect metrics about how many duplicate events we get of each type.
			// See if reporting an issue is necessary.

			if _, ok := seen[evt]; ok {
				continue
			}

			seen[evt] = struct{}{}

			wg.Add(1)
			go func() {
				err := fn(ctx, evt)
				if err != nil {
					log.Error("FailedToHandleLibp2pEvent",
						zap.Any("event", evt),
						zap.String("eventType", reflect.TypeOf(evt).String()),
						zap.Error(err),
					)
				}
				wg.Done()

				// We'll sleep for some arbitrary amount of time so that potential duplicate
				// event have time to be deduped. We're doing this after wg.Done
				// because we don't to wait for this if we want to exit the app.
				time.Sleep(time.Second)
				handled <- evt
			}()
		}
	}
}
