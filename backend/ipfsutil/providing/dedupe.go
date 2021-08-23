package providing

import (
	"context"

	"github.com/ipfs/go-cid"
)

// dedupe expects sorted input channel where values may be duplicated (but still sorted),
// and returns a new channel which will receive each duplicated value only once.
func dedupe(ctx context.Context, in <-chan cid.Cid) <-chan cid.Cid {
	out := make(chan cid.Cid)

	var old cid.Cid
	go func() {
		defer close(out)
		for {
			select {
			case <-ctx.Done():
				return
			case c, ok := <-in:
				if !ok {
					return
				}
				if !old.Equals(c) {
					out <- c
				}
				old = c
			}
		}
	}()

	return out
}
