package resolver

import (
	"context"
	"seed/backend/lndhub"
	wallet "seed/backend/wallet/walletsql"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

// Service declares the needed functionality for the Resolver to work. This is to avoid
// implementing domain business logic inside the resolver. Think if this abstraction is needed at all.
// But let's be careful, and not make the resolver be very aware of the intricacies of our domain logic.
type Service interface {
	GetLnAddress(context.Context) (string, error)
	InsertWallet(context.Context, string, string) (wallet.Wallet, error)
	ListWallets(context.Context, bool) ([]wallet.Wallet, error)
	DeleteWallet(context.Context, string) error
	UpdateWalletName(context.Context, string, string) (wallet.Wallet, error)
	SetDefaultWallet(context.Context, string) (wallet.Wallet, error)
	GetDefaultWallet(context.Context) (wallet.Wallet, error)
	ExportWallet(context.Context, string) (string, error)
	RequestRemoteInvoice(context.Context, string, int64, *string) (string, error)
	CreateLocalInvoice(context.Context, int64, *string) (string, error)
	PayInvoice(context.Context, string, *string, *uint64) (string, error)
	ListPaidInvoices(context.Context, string) ([]lndhub.Invoice, error)
	ListReceivednvoices(context.Context, string) ([]lndhub.Invoice, error)
	UpdateLnaddressNickname(context.Context, string) error
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
