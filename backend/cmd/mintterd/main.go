package main

import (
	"fmt"
	"mintter/backend/peer"

	_ "github.com/textileio/go-threads/service"
)

func main() {
	fmt.Println("mintterd:", "hello", peer.Peer)
}
