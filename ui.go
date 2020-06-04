package mintter

import (
	"net/http"
	"path"
	"strings"

	rice "github.com/GeertJohan/go.rice"
)

// UIHandler serves UI from filesystem or embedded files in production. Heyho
func UIHandler() http.Handler {
	box := rice.MustFindBox("frontend/www/out").HTTPBox()
	fs := http.FileServer(box)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/p/") || strings.HasPrefix(r.URL.Path, "/editor/") {
			parts := strings.Split(r.URL.Path, "/")
			parts[2] = "[id]"
			r.URL.Path = strings.Join(parts, "/")
		}

		if path.Ext(r.URL.Path) == "" && r.URL.Path != "/" {
			r.URL.Path += ".html"
		}

		fs.ServeHTTP(w, r)
	})
}
