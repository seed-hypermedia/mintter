package resolver

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.

import (
	"context"
	"fmt"
	"math"
	"mintter/backend/graphql/internal/generated"
	"mintter/backend/lndhub"
)

func (r *meResolver) Wallets(ctx context.Context, obj *generated.Me) ([]generated.LightningWallet, error) {
	return []generated.LightningWallet{
		generated.LndHubWallet{
			Name:        "Fake Blue Wallet",
			BalanceSats: math.MaxInt64,
		},
	}, nil
}

func (r *mutationResolver) SetupLndHubWallet(ctx context.Context, input generated.SetupLndHubWalletInput) (*generated.SetupLndHubWalletPayload, error) {
	creds, err := lndhub.ParseCredentials(input.URL)
	if err != nil {
		return nil, err
	}

	// Think if this abstraction is needed, or just use LNDHub client here and retrieve access token and wallet balance.
	if err := r.svc.ConfigureLNDHub(ctx, creds); err != nil {
		return nil, err
	}

	return &generated.SetupLndHubWalletPayload{
		Wallet: &generated.LndHubWallet{
			APIURL:      creds.ConnectionURL,
			Name:        input.Name,
			BalanceSats: 10, // Use real balance.
		},
	}, nil
}

func (r *mutationResolver) SetDefaultWallet(ctx context.Context, input generated.SetDefaultWalletInput) (*generated.SetDefaultWalletPayload, error) {
	panic(fmt.Errorf("not implemented"))
}

func (r *mutationResolver) UpdateWallet(ctx context.Context, input generated.UpdateWalletInput) (*generated.UpdateWalletPayload, error) {
	panic(fmt.Errorf("not implemented"))
}

func (r *mutationResolver) DeleteWallet(ctx context.Context, input generated.DeleteWalletInput) (*generated.DeleteWalletPayload, error) {
	panic(fmt.Errorf("not implemented"))
}

func (r *mutationResolver) RequestInvoice(ctx context.Context, input generated.RequestInvoiceInput) (*generated.RequestInvoicePayload, error) {
	panic(fmt.Errorf("not implemented"))
}

func (r *mutationResolver) PayInvoice(ctx context.Context, input generated.PayInvoiceInput) (*generated.PayInvoicePayload, error) {
	panic(fmt.Errorf("not implemented"))
}

func (r *queryResolver) Me(ctx context.Context) (*generated.Me, error) {
	return &generated.Me{}, nil
}

// Me returns generated.MeResolver implementation.
func (r *Resolver) Me() generated.MeResolver { return &meResolver{r} }

// Mutation returns generated.MutationResolver implementation.
func (r *Resolver) Mutation() generated.MutationResolver { return &mutationResolver{r} }

// Query returns generated.QueryResolver implementation.
func (r *Resolver) Query() generated.QueryResolver { return &queryResolver{r} }

type meResolver struct{ *Resolver }
type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
