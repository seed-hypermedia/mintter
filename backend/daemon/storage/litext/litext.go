// Package litext provides our custom extensions for SQLite.
package litext

// #cgo CFLAGS: -I ../../../../third_party/sqlite
// #cgo CFLAGS: -DSQLITE_CORE
// #include "./litext.h"
import "C"

// LoadExtensions loads our custom extensions into SQLite
// which will be loaded automatically by all connections.
func LoadExtensions() error {
	C.load_extensions()
	return nil
}
