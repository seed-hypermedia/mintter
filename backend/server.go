package backend

import (
	"fmt"
	"net/http"

	accounts "mintter/api/go/accounts/v1alpha"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/encoding/protojson"
)

func httpHandler(g *grpc.Server, b *backend) http.Handler {
	grpcWebHandler := grpcweb.WrapServer(g, grpcweb.WithOriginFunc(func(origin string) bool {
		return true
	}))

	mux := http.NewServeMux()

	mux.HandleFunc("/debug/me", func(w http.ResponseWriter, r *http.Request) {
		acc, err := b.Accounts.GetAccount(r.Context(), &accounts.GetAccountRequest{})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		data, err := protojson.Marshal(acc)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		fmt.Fprint(w, data)
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if grpcWebHandler.IsAcceptableGrpcCorsRequest(r) || grpcWebHandler.IsGrpcWebRequest(r) {
			grpcWebHandler.ServeHTTP(w, r)
			return
		}

		fmt.Fprint(w, "This server only serves grpc-web")
	})

	return mux
}
