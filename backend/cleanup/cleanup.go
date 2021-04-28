// Package cleanup provides a cleanup stack that can be used to group multiple io.Closer's.
package cleanup

import (
	"io"
	"sync"

	"go.uber.org/multierr"
)

type errFuncCloser func() error

func (f errFuncCloser) Close() error {
	return f()
}

// Stack of closers to clean up. Use Close() to close them
// in the LIFO order. Zero value is useful.
type Stack struct {
	once  sync.Once
	err   error
	funcs []io.Closer
}

// Add closer to the cleanup stack.
func (s *Stack) Add(c ...io.Closer) {
	s.funcs = append(s.funcs, c...)
}

// AddErrFunc to the cleanup stack.
func (s *Stack) AddErrFunc(fn ...func() error) {
	for _, f := range fn {
		s.funcs = append(s.funcs, errFuncCloser(f))
	}
}

// Go spins up a new goroutine to run the run function,
// and adds close function to the cleanup stack.
// Thus when you close the stack, close function will be invoked,
// and should signal the run goroutine to stop and wait for its completion.
// This can be useful for starting and gracefully stopping web servers.
//
// For example:
//
// var srv *http.Server
// clean.Go(func() error {
// 	return srv.ListenAndServe()
// }, func() error {
// 	return srv.Shutdown(context.Background())
// })
func (s *Stack) Go(run func() error, close func() error) {
	c := make(chan error, 1)
	go func() {
		c <- run()
	}()
	s.AddErrFunc(func() error {
		return multierr.Combine(close(), <-c)
	})
}

// Close the stack in the LIFO order. It will only execute once and will remember the error.
func (s *Stack) Close() error {
	s.once.Do(func() {
		// We have to close in reverse order because some later dependencies
		// can use previous ones. This is similar to defer statement.
		for i := len(s.funcs) - 1; i >= 0; i-- {
			s.err = multierr.Append(s.err, s.funcs[i].Close())
		}

	})

	return s.err
}
