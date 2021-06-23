// Package ui integrates frontend assets with the backend code.
package ui

import (
	"fmt"
	"net/http"
)

// Handler serves UI from filesystem or embedded files in production.
//
// Deprecated: we don't embed the frontend assets right now in the new architecture.
func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "We don't embed UI anymore")
	})
}
