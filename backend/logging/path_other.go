//+build !windows

package logging

import (
	"path/filepath"
)

func normalizePath(p string) (string, error) {
	return filepath.Abs(p)
}
