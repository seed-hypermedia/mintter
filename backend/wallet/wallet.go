package wallet

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"mintter/backend/core"
	p2p "mintter/backend/genproto/p2p/v1alpha"
	"mintter/backend/lndhub"
	"mintter/backend/lndhub/lndhubsql"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs/vcssql"
	wallet "mintter/backend/wallet/walletsql"
	"net/http"
	"regexp"
	"strings"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
)

const (
	// to detect a failure that is not really a failure
	AlreadyLndhubgoWallet = "Already existing one"
)

var (
	supportedWallets = []string{lndhubsql.LndhubWalletType, lndhubsql.LndhubGoWalletType}
	validCredentials = regexp.MustCompile(`([A-Za-z0-9_\-\.]+):\/\/([0-9a-z]+):([0-9a-f]+)@https:\/\/([A-Za-z0-9_\-\.]+)\/?$`)
)

// AccountID is a handy alias of Cid.
type AccountID = cid.Cid

// Service wraps everything necessary to deliver a wallet service
type Service struct {
	lightningClient lnclient
	pool            *sqlitex.Pool
	net             *future.ReadOnly[*mttnet.Node]
}

// Credentials struct holds all we need to connect to different lightning nodes (lndhub, LND, core-lightning, ...).
type Credentials struct {
	Domain     string `json:"domain"`
	WalletType string `json:"wallettype"`
	Login      string `json:"login"`
	Password   string `json:"password"`
	Nickname   string `json:"nickname,omitempty"`
	Token      string `json:"token,omitempty"`
	ID         string `json:"id,omitempty"`
}

// New is the constructor of the wallet service. Since it needs to authenticate to the internal wallet provider (lndhub)
// it may take time in case node is offline. This is why it's initialyzed in a gorutine and calls to the service functions
// will fail until the initial wallet is successfully initialized.
func New(ctx context.Context, db *sqlitex.Pool, net *future.ReadOnly[*mttnet.Node], me *future.ReadOnly[core.Identity]) *Service {
	srv := Service{
		pool: db,
		lightningClient: lnclient{
			Lndhub: lndhub.NewClient(ctx, &http.Client{}, db, me),
		},
		net: net,
	}
	go func() {
		id, err := me.Await(ctx)
		if err != nil {
			panic(err)
		}
		// We assume registration already happened.
		tickerAccount := time.NewTicker(10 * time.Second)

		conn := db.Get(context.Background())
		loginSignature, err := lndhubsql.GetLoginSignature(conn)
		if err == nil && loginSignature == "" {
			err = fmt.Errorf("User did not enter mnemonics yet")
		}
		// we don't know when user will enter mnemonics
		for err != nil {
			select {
			case <-ctx.Done():
				tickerAccount.Stop()
				db.Put(conn)
				return
			case <-tickerAccount.C:
				loginSignature, err = lndhubsql.GetLoginSignature(conn)
				if err == nil && loginSignature == "" {
					err = fmt.Errorf("User did not enter mnemonics yet")
				}
			}
		}
		db.Put(conn)
		tickerAccount.Stop()
		credURI, err := EncodeCredentialsURL(Credentials{
			Domain:     lndhub.MintterDomain,
			WalletType: lndhubsql.LndhubGoWalletType,
			Login:      id.AccountID().String(),
			Password:   loginSignature,
		})
		if err != nil {
			panic(err)
		}
		_, err = srv.InsertWallet(ctx, credURI, "Mintter Wallet")
		if err != nil && strings.Contains(err.Error(), AlreadyLndhubgoWallet) {
			err = nil
		}
		// Insertwallet goes in a loop until success (until online)
		tickerInsert := time.NewTicker(5 * time.Minute)
		defer tickerInsert.Stop()
		for err != nil {
			select {
			case <-ctx.Done():
				return
			case <-tickerInsert.C:
				_, err = srv.InsertWallet(ctx, credURI, "Mintter Wallet")
				if err != nil && strings.Contains(err.Error(), AlreadyLndhubgoWallet) {
					err = nil
				}
			}
		}
		n, err := net.Await(ctx)
		if err != nil {
			panic(err)
		}
		n.SetInvoicer(&srv)
	}()
	return &srv
}

type lnclient struct {
	Lndhub *lndhub.Client
	Lnd    interface{} // TODO: implement LND client
}

// InvoiceRequest holds the necessary fields for the request. Currently hold invoices are not supported, so they're omitted.
type InvoiceRequest struct {
	AmountSats   int64  `help:"The invoice amount in satoshis" default:"0"`
	Memo         string `help:"Optional requested memo to be attached in the invoice" default:""`
	HoldInvoice  bool   `help:"If we request a hold invoice instead of a regular one. If true, then the following field is mandatory" default:"false"`
	PreimageHash []byte `help:"Preimage hash of the requested hold invoice. If HoldInvoice flag is set to false this field is skipped" default:""`
}

// P2PInvoiceRequest requests a remote account to issue an invoice so we can pay it.
// Any of the devices associated with the remote account can issue it. For each
// associated device we found online ,we ask if it can provide an invoice.
// If for some reason, that device cannot create the invoice (insufficient
// inbound liquidity) we ask the next device. We return in the first device that
// can issue the invoice. If none of them can, then an error is raised.
func (srv *Service) P2PInvoiceRequest(ctx context.Context, account AccountID, request InvoiceRequest) (string, error) {
	net, ok := srv.net.Get()
	if !ok {
		return "", fmt.Errorf("network is not ready yet")
	}

	if net.ID().AccountID().Equals(account) {
		return "", fmt.Errorf("cannot remotely issue an invoice to myself")
	}

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return "", err
	}
	defer release()

	all, err := vcssql.ListAccountDevices(conn)
	if err != nil {
		return "", fmt.Errorf("couldn't list devices from account ID %s", account.String())
	}

	if devices, found := all[account]; found {
		for _, deviceID := range devices {
			p2pc, err := net.Client(ctx, deviceID)
			if err != nil {
				continue
			}

			remoteInvoice, err := p2pc.RequestInvoice(ctx, &p2p.RequestInvoiceRequest{
				AmountSats:   request.AmountSats,
				Memo:         request.Memo,
				HoldInvoice:  request.HoldInvoice,
				PreimageHash: request.PreimageHash,
			})

			if err != nil {
				return "", fmt.Errorf("request invoice failed: %w", err)
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
// in plain text at the moment.
func (srv *Service) InsertWallet(ctx context.Context, credentialsURL, name string) (wallet.Wallet, error) {
	var err error
	var ret wallet.Wallet

	creds, err := DecodeCredentialsURL(credentialsURL)
	if err != nil {
		return ret, err
	}

	if !isSupported(creds.WalletType) {
		return ret, fmt.Errorf(" wallet type [%s] not supported. Currently supported: [%v]", creds.WalletType, supportedWallets)
	}

	if creds.WalletType == lndhubsql.LndhubGoWalletType || creds.WalletType == lndhubsql.LndhubWalletType {
		srv.lightningClient.Lndhub.WalletID = URL2Id(credentialsURL)
	}

	conn := srv.pool.Get(ctx)
	if conn == nil {
		return ret, fmt.Errorf("couldn't get sqlite connector from the pool before timeout. New wallet %s has not been inserted in database", name)
	}
	defer srv.pool.Put(conn)
	ret.Type = creds.WalletType
	ret.Address = "https://" + creds.Domain
	ret.ID = creds.ID
	ret.Name = name
	if creds.WalletType == lndhubsql.LndhubGoWalletType {
		// Only one lndhub.go wallet is allowed
		wallets, err := srv.ListWallets(ctx)
		if err != nil {
			return ret, err
		}
		for i := 0; i < len(wallets); i++ {
			if wallets[i].Type == lndhubsql.LndhubGoWalletType {
				return wallets[i], fmt.Errorf("Only one type of %s wallet is allowed. "+AlreadyLndhubgoWallet, lndhubsql.LndhubGoWalletType)
			}
		}
		if creds.Nickname == "" {
			creds.Nickname = creds.Login
		}
		newWallet, err := srv.lightningClient.Lndhub.Create(ctx, ret.Address, creds.Login, creds.Password, creds.Nickname)
		if err != nil {
			return ret, err
		}
		creds.Nickname = newWallet.Nickname
	}

	if err = wallet.InsertWallet(conn, ret, []byte(creds.Login), []byte(creds.Password), []byte(creds.Token)); err != nil {
		if strings.Contains(err.Error(), wallet.AlreadyExistsError) {
			return ret, fmt.Errorf("couldn't insert wallet %s in the database. ID already exists", name)
		}
		return ret, fmt.Errorf("couldn't insert wallet %s in the database: %w", name, err)
	}

	// Trying to authenticate with the provided credentials
	creds.Token, err = srv.lightningClient.Lndhub.Auth(ctx)
	if err != nil {
		_ = wallet.RemoveWallet(conn, ret.ID)
		return ret, fmt.Errorf("couldn't authenticate new wallet %s: %w", name, err)
	}

	return ret, err
}

// ListWallets returns all the wallets available in the database.
func (srv *Service) ListWallets(ctx context.Context) ([]wallet.Wallet, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return nil, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)
	wallets, err := wallet.ListWallets(conn, -1)
	if err != nil {
		return nil, fmt.Errorf("couldn't list wallets: %w", err)
	}
	for i, w := range wallets {
		if strings.ToLower(w.Type) == lndhubsql.LndhubWalletType || strings.ToLower(w.Type) == lndhubsql.LndhubGoWalletType {
			balance, err := srv.lightningClient.Lndhub.GetBalance(ctx)
			if err != nil {
				return nil, fmt.Errorf("couldn't get balance from wallet %s: %w", w.Name, err)
			}
			wallets[i].Balance = int64(balance)
		}
	}
	return wallets, nil
}

// DeleteWallet removes the wallet given a valid ID string representing
// the url hash in case of Lndhub-type wallet or the pubkey in case of LND.
// If the removed wallet was the default wallet, a random wallet will be
// chosen as new default. Although it is advised that the user manually
// changes the default wallet after removing the previous default
func (srv *Service) DeleteWallet(ctx context.Context, walletID string) error {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)
	if err := wallet.RemoveWallet(conn, walletID); err != nil {
		return fmt.Errorf("couldn't remove wallet %s. %s", walletID, err.Error())
	}
	// TODO: remove associated token db entries
	return nil
}

// UpdateWalletName updates an existing wallet's name with the one provided.
// If the wallet represented by the id id does not exist, this function
// returns error. nil otherwise, along with the updated wallet.
func (srv *Service) UpdateWalletName(ctx context.Context, walletID string, newName string) (wallet.Wallet, error) {
	var ret wallet.Wallet
	var err error
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return ret, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)
	if ret, err = wallet.UpdateWalletName(conn, walletID, newName); err != nil {
		return ret, fmt.Errorf("couldn't update wallet %s. %s", walletID, err.Error())
	}

	return ret, nil
}

// SetDefaultWallet sets the default wallet to the one that matches walletID.
// Previous default wallet is replaced by the new one so only one can be
// the default at any given time. The default wallet is the first wallet ever
// created until manually changed.
func (srv *Service) SetDefaultWallet(ctx context.Context, walletID string) (wallet.Wallet, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return wallet.Wallet{}, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)

	return wallet.UpdateDefaultWallet(conn, walletID)
}

// ExportWallet returns the wallet credentials in uri format so the user can import it
// to an external app. the uri format is:
// <wallet_type>://<alphanumeric_login>:<alphanumeric_password>@https://<domain>
// lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io
func (srv *Service) ExportWallet(ctx context.Context, walletID string) (string, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return "", fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)
	login, err := lndhubsql.GetLogin(conn, walletID)
	if err != nil {
		return "", err
	}
	password, err := lndhubsql.GetPassword(conn, walletID)
	if err != nil {
		return "", err
	}
	url, err := lndhubsql.GetAPIURL(conn, walletID)
	if err != nil {
		return "", err
	}
	splitURL := strings.Split(url, "//")
	if len(splitURL) != 2 {
		return "", fmt.Errorf("Could not export wallet, unexpected url format [%s]", url)
	}
	//TODO: strip off the https:// part of the apiurl
	return EncodeCredentialsURL(Credentials{
		Domain:     splitURL[1],
		WalletType: lndhubsql.LndhubWalletType,
		Login:      login,
		Password:   password,
		ID:         walletID,
	})
}

// UpdateLnaddressNickname updates nickname on the lndhub.go database
// The update can fail if the nickname contain special characters or is already taken by another user.
// Since it is a user operation, if the login is a CID, then user must provide a token representing
// the pubkey whose private counterpart created the signature provided in password (like in create).
func (srv *Service) UpdateLnaddressNickname(ctx context.Context, nickname string) error {
	return srv.lightningClient.Lndhub.UpdateNickname(ctx, nickname)
}

// GetDefaultWallet gets the user's default wallet. If the user didn't manually
// update the default wallet, then the first wallet ever created is the default
// wallet. It will remain default until manually changed.
func (srv *Service) GetDefaultWallet(ctx context.Context) (wallet.Wallet, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return wallet.Wallet{}, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)

	return wallet.GetDefaultWallet(conn)
}

// ListPaidInvoices returns the invoices that the wallet represented by walletID has paid.
func (srv *Service) ListPaidInvoices(ctx context.Context, walletID string) ([]lndhub.Invoice, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return nil, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)

	w, err := wallet.GetWallet(conn, walletID)
	if err != nil {
		return nil, fmt.Errorf("couldn't list wallets: %w", err)
	}
	if strings.ToLower(w.Type) != lndhubsql.LndhubWalletType && strings.ToLower(w.Type) != lndhubsql.LndhubGoWalletType {
		return nil, fmt.Errorf("Coulnd not get invoices form wallet type %s", w.Type)
	}
	return srv.lightningClient.Lndhub.ListPaidInvoices(ctx)
}

// ListReceivednvoices returns the incoming invoices that the wallet represented by walletID has received
func (srv *Service) ListReceivednvoices(ctx context.Context, walletID string) ([]lndhub.Invoice, error) {
	conn := srv.pool.Get(ctx)
	if conn == nil {
		return nil, fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)

	w, err := wallet.GetWallet(conn, walletID)
	if err != nil {
		return nil, fmt.Errorf("couldn't list wallets: %w", err)
	}
	if strings.ToLower(w.Type) != lndhubsql.LndhubWalletType && strings.ToLower(w.Type) != lndhubsql.LndhubGoWalletType {
		return nil, fmt.Errorf("Coulnd not get invoices form wallet type %s", w.Type)
	}
	return srv.lightningClient.Lndhub.ListReceivedInvoices(ctx)
}

// RequestRemoteInvoice asks a remote peer to issue an invoice. The remote user can be either a lnaddres or a mintter account ID
// First an lndhub invoice request is attempted. In it fails, then a P2P its used to transmit the invoice. In that case,
// Any of the devices associated with the accountID can issue the invoice. The memo field is optional and can be left nil.
func (srv *Service) RequestRemoteInvoice(ctx context.Context, remoteUser string, amountSats int64, memo *string) (string, error) {
	invoiceMemo := ""
	if memo != nil {
		invoiceMemo = *memo
	}
	var payReq string
	var err error
	payReq, err = srv.lightningClient.Lndhub.RequestRemoteInvoice(ctx, remoteUser, amountSats, invoiceMemo)
	//err = fmt.Errorf("force p2p trnasmission")
	if err != nil {
		c, err := cid.Decode(remoteUser)
		if err != nil {
			return "", fmt.Errorf("couldn't parse accountID string [%s], If using p2p transmission, remoteUser must be a valid accountID", remoteUser)
		}
		payReq, err = srv.P2PInvoiceRequest(ctx, c,
			InvoiceRequest{
				AmountSats:   amountSats,
				Memo:         invoiceMemo,
				HoldInvoice:  false,    // TODO: Add support hold invoices
				PreimageHash: []byte{}, // Only aplicable to hold invoices
			})
		if err != nil {
			return "", fmt.Errorf("Could not request invoice via P2P: %w", err)
		}
	}

	return payReq, nil
}

// CreateLocalInvoice tries to generate an invoice locally from the default wallet The memo field is optional and can be left nil.
func (srv *Service) CreateLocalInvoice(ctx context.Context, amountSats int64, memo *string) (string, error) {
	invoiceMemo := ""
	if memo != nil {
		invoiceMemo = *memo
	}

	defaultWallet, err := srv.GetDefaultWallet(ctx)
	if err != nil {
		return "", fmt.Errorf("could not get default wallet to ask for a local invoice: %w", err)
	}

	if defaultWallet.Type != lndhubsql.LndhubWalletType && defaultWallet.Type != lndhubsql.LndhubGoWalletType {
		return "", fmt.Errorf("Wallet type %s not compatible with local invoice creation", defaultWallet.Type)
	}

	return srv.lightningClient.Lndhub.CreateLocalInvoice(ctx, amountSats, invoiceMemo)
}

// PayInvoice tries to pay the provided invoice. If a walletID is provided, that wallet will be used instead of the default one
// If amountSats is provided, the invoice will be paid with that amount. This amount should be equal to the amount on the invoice
// unless the amount on the invoice is 0.
func (srv *Service) PayInvoice(ctx context.Context, payReq string, walletID *string, amountSats *uint64) (string, error) {
	var walletToPay wallet.Wallet
	var err error
	var amountToPay uint64
	conn := srv.pool.Get(ctx)

	if conn == nil {
		return "", fmt.Errorf("couldn't get sqlite connector from the pool before timeout")
	}
	defer srv.pool.Put(conn)

	if walletID != nil {
		walletToPay, err = wallet.GetWallet(conn, *walletID)
		if err != nil {
			return "", fmt.Errorf("couldn't get wallet %s: %w", *walletID, err)
		}
	} else {
		walletToPay, err = srv.GetDefaultWallet(ctx)
		if err != nil {
			return "", fmt.Errorf("couldn't get default wallet to pay: %w", err)
		}
	}

	if !isSupported(walletToPay.Type) {
		return "", fmt.Errorf(" wallet type [%s] not supported to pay. Currently supported: [%v]", walletToPay.Type, supportedWallets)
	}

	if amountSats == nil || *amountSats == 0 {
		invoice, err := lndhub.DecodeInvoice(payReq)
		if err != nil {
			return "", fmt.Errorf("couldn't decode invoice [%s], please make sure it is a bolt-11 complatible invoice: %w", payReq, err)
		}
		amountToPay = uint64(invoice.MilliSat.ToSatoshis())
	} else {
		amountToPay = *amountSats
	}

	if err = srv.lightningClient.Lndhub.PayInvoice(ctx, payReq, amountToPay); err != nil {
		if strings.Contains(err.Error(), wallet.NotEnoughBalance) {
			return "", fmt.Errorf("couldn't pay invoice. Insufficient balance in wallet %s", walletToPay.Name)
		}
		if strings.Contains(err.Error(), wallet.InvoiceQttyMissmatch) {
			return "", fmt.Errorf("couldn't pay invoice due to a quantity missmatch: %w", err)
		}
		return "", fmt.Errorf("couldn't pay invoice: %w", err)
	}

	return walletToPay.ID, nil
}

// GetLnAddress gets the account-wide ln address in the form of <nickname>@<domain> .
// Since it is a user operation, if the login is a CID, then user must provide a token representing
// the pubkey whose private counterpart created the signature provided in password (like in create).
func (srv *Service) GetLnAddress(ctx context.Context) (string, error) {
	return srv.lightningClient.Lndhub.GetLnAddress(ctx)
}

// DecodeCredentialsURL takes a credential string of the form
// <wallet_type>://<alphanumeric_login>:<alphanumeric_password>@https://<domain>
// lndhub://c227a7fb5c71a22fac33:d2a48ab779aa1b02e858@https://lndhub.io
func DecodeCredentialsURL(url string) (Credentials, error) {
	credentials := Credentials{}

	res := validCredentials.FindStringSubmatch(url)
	if res == nil || len(res) != 5 {
		if res != nil {
			return credentials, fmt.Errorf("credentials contained more than necessary fields. it shoud be " +
				"<wallet_type>://<alphanumeric_login>:<alphanumeric_password>@https://<domain>")
		}
		return credentials, fmt.Errorf("couldn't parse credentials, probalby wrong format. it shoud be " +
			"<wallet_type>://<alphanumeric_login>:<alphanumeric_password>@https://<domain>")
	}
	credentials.WalletType = strings.ToLower(res[1])
	credentials.Login = res[2]
	credentials.Password = res[3]
	credentials.Domain = res[4]
	credentials.ID = URL2Id(url)
	return credentials, nil
}

// URL2Id constructs a unique and collision-free ID out of a credentials URL
func URL2Id(url string) string {
	h := sha256.Sum256([]byte(url))
	return hex.EncodeToString(h[:])
}

// EncodeCredentialsURL generates a credential URL out of credential parameters.
// the resulting url will have this format
// <wallet_type>://<alphanumeric_login>:<alphanumeric_password>@https://<domain>
func EncodeCredentialsURL(creds Credentials) (string, error) {
	url := creds.WalletType + "://" + creds.Login + ":" + creds.Password + "@https://" + creds.Domain
	_, err := DecodeCredentialsURL(url)
	return url, err
}

func isSupported(walletType string) bool {
	var supported bool = false
	for _, supWalletType := range supportedWallets {
		if walletType == supWalletType {
			supported = true
			break
		}
	}
	return supported
}
