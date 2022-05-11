package backend

import (
	"fmt"
	"net/http"
	"sort"

	"mintter/backend/config"
	"mintter/backend/graphql"

	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/mux"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
)

// CORSMiddleware allows different host/origins.
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// allow cross domain AJAX requests
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
		next.ServeHTTP(w, r)
	})
}

func makeHTTPHandler(cfg config.Config, g *grpc.Server, b *backend) http.Handler {
	grpcWebHandler := grpcweb.WrapServer(g, grpcweb.WithOriginFunc(func(origin string) bool {
		return true
	}))

	router := mux.NewRouter()

	router.Handle("/debug/metrics", promhttp.Handler())
	router.PathPrefix("/debug/pprof").Handler(http.DefaultServeMux)
	router.PathPrefix("/debug/vars").Handler(http.DefaultServeMux)
	router.Handle("/graphql", CORSMiddleware(graphql.Handler(b)))
	router.Handle("/playground", playground.Handler("GraphQL Playground", "/graphql"))

	nav := newNavigationHandler(router)

	router.MatcherFunc(mux.MatcherFunc(func(r *http.Request, match *mux.RouteMatch) bool {
		return grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r)
	})).Handler(grpcWebHandler)

	router.Handle("/", nav)

	return router
}

func newNavigationHandler(router *mux.Router) http.Handler {
	var routes []string

	err := router.Walk(func(route *mux.Route, router *mux.Router, ancestors []*mux.Route) error {
		u, err := route.URL()
		if err != nil {
			return err
		}
		routes = append(routes, u.String())
		return nil
	})
	if err != nil {
		panic(err)
	}
	sort.Strings(routes)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		for _, r := range routes {
			fmt.Fprintf(w, `<p><a href="%s">%s</a></p>`, r, r)
		}
	})
}
