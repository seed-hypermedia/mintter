package cleanup

import (
	"errors"
	"io"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestStack(t *testing.T) {
	var errs []error

	e1 := errors.New("one")
	e2 := errors.New("two")
	e3 := errors.New("three")

	expected := []error{e3, e2, e1}

	var c Stack

	c.AddErrFunc(
		func() error {
			errs = append(errs, e1)
			return e1
		},
		func() error {
			errs = append(errs, e2)
			return e2
		},
		func() error {
			return nil
		},
		func() error {
			errs = append(errs, e3)
			return e3
		},
	)

	err := c.Close()
	require.Error(t, err)
	require.Equal(t, expected, errs)
	require.Contains(t, err.Error(), "three; two; one")

	err = c.Close()
	require.Error(t, err)
	require.Equal(t, expected, errs)
	require.Contains(t, err.Error(), "three; two; one")
}

func TestEmpty(t *testing.T) {
	var c io.Closer = &Stack{}

	require.NoError(t, c.Close())
}
