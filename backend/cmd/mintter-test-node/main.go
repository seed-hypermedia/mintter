package main

import (
	"fmt"
	"mintter/backend/config"
	"mintter/backend/identity"
	"mintter/backend/p2p"
	"mintter/backend/store"
	"time"

	"github.com/burdiyan/go/mainutil"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"github.com/multiformats/go-multiaddr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"

	"net/http"
	_ "net/http/pprof"

	"github.com/rakyll/autopprof"
)

func main() {
	mainutil.Run(run)
}

func run() error {
	autopprof.Capture(autopprof.CPUProfile{
		Duration: 30 * time.Second,
	})
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
	defer bob.Close()

	<-alice.Bootstrapped()
	<-bob.Bootstrapped()

	aps, err := pubsub.NewGossipSub(ctx, alice.Host())
	if err != nil {
		return err
	}

	bps, err := pubsub.NewGossipSub(ctx, bob.Host())
	if err != nil {
		return err
	}

	atopic, err := aps.Join("mintter/doc-1")
	if err != nil {
		return err
	}
	defer atopic.Close()

	asub, err := atopic.Subscribe()
	if err != nil {
		return err
	}
	defer asub.Cancel()

	btopic, err := bps.Join("mintter/doc-1")
	if err != nil {
		return err
	}
	defer btopic.Close()

	bsub, err := btopic.Subscribe()
	if err != nil {
		return err
	}
	defer bsub.Cancel()

	g.Go(func() error {
		for {
			msg, err := bsub.Next(ctx)
			if err != nil {
				return err
			}
			fmt.Println(msg.Seqno, string(msg.Data))
		}
	})

	if err := alice.Connect(ctx, mustAddrs(bob.Addrs())...); err != nil {
		return err
	}

	fmt.Println("Now we're ready")
	fmt.Println(atopic.ListPeers())
	time.AfterFunc(10*time.Second, func() {
		fmt.Println(atopic.ListPeers())
	})

	if err := atopic.Publish(ctx, []byte("hello")); err != nil {
		return err
	}

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

	log, err := zap.NewDevelopment()
	if err != nil {
		return nil, err
	}

	return p2p.NewNode("tmp/"+name, st, log.Named(name), cfg)
}
