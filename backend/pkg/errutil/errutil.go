// Package errutil provides convenience function for detailed RPC error construction.
package errutil

import (
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// NotNil returns a gRPC error indicating that field must not be nil.
func NotNil(name string) error {
	return status.Errorf(codes.InvalidArgument, "%s: must not be nil", name)
}

// MissingArgument returns a gRPC error indicating a missing argument.
func MissingArgument(name string) error {
	return status.Errorf(codes.InvalidArgument, "%s: argument is required", name)
}

// NotEqual returns a gRPC error indicating wrong field value.
func NotEqual[T any](name string, match T) error {
	return status.Errorf(codes.InvalidArgument, "%s: must not equal '%+v'", name, match)
}

// ParseError returns a gRPC error indicating a parse error of some field as a type of T.
func ParseError[In, T any](name string, in In, v T, err error) error {
	return status.Errorf(codes.InvalidArgument, "%s: failed to parse '%v' as '%T': %+v", name, in, v, err)
}

// Greater returns a gRPC error indicating that a must be greater than b.
func Greater[T comparable](name string, a, b T) error {
	return status.Errorf(codes.InvalidArgument, "%s: '%v' must be greater than '%v'", name, a, b)
}

// Equal returns a gRPC error indicating that field must equal v.
func Equal[T comparable](name string, v T) error {
	return status.Errorf(codes.InvalidArgument, "%s: must equal '%v'", name, v)
}

// NotFound returns a gRPC error with a not found error code.
func NotFound(msg string, args ...any) error {
	return status.Errorf(codes.NotFound, msg, args...)
}
