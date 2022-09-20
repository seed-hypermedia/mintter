package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/libp2p/go-libp2p"
	peerstore "github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/protocol/ping"
	multiaddr "github.com/multiformats/go-multiaddr"
)

func main() {
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Pings a provided p2p node address to check visibility\n")
		flag.PrintDefaults()
	}
	listen := flag.Bool("listen", false, "Launch a node and then listen for incoming pings until signal is received")
	flag.Parse()

	// start a libp2p node that listens on a random local TCP port,
	// but without running the built-in ping protocol
	node, err := libp2p.New(
		libp2p.ListenAddrStrings("/ip4/127.0.0.1/tcp/0"),
		libp2p.Ping(false),
	)
	if err != nil {
		fmt.Printf("%s", err.Error())
		os.Exit(1)
	}

	// configure our own ping protocol
	pingService := &ping.PingService{Host: node}
	node.SetStreamHandler(ping.ID, pingService.PingHandler)

	// print the node's PeerInfo in multiaddr format
	peerInfo := peerstore.AddrInfo{
		ID:    node.ID(),
		Addrs: node.Addrs(),
	}
	addrs, err := peerstore.AddrInfoToP2pAddrs(&peerInfo)
	if err != nil {
		fmt.Printf("%s", err.Error())
		os.Exit(1)
	}

	// if a remote peer has been passed on the command line, connect to it
	// and send it 5 ping messages, otherwise wait for a signal to stop
	if flag.NArg() == 1 {
		if *listen {
			fmt.Println("listen flag not allowed with positional arguments. ignoring listen")
		}
		fmt.Println("libp2p node address:", addrs[0])
		addr, err := multiaddr.NewMultiaddr(flag.Arg(0))
		if err != nil {
			fmt.Printf("%s", err.Error())
			os.Exit(1)
		}
		peer, err := peerstore.AddrInfoFromP2pAddr(addr)
		if err != nil {
			fmt.Printf("%s", err.Error())
			os.Exit(1)
		}
		if err := node.Connect(context.Background(), *peer); err != nil {
			fmt.Printf("%s", err.Error())
			os.Exit(1)
		}
		fmt.Println("sending 5 ping messages to", addr)
		ch := pingService.Ping(context.Background(), peer.ID)
		for i := 0; i < 5; i++ {
			res := <-ch
			fmt.Println("pinged", addr, "in", res.RTT)
		}
	} else if *listen {
		// wait for a SIGINT or SIGTERM signal
		fmt.Println("libp2p node address:", addrs[0])
		ch := make(chan os.Signal, 1)
		signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
		<-ch
		fmt.Println("Received signal, shutting down...")
	} else if flag.NArg() == 0 {
		flag.Usage()
		os.Exit(1)
	} else {
		fmt.Println("Some arguments were misspelled, please check the doc")
		os.Exit(1)
	}

	// shut the node down
	if err := node.Close(); err != nil {
		fmt.Printf("%s", err.Error())
		os.Exit(1)
	}
}
