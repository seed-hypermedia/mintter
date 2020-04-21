package cleanup

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestStack(t *testing.T) {
	var errs []error

	e1 := errors.New("one")
	e2 := errors.New("two")
	e3 := errors.New("three")

	expected := []error{e3, e2, e1}

	c := Stack{
		funcCloser(func() error {
			errs = append(errs, e1)
			return e1
		}),
		funcCloser(func() error {
			errs = append(errs, e2)
			return e2
		}),
		funcCloser(func() error {
			return nil
		}),
		funcCloser(func() error {
			errs = append(errs, e3)
			return e3
		}),
	}

	err := c.Close()
	require.Error(t, err)
	require.Equal(t, expected, errs)
	require.Contains(t, err.Error(), "three; two; one")
}

type funcCloser func() error

func (f funcCloser) Close() error {
	return f()
}
