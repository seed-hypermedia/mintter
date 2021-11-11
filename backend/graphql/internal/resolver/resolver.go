package resolver

import (
	"context"
	"mintter/backend/lndhub"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

// Service declares the needed functionality for the Resolver to work. This is to avoid
// implementing domain business logic inside the resolver. Think if this abstraction is needed at all.
// But let's be careful, and not make the resolver be very aware of the intricacies of our domain logic.
type Service interface {
	ConfigureLNDHub(context.Context, lndhub.Credentials) error
}

// Resolver is the root of the GraphQL API.
type Resolver struct {
	svc Service
}

// New creates a new Resolver.
func New(svc Service) *Resolver {
	return &Resolver{
		svc: svc,
	}
}
