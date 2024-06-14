package mttnet

import (
	"context"
	p2p "seed/backend/genproto/p2p/v1alpha"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Invoicer is a subset of a Lightning node that allows to issue invoices.
// It is used when a remote peer wants to pay our node.
type Invoicer interface {
	CreateLocalInvoice(ctx context.Context, amountSats int64, memo *string) (string, error)
}

// RequestInvoice creates a local invoice.
func (srv *rpcMux) RequestInvoice(ctx context.Context, in *p2p.RequestInvoiceRequest) (*p2p.RequestInvoiceResponse, error) {
	n := srv.Node
	if n.invoicer == nil {
		return nil, status.Errorf(codes.Unimplemented, "method RequestInvoice not ready yet")
	}

	invoice, err := n.invoicer.CreateLocalInvoice(ctx, in.AmountSats, &in.Memo)
	if err != nil {
		return nil, err
	}

	return &p2p.RequestInvoiceResponse{
		PayReq: invoice,
	}, nil
}
