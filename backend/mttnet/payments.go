package mttnet

import (
	"context"
	p2p "mintter/backend/genproto/p2p/v1alpha"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Invoicer is a subset of a Lightning node that allows to issue invoices.
// It is used when a remote peer wants to pay our node.
type Invoicer interface {
	CreateInvoice(ctx context.Context, amount uint64, memo string, preimage []byte, holdInvoice bool) (string, error)
}

func (n *rpcHandler) RequestInvoice(ctx context.Context, in *p2p.RequestInvoiceRequest) (*p2p.RequestInvoiceResponse, error) {
	if n.invoicer == nil {
		return nil, status.Errorf(codes.Unimplemented, "method RequestInvoice not implemented")
	}

	invoice, err := n.invoicer.CreateInvoice(ctx, uint64(in.AmountSats), in.Memo, in.PreimageHash, in.HoldInvoice)
	if err != nil {
		return nil, err
	}

	return &p2p.RequestInvoiceResponse{
		PayReq: invoice,
	}, nil
}
