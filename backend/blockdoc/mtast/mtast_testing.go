package mtast

import (
	"path/filepath"
	"runtime"
)

// TestFilePath returns the absolute path to a file inside testdata directory
// with a given name. Useful for reading test files from outside of this package.
func TestFilePath(name string) string {
	_, caller, _, ok := runtime.Caller(0)
	if !ok {
		panic("Can't get test file path")
	}

	return filepath.Join(filepath.Dir(caller), "testdata", name)
}
