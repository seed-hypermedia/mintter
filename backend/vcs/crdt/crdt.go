// Package crdt provides Mintter-specific CRDTs. These are not meant to be general-purpose CRDTs,
// but still are generic enough and could be extended for some other use cases. In case of tradeoffs,
// we favor Mintter-specific use cases.
package crdt

import vcsdb "mintter/backend/vcs/sqlitevcs"

// OpID of a CRDT operation.
type OpID = vcsdb.OpID

// LessFunc is a function which compares whether i < j.
type LessFunc func(i, j OpID) bool
