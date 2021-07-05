package backend

import (
	"fmt"
	"net/http"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/cors"
	"google.golang.org/grpc"
)

func newHTTPHandler(g *grpc.Server, b *backend) http.Handler {
	grpcWebHandler := grpcweb.WrapServer(g, grpcweb.WithOriginFunc(func(origin string) bool {
		fmt.Println(origin)
		return true
	}))

	mux := http.DefaultServeMux

	mux.Handle("/debug/metrics", promhttp.Handler())
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r) {
			grpcWebHandler.ServeHTTP(w, r)
			return
		}

		fmt.Fprint(w, "This server only serves grpc-web")
	})

	// TODO: fix this for production releases.
	return cors.AllowAll().Handler(mux)
}
