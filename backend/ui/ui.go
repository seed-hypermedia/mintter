// Package ui integrates frontend assets with the backend code.
package ui

import (
	"net/http"
	"path"

	rice "github.com/GeertJohan/go.rice"
)

// Handler serves UI from filesystem or embedded files in production.
func Handler() http.Handler {
	box := rice.MustFindBox("../../frontend/www/out").HTTPBox()
	fs := http.FileServer(box)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if path.Ext(r.URL.Path) == "" && r.URL.Path != "/" {
			r.URL.Path = "/"
		}

		fs.ServeHTTP(w, r)
	})
}
