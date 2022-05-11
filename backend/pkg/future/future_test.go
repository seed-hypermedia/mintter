package future

import (
	"context"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFuture(t *testing.T) {
	f := New[int]()

	var wg sync.WaitGroup

	// trigger will be used to signal all the concurrent writers to write.
	trigger := make(chan struct{})

	// We setup a bunch of concurrent writers. They block until trigger is closed.
	writers := make([]error, 10)
	for i := range writers {
		wg.Add(1)
		go func(i int) {
			<-trigger
			writers[i] = f.Resolve(i)
			wg.Done()
		}(i)
	}

	// We setup a bunch of concurrent readers.
	readers := make([]int, 20)
	for i := range readers {
		wg.Add(1)
		go func(i int) {
			v, err := f.Await(context.Background())
			if err != nil {
				panic(err)
			}
			readers[i] = v
			wg.Done()
		}(i)
	}

	// Read before resolve
	{
		val, ok := f.Get()
		require.False(t, ok, "must not get value before future is resolved")
		require.Equal(t, 0, val)
	}

	close(trigger)

	wg.Wait()

	var written int
	for _, werr := range writers {
		if werr == nil {
			written++
		}
	}

	read, ok := f.Get()
	require.True(t, ok, "must get value after future is resolved")

	for _, r := range readers {
		require.Equal(t, read, r, "all readers must see the same value")
	}
}

func TestFutureAwaitContext(t *testing.T) {
	f := New[int]()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	v, err := f.Await(ctx)
	require.Equal(t, context.Canceled, err)
	require.Equal(t, 0, v)
}
