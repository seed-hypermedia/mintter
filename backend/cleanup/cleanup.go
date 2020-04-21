// Package cleanup provides a cleanup stack that can be used to group multiple io.Closer's.
package cleanup

import (
	"io"

	"go.uber.org/multierr"
)

// Stack of closers to clean up. Use Close() to close them in the LIFO order.
type Stack []io.Closer

// Close the stack in the LIFO order.
func (s Stack) Close() error {
	var err error

	// We have to close in reverse order because some later dependencies
	// can use previous ones. This is similar to defer statement.
	for i := len(s) - 1; i >= 0; i-- {
		err = multierr.Append(err, s[i].Close())
	}

	return err
}
