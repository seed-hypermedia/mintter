// Package must provides helpers to panic on returned errors.
package must

// Do panics if err is not nil.
func Do(err error) {
	if err != nil {
		panic(err)
	}
}

// Do2 is used for functions with 2 return values.
func Do2[T any](t T, err error) T {
	if err != nil {
		panic(err)
	}
	return t
}

// Do3 is used for function with 3 return values.
func Do3[A any, B any](a A, b B, err error) (A, B) {
	if err != nil {
		panic(err)
	}
	return a, b
}

// Maybe will call fn if err is not nil.
// The error returned from fn will be stored inside err.
func Maybe(err *error, fn func() error) (called bool) {
	if *err != nil {
		return false
	}
	*err = fn()
	return true
}
