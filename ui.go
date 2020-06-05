package mintter

import (
	"net/http"
	"path"

	rice "github.com/GeertJohan/go.rice"
)

// UIHandler serves UI from filesystem or embedded files in production. Heyho
func UIHandler() http.Handler {
	box := rice.MustFindBox("frontend/www/out").HTTPBox()
	fs := http.FileServer(box)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if path.Ext(r.URL.Path) == "" && r.URL.Path != "/" {
			r.URL.Path = "/"
		}

		fs.ServeHTTP(w, r)
	})
}
