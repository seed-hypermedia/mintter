package main

import (
	"fmt"
	"mintter/backend/config"
	"mintter/backend/identity"
	"mintter/backend/logging"
	"mintter/backend/p2p"
	"mintter/backend/store"
	"time"

	namesys "github.com/libp2p/go-libp2p-pubsub-router"

	"github.com/burdiyan/go/mainutil"
	"github.com/multiformats/go-multiaddr"
	"golang.org/x/sync/errgroup"

	"net/http"
	_ "net/http/pprof"
)

var topic = namesys.KeyToTopic("mintter/author1")

type validator struct{}

func (v *validator) Validate(key string, value []byte) error {
	return nil
}

func (v *validator) Select(key string, values [][]byte) (int, error) {
	return -1, nil
}

func main() {
	if err := run(); err != nil {
		panic(err)
	}
}

func run() error {
	g, ctx := errgroup.WithContext(mainutil.TrapSignals())

	go func() {
		fmt.Println(http.ListenAndServe("localhost:6060", nil))
	}()

	// Setup a node with relay and autonat.
	alice, err := makeNode("alice", config.P2P{
		Addr:        "/ip4/0.0.0.0/tcp/33000",
		NoBootstrap: true,
	})
	if err != nil {
		return err
	}
	defer alice.Close()

	bob, err := makeNode("bob", config.P2P{
		Addr:        "/ip4/0.0.0.0/tcp/33001",
		NoBootstrap: true,
	})
	if err != nil {
		return err
	}
	defer bob.Close()

	carol, err := makeNode("carol", config.P2P{
		Addr:        "/ip4/0.0.0.0/tcp/33002",
		NoBootstrap: true,
	})
	if err != nil {
		return err
	}
	defer carol.Close()

	<-alice.Bootstrapped()
	<-bob.Bootstrapped()
	<-carol.Bootstrapped()

	m := map[string]string{
		alice.Host().ID().String(): "alice",
		bob.Host().ID().String():   "bob",
		carol.Host().ID().String(): "carol",
	}

	if err := carol.Connect(ctx, mustAddrs(alice.Addrs())...); err != nil {
		return err
	}

	if err := carol.Connect(ctx, mustAddrs(bob.Addrs())...); err != nil {
		return err
	}

	g.Go(func() error {
		t, err := carol.PubSub().Join(namesys.KeyToTopic("foo"))
		if err != nil {
			return err
		}
		defer t.Close()

		sub, err := t.Subscribe()
		if err != nil {
			return err
		}
		defer sub.Cancel()

		for {
			msg, err := sub.Next(ctx)
			if err != nil {
				return err
			}

			fmt.Println(time.Now(), "From:", m[msg.ReceivedFrom.String()], "Msg:", string(msg.Data))
		}
	})

	astore, err := namesys.NewPubsubValueStore(ctx, alice.Host(), alice.PubSub(), &validator{})
	if err != nil {
		return err
	}

	bstore, err := namesys.NewPubsubValueStore(ctx, bob.Host(), bob.PubSub(), &validator{})
	if err != nil {
		return err
	}

	v, err := bstore.GetValue(ctx, "foo")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(string(v))

	if err := alice.Connect(ctx, mustAddrs(bob.Addrs())...); err != nil {
		return err
	}

	if err := astore.PutValue(ctx, "foo", []byte("bar")); err != nil {
		return err
	}

	g.Go(func() error {
		for {
			select {
			case <-time.Tick(10 * time.Second):
				v, err := bstore.GetValue(ctx, "foo")
				if err != nil {
					fmt.Println(err)
				} else {
					fmt.Println(string(v))
				}
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	})

	return g.Wait()
}

func mustAddrs(addrs []multiaddr.Multiaddr, err error) []multiaddr.Multiaddr {
	if err != nil {
		panic(err)
	}
	return addrs
}

func makeNode(name string, cfg config.P2P) (*p2p.Node, error) {
	words, err := identity.NewMnemonic(nil)
	if err != nil {
		return nil, err
	}

	prof, err := identity.FromMnemonic(words, nil, 1)
	if err != nil {
		return nil, err
	}

	st, err := store.Create("tmp/"+name, prof)
	if err != nil {
		return nil, err
	}

	log := logging.Logger("test-node")
	return p2p.NewNode("tmp/"+name, st, log, cfg)
}
