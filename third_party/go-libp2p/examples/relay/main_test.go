package main

import (
	"os"
	"testing"

	"github.com/libp2p/go-libp2p/examples/testutils"
)

func TestMain(t *testing.T) {
	if os.Getenv("CI") != "" {
		t.Skip("This test is flaky on CI, see https://github.com/libp2p/go-libp2p/issues/1158.")
	}
	var h testutils.LogHarness
	h.ExpectPrefix("Okay, no connection from h1 to h3")
	h.ExpectPrefix("Meow! It worked!")
	h.Run(t, run)
}
