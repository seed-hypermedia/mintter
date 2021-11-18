package backend

import (
	"context"
	"encoding/hex"
	"fmt"
	p2p "mintter/backend/api/p2p/v1alpha"
	"mintter/backend/lndhub"
	"mintter/backend/wallet"
	"strings"

	"github.com/ipfs/go-cid"
)

type lnclient struct {
	Lndhub *lndhub.Client
	Lnd    interface{} // TODO: implement LND client
}
type InvoiceRequest struct {
	AmountSats   int64  `help:"The invoice amount in satoshis" default:"0"`
	Memo         string `help:"Optional requested memo to be attached in the invoice" default:""`
	HoldInvoice  bool   `help:"If we request a hold invoice instead of a regular one. If true, then the following field is mandatory" default:"false"`
	PreimageHash []byte `help:"Preimage hash of the requested hold invoice. If HoldInvoice flag is set to false this field is skipped" default:""`
}

// RemoteInvoiceRequest requests a remote account to issue an invoice so we can pay it.
// Any of the devices associated with the remote account can issue it. For each
// associated device we found online ,we ask if it can provide an invoice.
// If for some reason, that device cannot create the invoice (insufficient
// inbound liquidity) we ask the next device. We return in the first device that
// can issue the invoice. If none of them can, then an error is raised.
func (srv *backend) RemoteInvoiceRequest(ctx context.Context, account AccountID,
	request InvoiceRequest) (string, error) {
	if _, err := srv.readyIPFS(); err != nil {
		return "", fmt.Errorf("account %s not ready yet. %s", account.String(), err.Error())
	}

	if account.Equals(srv.repo.acc.id) {
		return "", fmt.Errorf("cannot remotely issue an invoice to myself")
	}

	all, err := srv.db.ListAccountDevices()
	if err != nil {
		return "", fmt.Errorf("couldn't list devices from account ID %s. %s", account.String(), err.Error())
	}

	if devices, found := all[account]; found {
		for _, deviceID := range devices {
			cc, err := srv.dialPeer(ctx, deviceID.PeerID())
			if err != nil {
				continue
			}
			p2pc := p2p.NewP2PClient(cc)

			remoteInvoice, err := p2pc.RequestInvoice(ctx, &p2p.RequestInvoiceRequest{
				AmountSats:   request.AmountSats,
				Memo:         request.Memo,
				HoldInvoice:  request.HoldInvoice,
				PreimageHash: request.PreimageHash,
			})

			if err != nil {
				return "", fmt.Errorf("request invoice failed. %s", err.Error())
			}

			if remoteInvoice.PayReq == "" {
				return "", fmt.Errorf("received an empty invoice from remote peer")
			}

			return remoteInvoice.PayReq, nil
		}
		return "", fmt.Errorf("none of the devices associated with the provided account were reachable")
	}

	return "", fmt.Errorf("couln't find account %s", account.String())
}

// InsertWallet first tries to connect to the wallet with the provided credentials. On
// success, gets the wallet balance and inserts all that information in the database.
// InsertWallet returns the wallet actually inserted on success. The credentias are stored
// in plain text at the moment
func (srv *backend) InsertWallet(ctx context.Context, walletType, credentialsURL, name string) (wallet.Wallet, error) {
	var err error
	var ret wallet.Wallet
	if strings.ToLower(walletType) != lndhub.LndhubWalletType { // TODO: support LND wallets
		return ret, fmt.Errorf(" wallet typy not supported. currently only %s", lndhub.LndhubWalletType)
	}

	creds, err := lndhub.ParseCredentials(credentialsURL)
	if err != nil {
		return ret, err
	}

	// Trying to authenticate with the provided credentials
	creds.Token, err = srv.lightningClient.Lndhub.Auth(ctx, creds)
	if err != nil {
		return ret, fmt.Errorf("couldn't authenticate new wallet %s. Please check provided credentials %s", name, err.Error())
	}

	balanceSats, err := srv.lightningClient.Lndhub.GetBalance(ctx, creds)
	if err != nil {
		return ret, err
	}

	conn := srv.pool.Get(ctx)
	if conn == nil {
		return ret, fmt.Errorf("couldn't get sqlite connector from the pool before timeout. New wallet %s has not been inserted in database", name)
	}
	defer srv.pool.Put(conn)

	ret.Address = creds.ConnectionURL
	ret.Balance = int64(balanceSats)
	ret.ID = creds.ID
	ret.Name = name
	ret.Type = lndhub.LndhubWalletType
	binaryToken, err := hex.DecodeString(creds.Token) // TODO: encrypt the token before storing

	if err != nil {
		return ret, fmt.Errorf("couldn't decode token before insert %s in the database. Err %s", name, err.Error())
	}

	if err = wallet.InsertWallet(conn, ret, binaryToken); err != nil {
		return ret, fmt.Errorf("couldn't insert wallet %s in the database. Err %s", name, err.Error())
	}
	return ret, err
}

// ListWallets returns all the wallets available in the database.
func (srv *backend) ListWallets(ctx context.Context) ([]wallet.Wallet, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return nil, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)
	wallets, err := wallet.ListWallets(conn, -1)
	if err != nil {
		return nil, err
	}
	for _, w := range wallets {
		if strings.ToLower(w.Type) == lndhub.LndhubWalletType {
			token, err := wallet.GetAuth(conn, w.ID)
			if err != nil {
				return nil, fmt.Errorf("couldn't get auth from wallet %s Error %s", w.Name, err.Error())
			}
			creds := lndhub.Credentials{
				ConnectionURL: w.Address,
				Token:         hex.EncodeToString(token),
				ID:            w.ID,
			}
			balance, err := srv.lightningClient.Lndhub.GetBalance(ctx, creds)
			if err != nil {
				return nil, fmt.Errorf("couldn't get balance %s Error %s", w.Name, err.Error())
			}
			w.Balance = int64(balance)
		}
	}
	return wallets, nil
}

// DeleteWallet removes the wallet given a valid ID string representing
// the url hash in case of Lndhub-type wallet or the pubkey in case of LND.
// If the removed wallet was the default wallet, a random wallet will be
// chosen as new default. Altough it is advised that the user manually
// changes the default wallet after removing the previous default
func (srv *backend) DeleteWallet(ctx context.Context, walletID string) error {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)
	if err := wallet.RemoveWallet(conn, walletID); err != nil {
		return err
	}
	return nil
}

// SetDefaultWallet sets the default wallet to the one that matches walletID.
// Previous default wallet is replaced by the new one so only one can be
// the default at any given time. The default wallet is the first wallet ever
// created until manually changed.
func (srv *backend) SetDefaultWallet(ctx context.Context, walletID string) (wallet.Wallet, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return wallet.Wallet{}, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)

	defaultWallet, err := wallet.UpdateDefaultWallet(conn, walletID)
	if err != nil {
		return wallet.Wallet{}, fmt.Errorf("fail to update default wallet %s", err.Error())
	}

	return defaultWallet, nil
}

// GetDefaultWallet gets the user's default wallet. If the user didn't manually
// update the default wallet, then the first wallet ever created is the default
// wallet. It will remain default until manually changed.
func (srv *backend) GetDefaultWallet(ctx context.Context) (wallet.Wallet, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return wallet.Wallet{}, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)

	defaultWallet, err := wallet.GetDefaultWallet(conn)
	if err != nil {
		return wallet.Wallet{}, err
	}

	return defaultWallet, nil

}

// RequestInvoice asks a remote peer to issue an invoice. Any of the devices associated with the accountID
// can issue the invoice. The memo field is optional and can be left nil
func (srv *backend) RequestInvoice(ctx context.Context, accountID string, amountSats int64, memo *string) (string, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return "", fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)

	invoiceMemo := ""
	if memo != nil {
		invoiceMemo = *memo
	}
	cID, err := cid.Decode(accountID)
	if err != nil {
		return "", fmt.Errorf("couldn't parse accountID string (%s), please check that is a valid accountID. %s", accountID, err.Error())
	}

	payReq, err := srv.RemoteInvoiceRequest(ctx, AccountID(cID),
		InvoiceRequest{
			AmountSats:   amountSats,
			Memo:         invoiceMemo,
			HoldInvoice:  false,    // TODO: Add support hold invoices
			PreimageHash: []byte{}, // Only aplicable to hold invoices
		})
	if err != nil {
		return "", fmt.Errorf("couldn't request remote invoice. %s", err.Error())
	}
	return payReq, nil
}
