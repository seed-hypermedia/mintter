// Package dbext provides our custom extensions for SQLite.
package dbext

// #cgo CFLAGS: -I ../../../../third_party/sqlite
// #cgo CFLAGS: -DSQLITE_CORE
// #include "./dbext.h"
import "C"

// LoadExtensions loads our custom extensions into SQLite
// which will be loaded automatically by all connections.
func LoadExtensions() error {
	C.load_extensions()
	return nil
}
