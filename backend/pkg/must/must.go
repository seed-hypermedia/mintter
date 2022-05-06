// Package must provides helpers to panic on returned errors.
package must

// Two is used for functions with 2 return values.
func Two[T any](t T, err error) T {
	if err != nil {
		panic(err)
	}
	return t
}

// Three is used for function with 3 return values.
func Three[A any, B any](a A, b B, err error) (A, B) {
	if err != nil {
		panic(err)
	}
	return a, b
}
