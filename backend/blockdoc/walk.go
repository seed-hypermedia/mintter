package blockdoc

// WalkHandlers can be used for parsing documents.
// It's a set of callbacks that can be passed to a parser,
// to traverse a document and convert it to the Mintter format.
//
// For example, it can be used for parsing Mintter AST into the
// block doc format. AST parser would walk the tree and invoke these functions.
//
// These callbacks are pretty generic so can be used to parse documents in other formats (probably).
type WalkHandlers struct {
	// HandleListStart should be called at the beginning of a new block list.
	HandleListStart func(id string) error
	// HandleListAttribute should be called whenever a list attribute is parsed.
	HandleListAttribute func(id, key string, value interface{}) error
	// HandleBlockStart should be called at the beginning of parsing a block.
	HandleBlockStart func(id, parent string, depth int) error
	// HandleBlockAttribute should be called when new block attribute is parsed.
	HandleBlockAttribute func(id, key string, value interface{}) error
	// HandleBlockContent should be called when block content is discovered.
	HandleBlockContent func(id, raw string) error
}

// NewWalkHandlers creates a new set of no-op handlers.
// Users are able to define their own handlers by setting the corresponding property.
func NewWalkHandlers() WalkHandlers {
	return WalkHandlers{
		HandleListStart:      func(id string) error { return nil },
		HandleListAttribute:  func(id, key string, value interface{}) error { return nil },
		HandleBlockStart:     func(id, parent string, depth int) error { return nil },
		HandleBlockAttribute: func(id, key string, value interface{}) error { return nil },
		HandleBlockContent:   func(id, raw string) error { return nil },
	}
}
