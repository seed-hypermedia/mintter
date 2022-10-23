// Package crdt provides Mintter-specific CRDTs. These are not meant to be general-purpose CRDTs,
// but still are generic enough and could be extended for some other use cases. In case of tradeoffs,
// we favor Mintter-specific use cases.
package crdt

// OpID is an ID of a CRDT operation.
// The first number is a logical timestamp.
// The second number is a client ID (origin).
type OpID [2]uint64

var zeroOp = OpID{}

// IsZero checks if OpID is zero value.
func (o OpID) IsZero() bool {
	return o == zeroOp
}

// Time returns the logical timestamp of the ID.
func (o OpID) Time() uint64 { return o[0] }

// Origin returns the origin part of the ID.
func (o OpID) Origin() uint64 {
	if o[1] == 0 {
		panic("TODO: pass correct origin")
	}

	return o[1]
}

// Less checks if this operation is less than another operation.
func (o OpID) Less(other OpID) bool {
	if o.Time() == other.Time() {
		return o.Origin() < other.Origin()
	}

	return o.Time() < other.Time()
}
