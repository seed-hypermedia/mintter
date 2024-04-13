// Package strbytes provides convenience wrappers for the *unsafe* []byte <-> string conversions.
// No []byte value must be modified after it has been converted to or from a string.
package strbytes

import "unsafe"

// String from bytes.
func String(b []byte) string {
	if len(b) == 0 {
		return ""
	}

	return unsafe.String(&b[0], len(b))
}

// Bytes from string.
func Bytes(s string) []byte {
	if len(s) == 0 {
		return nil
	}

	return unsafe.Slice(unsafe.StringData(s), len(s))
}
