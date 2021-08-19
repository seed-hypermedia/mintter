package lightning

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/lightningnetwork/lnd/lnrpc"
	"github.com/lightningnetwork/lnd/lnrpc/chainrpc"
	"github.com/lightningnetwork/lnd/lnrpc/invoicesrpc"
	"github.com/lightningnetwork/lnd/lnrpc/routerrpc"
	"github.com/lightningnetwork/lnd/lnrpc/signrpc"
	"github.com/lightningnetwork/lnd/lnrpc/walletrpc"
	"github.com/lightningnetwork/lnd/macaroons"
	"github.com/lightningnetwork/lnd/subscribe"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	macaroon "gopkg.in/macaroon.v2"

	"mintter/backend/config"
)

const (
	defaultTLSCertFilename   = "tls.cert"
	defaultMacaroonFilename  = "admin.macaroon"
	currentAdminMacaroonSize = 252
)

var (
	// maxMsgRecvSize is the largest message our client will receive. We
	// set this to ~50Mb atm.
	maxMsgRecvSize = grpc.MaxCallRecvMsgSize(1 * 1024 * 1024 * 50)
)

// API represents the lnnode exposed functions that are accessible for
// mintter services to use.
// It is mainly enable the service to subscribe to various daemon events
// and get an APIClient to query the daemon directly via RPC.
type API interface {
	SubscribeEvents() (*subscribe.Client, error)
	HasActiveChannel() bool
	IsReadyForPayment() bool
	WaitReadyForPayment(timeout time.Duration) error
	NodePubkey() string
	APIClient() lnrpc.LightningClient
	RouterClient() routerrpc.RouterClient
	WalletKitClient() walletrpc.WalletKitClient
	ChainNotifierClient() chainrpc.ChainNotifierClient
	InvoicesClient() invoicesrpc.InvoicesClient
	SignerClient() signrpc.SignerClient
}

type WalletSecurity struct {
	WalletPassphrase string   `help:"The password for encrypting the wallet. Mandatory"`
	RecoveryWindow   int32    `help:"A positive number indicating the lookback period (from the tip of the chain) in blocks to start scanning for funds in case we want to recover an already created wallet"`
	AezeedPassphrase string   `help:"The password to encrypt the Aezeed superseed. Not to confuse with the wallet password, it may be diferent. Optional"`
	AezeedMnemonics  []string `help:"The mnemonics used to regenerate the wallet"`
	SeedEntropy      []byte   `help:"An entropy random enough used to securely derive the seed of the wallet"`
	StatelessInit    bool     `help:"If true, no macaroon will be written on disk on any wallet manimulation (unlock, init or change password) It does not mean a new macaroon is not generated, just that it is not written to disk"`
}

// HasActiveChannel returns true if the node has at least one active channel.
func (d *Ldaemon) HasActiveChannel() bool {
	lnclient := d.APIClient()
	if lnclient == nil {
		return false
	}
	channels, err := lnclient.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{
		ActiveOnly: true,
	})
	if err != nil {
		d.log.Error("Error in HasActiveChannel() > ListChannels()", zap.String("err", err.Error()))
		return false
	}
	return len(channels.Channels) > 0
}

// WaitReadyForPayment is waiting until we are ready to pay
func (d *Ldaemon) WaitReadyForPayment(timeout time.Duration) error {
	client, err := d.ntfnServer.Subscribe()
	if err != nil {
		return err
	}
	defer client.Cancel()

	if d.IsReadyForPayment() {
		return nil
	}

	d.log.Info("WaitReadyForPayment - not yet ready for payment, waiting...")
	timeoutTimer := time.After(timeout)
	for {
		select {
		case event := <-client.Updates():
			switch event.(type) {
			case ChannelEvent:
				d.log.Info("WaitReadyForPayment got channel event", zap.Bool("Ready", d.IsReadyForPayment()))
				if d.IsReadyForPayment() {
					return nil
				}
			}
		case <-timeoutTimer:
			if d.IsReadyForPayment() {
				return nil
			}
			d.log.Info("WaitReadyForPayment got timeout event")
			return fmt.Errorf("timeout has exceeded while trying to process your request")
		}
	}
}

// IsReadyForPayment returns true if we can pay
func (d *Ldaemon) IsReadyForPayment() bool {
	lnclient := d.APIClient()
	if lnclient == nil {
		return false
	}
	allChannelsActive, err := d.allChannelsActive(lnclient)
	if err != nil {
		d.log.Error("Error in allChannelsActive(): %v", zap.String("err", err.Error()))
		return false
	}
	return allChannelsActive
}

// NodePubkey returns the identity public key of the lightning node.
func (d *Ldaemon) NodePubkey() string {
	d.Lock()
	defer d.Unlock()
	return d.nodePubkey
}

// APIClient returns the interface to query the daemon.
func (d *Ldaemon) APIClient() lnrpc.LightningClient {
	d.Lock()
	defer d.Unlock()
	return d.lightningClient
}

// UnlockWallet unlocks an existing wallet provided a valid
// passphrase. If the StatelessInit param is false,
// a macaroon is also written to disk.
func (d *Ldaemon) UnlockWallet(Passphrase string, StatelessInit bool) error {
	/*FIXME do we really need these locks here?
	d.Lock()
	defer d.Unlock()
	*/

	if len(Passphrase) == 0 {
		return fmt.Errorf("You must provide a non null password")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	unlock_req := &lnrpc.UnlockWalletRequest{
		WalletPassword: []byte(Passphrase),
		RecoveryWindow: 0,
		ChannelBackups: &lnrpc.ChanBackupSnapshot{},
		StatelessInit:  StatelessInit,
	}

	if _, err := d.unlockerClient.UnlockWallet(ctx, unlock_req); err != nil {
		return err
	} else {
		return nil

	}
}

// ChangeWalletPassPhrase changes the Wallet password. This assumes
// the wallet is still locked, i.e. no Unlock wallet method has been
// called yet. This also assumes the wallet exists and the user
// provides a valid OldPassphrase. On success, the function returns
// the new macarron according to the new password. If the
// StatelessInit param is false, the macaroon is also written to disk.
func (d *Ldaemon) ChangeWalletPassPhrase(OldPassphrase string,
	NewPassphrase string, StatelessInit bool) ([]byte, error) {
	/*FIXME do we really need these locks here?
	d.Lock()
	defer d.Unlock()
	*/

	if len(NewPassphrase) == 0 {
		return nil, fmt.Errorf("You must provide a non null new password")
	} else if NewPassphrase == OldPassphrase {
		return nil, fmt.Errorf("You new password must be different from the old one")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	pass_req := &lnrpc.ChangePasswordRequest{
		CurrentPassword:    []byte(OldPassphrase),
		NewPassword:        []byte(NewPassphrase),
		StatelessInit:      StatelessInit,
		NewMacaroonRootKey: false,
	}

	if pass_res, err := d.unlockerClient.ChangePassword(ctx, pass_req); err != nil {
		d.log.Error("Could not change passwords", zap.String("err", err.Error()))
		return nil, err
	} else {
		return pass_res.AdminMacaroon, nil
	}

}

// InitWallet initializes a wallet from scratch provided a Wallet Passphrase,
// a positive RecoveryWindow (lookback number of blocks to watch for funds
// in recovery mode, 0 otherwise), an optional AezeedPassphrase (if we want to
// set a passphrase to the mnemonics) and either a 24 word mnemonics or a Seed
// entropy. If an entropy is provided we discard the Mnemonics and we create
// new ones from the entropy provided. On success, this function returns the
// serialized admin macaroon to use in all rpc calls. If the StatelessInit param
// is false, the macaroon is also written to disk.
func (d *Ldaemon) InitWallet(WalletSecurity *WalletSecurity) ([]byte, error) {
	/*FIXME do we really need these locks here?
	d.Lock()
	defer d.Unlock()
	*/
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// if the user wants to init a wallet from an entropy instead of
	// from an already created mnemonics
	if len(WalletSecurity.SeedEntropy) != 0 {
		getSeedReq := &lnrpc.GenSeedRequest{
			AezeedPassphrase: []byte(WalletSecurity.AezeedPassphrase),
			SeedEntropy:      WalletSecurity.SeedEntropy,
		}
		if seed_res, err := d.unlockerClient.GenSeed(ctx, getSeedReq); err != nil {
			d.log.Error("Could not get seed from parameters provided", zap.String("err", err.Error()))
			return nil, err
		} else {
			WalletSecurity.AezeedMnemonics = seed_res.CipherSeedMnemonic
		}
		d.log.Info("Init Wallet from entropy")

		// if the user already has mnemonics from a previous instance or
		// it wants to recover a node, then we create from mnemonics
	} else if len(WalletSecurity.AezeedMnemonics) != 0 {
		if WalletSecurity.RecoveryWindow > 0 {
			d.log.Info("Init Wallet from Mnemonics")
		} else if WalletSecurity.RecoveryWindow == 0 {
			// This would be strange since if the user already has mnemonics and wants to create a new wallet,
			// is usually because it is in recovery mode, but with a window length of 0, no past funds will be found
			d.log.Warn("Init Wallet from Mnemonics but with a 0 recovery window. No funds will be recovered")
		} else {
			return nil, fmt.Errorf("Recovery window must be >= 0 and it is %v", WalletSecurity.RecoveryWindow)
		}

	} else {
		return nil, fmt.Errorf("You must provide either a valid AezeedMnemonics or a valid entropy")
	}

	initWalletrequest := &lnrpc.InitWalletRequest{
		WalletPassword:     []byte(WalletSecurity.WalletPassphrase),
		CipherSeedMnemonic: WalletSecurity.AezeedMnemonics,
		AezeedPassphrase:   []byte(WalletSecurity.AezeedPassphrase),
		RecoveryWindow:     WalletSecurity.RecoveryWindow,
		ChannelBackups:     &lnrpc.ChanBackupSnapshot{},
		StatelessInit:      WalletSecurity.StatelessInit,
	}
	if init_res, err := d.unlockerClient.InitWallet(ctx, initWalletrequest); err != nil {
		d.log.Error("Could not InitWallet response from params provided",
			zap.Int32("RecoveryWindow", WalletSecurity.RecoveryWindow),
			zap.Bool("StatelessInit", WalletSecurity.StatelessInit))
		return nil, err
	} else {
		return init_res.AdminMacaroon, nil
	}

}

func (d *Ldaemon) RouterClient() routerrpc.RouterClient {
	d.Lock()
	defer d.Unlock()
	return d.routerClient
}

func (d *Ldaemon) WalletKitClient() walletrpc.WalletKitClient {
	d.Lock()
	defer d.Unlock()
	return d.walletKitClient
}

func (d *Ldaemon) ChainNotifierClient() chainrpc.ChainNotifierClient {
	d.Lock()
	defer d.Unlock()
	return d.chainNotifierClient
}

func (d *Ldaemon) SignerClient() signrpc.SignerClient {
	d.Lock()
	defer d.Unlock()
	return d.signerClient
}

func (d *Ldaemon) InvoicesClient() invoicesrpc.InvoicesClient {
	d.Lock()
	defer d.Unlock()
	return d.invoicesClient
}

// Check the macaroons are in the expected path and weight more than
// the blank macaroon
func checkMacaroons(cfg *config.LND) error {

	mDir := path.Join(cfg.LndDir, "data", "chain", "bitcoin", cfg.Network)
	fi, err := os.Stat(path.Join(mDir, defaultMacaroonFilename))
	if err != nil {
		return err
	}
	if fi.Size() < currentAdminMacaroonSize {
		os.Remove(path.Join(mDir, defaultMacaroonFilename))
		os.Remove(path.Join(mDir, "invoice.macaroon"))
		os.Remove(path.Join(mDir, "readonly.macaroon"))
	}
	return nil
}

func newLightningClient(cfg *config.LND) (*grpc.ClientConn, error) {
	return newLightningConnection(cfg)
}

func newLightningConnection(cfg *config.LND) (*grpc.ClientConn, error) {
	appWorkingDir := cfg.LndDir
	network := cfg.Network
	macaroonDir := strings.Join([]string{appWorkingDir, "data", "chain", "bitcoin", network}, "/")
	tlsCertPath := filepath.Join(appWorkingDir, defaultTLSCertFilename)
	creds, err := credentials.NewClientTLSFromFile(tlsCertPath, "")
	if err != nil {
		return nil, err
	}

	// Create a dial options array.
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(creds),
		grpc.WithDefaultCallOptions(maxMsgRecvSize),
	}

	macPath := filepath.Join(macaroonDir, defaultMacaroonFilename)
	macBytes, err := ioutil.ReadFile(macPath)
	if err != nil {
		return nil, err
	}
	mac := &macaroon.Macaroon{}
	if err = mac.UnmarshalBinary(macBytes); err != nil {
		return nil, err
	}

	// Now we append the macaroon credentials to the dial options.
	cred := macaroons.NewMacaroonCredential(mac)
	opts = append(opts, grpc.WithPerRPCCredentials(cred))

	// FIXME Decide if we are going to use unix sockets or not
	/*
		conn, err := lnd.MemDial()
		if err != nil {
			return nil, err
		}

		// We need to use a custom dialer so we can also connect to unix sockets
		// and not just TCP addresses.
		opts = append(
			opts, grpc.WithDialer(func(target string,
				timeout time.Duration) (net.Conn, error) {
				return conn, nil
			}),
		)
	*/
	grpcCon, err := grpc.Dial("localhost", opts...)
	if err != nil {
		return nil, err
	}

	return grpcCon, nil
}
