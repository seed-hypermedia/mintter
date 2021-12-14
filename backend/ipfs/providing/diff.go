package providing

import (
	"context"

	"github.com/ipfs/go-cid"
)

// diff expects two sorted input channels, one of which has subset of the values from another one.
// It will return a new channel which will receive values from all that are not in the subset.
func diff(ctx context.Context, all, subset <-chan cid.Cid) chan cid.Cid {
	out := make(chan cid.Cid)

	go func() {
		defer close(out)

		nextSubset := func() cid.Cid {
			select {
			case <-ctx.Done():
				return cid.Undef
			case sv := <-subset:
				return sv
			}
		}

		send := func(c cid.Cid) {
			select {
			case <-ctx.Done():
				return
			case out <- c:
				// Done
			}
		}

		sv := nextSubset()

		for {
			select {
			case <-ctx.Done():
				return
			case av, ok := <-all:
				if !ok {
					return
				}

				avk, svk := av.KeyString(), sv.KeyString()

				switch {
				case !sv.Defined():
					send(av)
				case avk == svk:
					sv = nextSubset()
				case svk > avk:
					send(av)
				case svk < avk:
					panic("Should never happened")
					// This means we've deleted a block that we've provided previously. Probably should just ignore and continue.
				default:
					panic("should never happened")
				}
			}
		}
	}()

	return out
}
