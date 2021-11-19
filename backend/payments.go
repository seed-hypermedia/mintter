package backend

import (
	"context"
	"fmt"
	p2p "mintter/backend/api/p2p/v1alpha"
)

type InvoiceRequest struct {
	AmountSats   uint64 `help:"The invoice amount in satoshis" default:"0"`
	Memo         string `help:"Optional requested memo to be attached in the invoice" default:""`
	HoldInvoice  bool   `help:"If we request a hold invoice instead of a regular one. If true, then the following field is mandatory" default:"false"`
	PreimageHash []byte `help:"Preimage hash of the requested hold invoice. If HoldInvoice flag is set to false this field is skipped" default:""`
}

// This function requests a remote account to issue an invoice so we can pay it.
// Any of the devices associated with the remote account can issue it. For each
// associated device we found online ,we ask if it can provide an invoice.
// If for some reason, that device cannot create the invoice (insufficient
// inbound liquidity) we ask the next node. We return in the first device that
// can issue the invoice. If none of them can, then an error is raised.
func (srv *backend) RemoteInvoiceRequest(ctx context.Context, account AccountID,
	request InvoiceRequest) (string, error) {

	if _, err := srv.readyIPFS(); err != nil {
		return "", err
	}

	if account.Equals(srv.repo.acc.id) {
		return "", fmt.Errorf("cannot remotely issue an invoice to myself")
	}

	all, err := srv.db.ListAccountDevices()
	if err != nil {
		return "", err
	}

	for a, dd := range all {
		if a.Equals(account) {

			for _, deviceID := range dd {
				cc, err := srv.dialPeer(ctx, deviceID.PeerID())
				if err != nil {
					continue
				}
				p2pc := p2p.NewP2PClient(cc)

				remoteInvoice, err := p2pc.GetInvoice(ctx, &p2p.GetInvoiceRequest{
					AmountSats:   request.AmountSats,
					Memo:         request.Memo,
					HoldInvoice:  request.HoldInvoice,
					PreimageHash: request.PreimageHash,
				})
				if err != nil {
					return "", err
				} else if remoteInvoice.PayReq != "" { // TODO: instead of checking empty payreq, include an extra grpc field indicating the reason of failure
					return remoteInvoice.PayReq, nil
				}
			}
			return "", fmt.Errorf("none of the devices associated with the provided account were reacheble")
		}
	}

	return "", fmt.Errorf("couln't find account %s", account.String())
}
