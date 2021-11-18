package backend

import (
	"net/http"
	"path"

	"mintter/backend/config"
	"mintter/backend/graphql"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
)

func makeHTTPHandler(cfg config.Config, g *grpc.Server, b *backend) http.Handler {
	grpcWebHandler := grpcweb.WrapServer(g, grpcweb.WithOriginFunc(func(origin string) bool {
		return true
	}))

	ui := http.FileServer(http.Dir(cfg.UI.AssetsPath))

	mux := http.NewServeMux()
	mux.Handle("/debug/", http.DefaultServeMux) // pprof and expvar handlers are registered on the router.
	mux.Handle("/debug/metrics", promhttp.Handler())
	mux.Handle("/graphql", graphql.Handler(b)) // TODO: should I pass backend this way?
	mux.Handle("/playground", playground.Handler("GraphQL Playgorund", "/graphql"))

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
