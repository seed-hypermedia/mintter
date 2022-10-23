package crdt

import "fmt"

// OpTracker can be used to track the most recently seen operation.
// Useful to make sure we're processing operations in the correctly sorted order.
type OpTracker struct {
	lastOp OpID
}

// NewOpTracker creates a new tracker.
func NewOpTracker() *OpTracker {
	return &OpTracker{}
}

// LastOp returns the most recently tracked op.
func (ot *OpTracker) LastOp() OpID {
	return ot.lastOp
}

// IsZero shows if tracker was not used before.
func (ot *OpTracker) IsZero() bool {
	return ot.lastOp.IsZero()
}

// Track an incoming op. New op must be newer than previously tracked op.
func (ot *OpTracker) Track(op OpID) error {
	if !ot.lastOp.Less(op) {
		return fmt.Errorf("tracking out of date op")
	}
	ot.lastOp = op
	return nil
}
