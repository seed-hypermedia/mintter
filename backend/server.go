package backend

import (
	"net/http"
	"path"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
)

func makeHTTPHandler(g *grpc.Server, b *backend) http.Handler {
	grpcWebHandler := grpcweb.WrapServer(g, grpcweb.WithOriginFunc(func(origin string) bool {
		return true
	}))

	ui := http.FileServer(http.Dir("frontend/app/dist/"))

	mux := http.NewServeMux()
	mux.Handle("/debug/", http.DefaultServeMux) // pprof and expvar handlers are registered on the router.
	mux.Handle("/debug/metrics", promhttp.Handler())

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r) {
			grpcWebHandler.ServeHTTP(w, r)
			return
		}

		if path.Ext(r.URL.Path) == "" && r.URL.Path != "/" {
			r.URL.Path = "/"
		}

		ui.ServeHTTP(w, r)
	})

	return mux
}
