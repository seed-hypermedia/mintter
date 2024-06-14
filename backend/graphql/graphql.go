// Package graphql exposes a GraphQL API from the Seed Daemon.
package graphql

import (
	"seed/backend/graphql/internal/generated"
	"seed/backend/graphql/internal/resolver"

	"github.com/99designs/gqlgen/graphql/handler"
)

// Handler creates a new GraphQL API Server. It implements http.Handler.
func Handler(svc resolver.Service) *handler.Server {
	return handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{
		Resolvers: resolver.New(svc),
	}))
}
