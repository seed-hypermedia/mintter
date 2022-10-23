package crdt

// LWW is a Last-Writer-Wins register.
type LWW[T any] struct {
	v  T
	op OpID
}

// NewLWW creates a new LWW.
func NewLWW[T any]() *LWW[T] {
	return &LWW[T]{}
}

// Set the value.
func (l *LWW[T]) Set(op OpID, v T) (ok bool) {
	if l.op.Less(op) {
		l.v = v
		return true
	}
	return false
}

// Value returns the current value.
func (l *LWW[T]) Value() T {
	return l.v
}

// Op returns the OpID of the current value.
func (l *LWW[T]) Op() OpID {
	return l.op
}
