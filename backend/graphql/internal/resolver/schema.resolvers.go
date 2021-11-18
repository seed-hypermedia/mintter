package resolver

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.

import (
	"context"
	"fmt"
	"mintter/backend/graphql/internal/generated"
	"mintter/backend/graphql/internal/model"
)

func (r *meResolver) Wallets(ctx context.Context, obj *generated.Me) ([]generated.LightningWallet, error) {
	wallets, err := r.svc.ListWallets(ctx)
	ret := []generated.LightningWallet{}

	if err != nil {
		return ret, err
	}

	for _, w := range wallets {
		ret = append(ret, generated.LndHubWallet{
			ID:          w.ID,
			APIURL:      w.Address,
			Name:        w.Name,
			BalanceSats: model.Satoshis(w.Balance),
		})
	}

	return ret, nil
}

func (r *mutationResolver) SetupLndHubWallet(ctx context.Context, input generated.SetupLndHubWalletInput) (*generated.SetupLndHubWalletPayload, error) {
	lndhubWallet, err := r.svc.InsertWallet(ctx, "lndhub", input.URL, input.Name)
	if err != nil {
		return nil, err
	}

	return &generated.SetupLndHubWalletPayload{
		Wallet: &generated.LndHubWallet{
			APIURL:      lndhubWallet.Address,
			Name:        lndhubWallet.Name,
			BalanceSats: model.Satoshis(lndhubWallet.Balance),
			ID:          lndhubWallet.ID,
		},
	}, nil
}

func (r *mutationResolver) SetDefaultWallet(ctx context.Context, input generated.SetDefaultWalletInput) (*generated.SetDefaultWalletPayload, error) {
	defaultWallet, err := r.svc.SetDefaultWallet(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	return &generated.SetDefaultWalletPayload{
		Wallet: &generated.LndHubWallet{
			APIURL:      defaultWallet.Address,
			Name:        defaultWallet.Name,
			BalanceSats: model.Satoshis(defaultWallet.Balance),
			ID:          defaultWallet.ID,
		},
	}, nil
}

func (r *mutationResolver) UpdateWallet(ctx context.Context, input generated.UpdateWalletInput) (*generated.UpdateWalletPayload, error) {
	panic(fmt.Errorf("not implemented"))
}

func (r *mutationResolver) DeleteWallet(ctx context.Context, input generated.DeleteWalletInput) (*generated.DeleteWalletPayload, error) {
	if err := r.svc.DeleteWallet(ctx, input.ID); err != nil {
		return nil, err
	}

	return &generated.DeleteWalletPayload{ID: input.ID}, nil
}

func (r *mutationResolver) RequestInvoice(ctx context.Context, input generated.RequestInvoiceInput) (*generated.RequestInvoicePayload, error) {
	var amount int64
	if err := input.AmountSats.UnmarshalGQL(amount); err != nil {
		return nil, fmt.Errorf("couldn't unmarshal amount. %s", err.Error())
	}

	payReq, err := r.svc.RequestInvoice(ctx, input.AccountID, amount, input.PublicationID)
	if err != nil {
		return nil, err
	}
	return &generated.RequestInvoicePayload{PaymentRequest: model.LightningPaymentRequest(payReq)}, nil
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
