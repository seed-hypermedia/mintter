package cbornode

import "io"

// This is a custom patch to the original package that exposes global marshaller/unmarshaller.
// This is useful to efficiently write CBOR into existing buffers or writers.

// EncodeWriter allows to marshal a CBOR object into a writer.
func EncodeWriter(v interface{}, w io.Writer) error {
	return marshaller.Encode(v, w)
}
