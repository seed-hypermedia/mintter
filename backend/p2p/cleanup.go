package p2p

import (
	"io"

	"go.uber.org/multierr"
)

type cleanup []io.Closer

func (c cleanup) Close() error {
	var err error

	// We have to close in reverse order because some later dependencies
	// can use previous ones. This is similar to defer statement.
	for i := len(c) - 1; i >= 0; i-- {
		err = multierr.Append(err, c[i].Close())
	}

	return err
}
