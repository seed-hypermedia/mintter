package lightning

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
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
	IsSynced() bool
	WaitReadyForPayment(timeout time.Duration) error
	GetID() string
	GetMacaroon() []byte
	APIClient() lnrpc.LightningClient
	NewAddress() (string, error)
	RouterClient() routerrpc.RouterClient
	WalletKitClient() walletrpc.WalletKitClient
	ChainNotifierClient() chainrpc.ChainNotifierClient
	InvoicesClient() invoicesrpc.InvoicesClient
	SignerClient() signrpc.SignerClient
	SetAcceptorCallback(callback func(req *lnrpc.ChannelAcceptRequest) bool)
}

type WalletSecurity struct {
	WalletPassphrase string   `help:"The current password for encrypting the wallet. Mandatory"`
	RecoveryWindow   int32    `help:"A positive number indicating the lookback period (from the tip of the chain) in blocks to start scanning for funds in case we want to recover an already created wallet"`
	AezeedPassphrase string   `help:"The password to encrypt the Aezeed superseed. Not to confuse with the wallet password, it may be diferent. Optional"`
	AezeedMnemonics  []string `help:"The mnemonics used to regenerate the wallet. If both seed and mnemonics are set, Mnemonics take precedence"`
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

func (d *Ldaemon) IsSynced() bool {
	d.Lock()
	defer d.Unlock()
	return d.synced
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

// GetID returns the identity public key of the lightning node.
func (d *Ldaemon) GetID() string {
	d.Lock()
	defer d.Unlock()
	return d.nodeID
}

// GetMacaroon returns the Admin macaroon to externally control the lnd node via RPC
func (d *Ldaemon) GetMacaroon() []byte {
	d.Lock()
	defer d.Unlock()
	return d.adminMacaroon
}

// APIClient returns the interface to query the daemon. This is the most general client
func (d *Ldaemon) APIClient() lnrpc.LightningClient {
	d.Lock()
	defer d.Unlock()
	return d.lightningClient
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

// The provided function has to decide whether to accetp (return true) or not (return false)
// a channel request based on the information provided by the rpc request struct. The callback
// will be called whenever the node receives a new channel request.
func (d *Ldaemon) SetAcceptorCallback(callback func(req *lnrpc.ChannelAcceptRequest) bool) {
	d.Lock()
	defer d.Unlock()

	acceptorCallback = callback
}

// unlockWallet unlocks an existing wallet provided a valid
// passphrase. If the StatelessInit param is false,
// a macaroon is also written to disk.
func (d *Ldaemon) unlockWallet(Passphrase string, StatelessInit bool) error {

	if len(Passphrase) == 0 {
		return fmt.Errorf("you must provide a non null password")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	unlock_req := &lnrpc.UnlockWalletRequest{
		WalletPassword: []byte(Passphrase),
		RecoveryWindow: 0,
		ChannelBackups: &lnrpc.ChanBackupSnapshot{},
		StatelessInit:  StatelessInit,
	}

	if _, err := d.unlockerClient.UnlockWallet(ctx, unlock_req); err != nil {
		d.log.Error("Could not unlock wallet", zap.Bool("StatelessInit",
			StatelessInit), zap.String("err", err.Error()))
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
func (d *Ldaemon) changeWalletPassPhrase(OldPassphrase string,
	NewPassphrase string, StatelessInit bool) ([]byte, error) {

	if len(NewPassphrase) == 0 {
		return nil, fmt.Errorf("you must provide a non null new password")
	} else if NewPassphrase == OldPassphrase {
		return nil, fmt.Errorf("your new password must be different from the old one")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pass_req := &lnrpc.ChangePasswordRequest{
		CurrentPassword:    []byte(OldPassphrase),
		NewPassword:        []byte(NewPassphrase),
		StatelessInit:      StatelessInit,
		NewMacaroonRootKey: StatelessInit,
	}

	if pass_res, err := d.unlockerClient.ChangePassword(ctx, pass_req); err != nil {
		d.log.Error("Could not change passwords", zap.String("err", err.Error()))
		return nil, err
	} else {
		return pass_res.AdminMacaroon, nil
	}

}

// initWallet initializes a wallet from scratch provided a Wallet Passphrase,
// a positive RecoveryWindow (lookback number of blocks to watch for funds
// in recovery mode, 0 otherwise), an optional AezeedPassphrase (if we want to
// set a passphrase to the mnemonics) and either a 24 word mnemonics or a Seed
// entropy. If an entropy is provided we discard the Mnemonics and we create
// new ones from the entropy provided. On success, this function returns the
// serialized admin macaroon to use in all rpc calls. If the StatelessInit param
// is false, the macaroon is also written to disk.
func (d *Ldaemon) initWallet(WalletSecurity *WalletSecurity) ([]byte, error) {

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// If the user already has mnemonics from a previous instance or
	// it wants to recover a node, then we create from mnemonics
	if len(WalletSecurity.AezeedMnemonics) > 1 {
		if WalletSecurity.RecoveryWindow > 0 {
			d.log.Info("Init Wallet from Mnemonics")
		} else if WalletSecurity.RecoveryWindow == 0 {
			// This would be strange since if the user already has mnemonics and wants to create a new wallet,
			// is usually because it is in recovery mode, but with a window length of 0, no past funds will be found
			d.log.Warn("Init Wallet from Mnemonics but with a 0 recovery window. No funds will be recovered")
		} else {
			return nil, fmt.Errorf("recovery window must be >= 0 and it is %v", WalletSecurity.RecoveryWindow)
		}

	} else if len(WalletSecurity.SeedEntropy) != 0 {
		// if the user wants to init a wallet from an entropy instead of
		// from an already created mnemonics.
		getSeedReq := &lnrpc.GenSeedRequest{
			AezeedPassphrase: []byte(WalletSecurity.AezeedPassphrase),
			SeedEntropy:      WalletSecurity.SeedEntropy,
		}

		if seed_res, err := d.unlockerClient.GenSeed(ctx, getSeedReq); err != nil {
			return nil, fmt.Errorf("could not get seed %s", err.Error())
		} else {
			// These mnemonics are different even if called GenSeed with the same Entropy since the birthday date is diferent
			WalletSecurity.AezeedMnemonics = seed_res.CipherSeedMnemonic
		}
		d.log.Info("Init Wallet from provided entropy + provided password + unknown salt + current date")

	} else if _, err := os.Stat(d.cfg.LndDir + "/data/chain/bitcoin/" + d.cfg.Network + "/wallet.db"); os.IsNotExist(err) {
		return nil, fmt.Errorf("you must provide either a valid AezeedMnemonics or a valid entropy")
	}

	initWalletrequest := &lnrpc.InitWalletRequest{
		WalletPassword:     []byte(WalletSecurity.WalletPassphrase),
		CipherSeedMnemonic: WalletSecurity.AezeedMnemonics,
		AezeedPassphrase:   []byte(WalletSecurity.AezeedPassphrase),
		RecoveryWindow:     WalletSecurity.RecoveryWindow,
		StatelessInit:      WalletSecurity.StatelessInit,
	}
	if init_res, err := d.unlockerClient.InitWallet(ctx, initWalletrequest); err != nil {
		return nil, fmt.Errorf("could not init wallet RecoveryWindow: %d StatelessInit: %t err: %s",
			WalletSecurity.RecoveryWindow, WalletSecurity.StatelessInit, err.Error())
	} else {
		return init_res.AdminMacaroon, nil
	}

}

// This function returns a gRPC client with the required credentials. If noMacaroon flag is set, then the RPC wont include
// any macaroon. This only makes sense at initialization (create wallet or change password) since the admin.macaroon is not baked yet
// Any other situation is considered risky. If noMacaroon flag is unset, then you can either provide the macaroon in binary or giving
// the full path to find it in disk. TLS Certification full path is mandatory (with or without macaroon), as well as host IP:port
func newLightningClient(noMacaroon bool, macBytes []byte, macPath string, certPath string, host string) (*grpc.ClientConn, error) {
	var err error
	var i = 0

	// If its the first time, usualy the lnd autocert is working in another goroutine so we wait a bit
	for {
		if info, err := os.Stat(certPath); os.IsNotExist(err) || info.Size() == 0 {
			i++
			if i > maxConnAttemps {
				return nil, fmt.Errorf("We couldn't find a valid certificate in " + certPath)
			}
			time.Sleep(1 * time.Second)
		} else {
			break
		}
	}

	creds, err := credentials.NewClientTLSFromFile(certPath, "")
	if err != nil {
		return nil, err
	}

	// Create a dial options array.
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(creds),
		grpc.WithDefaultCallOptions(maxMsgRecvSize),
	}
	if !noMacaroon {

		mac := &macaroon.Macaroon{}

		if len(macBytes) == 0 && macPath != "" {
			// If its the first time, usualy the lnd admin.macaroon is stil being baked so we wait a bit
			for {
				if info, err := os.Stat(macPath); os.IsNotExist(err) || info.Size() == 0 {
					i++
					if i > maxConnAttemps {
						return nil, fmt.Errorf("We couldn't find a valid macaroon in " + macPath)
					}
					time.Sleep(1 * time.Second)
				} else {
					break
				}
			}
			if macBytes, err = ioutil.ReadFile(macPath); err != nil {
				return nil, err
			}
		}
		if len(macBytes) != 0 {
			if err = mac.UnmarshalBinary(macBytes); err != nil {
				return nil, err
			}
		} else {
			return nil, fmt.Errorf("neither macaroon path nor marshaled macaroon provided. You must provide at least one of them")
		}

		// Now we append the macaroon credentials to the dial options.
		cred := macaroons.NewMacaroonCredential(mac)
		opts = append(opts, grpc.WithPerRPCCredentials(cred))
	}
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
	grpcCon, err := grpc.Dial(host, opts...)
	if err != nil {
		return nil, err
	}

	return grpcCon, nil
}

// Whether or not all the channels of the node are in active state. Not active means the counterparty is offline
// or it is in the process of being closed.
func (d *Ldaemon) allChannelsActive(client lnrpc.LightningClient) (bool, error) {
	channels, err := client.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{})
	if err != nil {
		d.log.Error("Error in allChannelsActive() > ListChannels()",
			zap.String("err", err.Error()))
		return false, err
	}
	for _, c := range channels.Channels {
		if !c.Active {
			return false, nil
		}
	}
	return true, nil
}

// Gets a new public address from the account ID provided (LND supports multiple accounts
// under the same wallet) Default accouunt if no ID is provided. It also takes a type paraman address
// where you can specify the returned format of the address it has to be one of:
// addressType = 0 -> p2wkh: Pay to witness key hash
// addressType = 1 -> np2wkh: Pay to nested witness key hash
func (d *Ldaemon) NewAddress(account string, addressType int32) (string, error) {
	lnclient := d.APIClient()
	if lnclient == nil {
		return "", fmt.Errorf("lnclient is not ready yet")
	}

	if addr, err := lnclient.NewAddress(context.Background(),
		&lnrpc.NewAddressRequest{Type: lnrpc.AddressType(addressType),
			Account: account}); err != nil {
		d.log.Error("Error in HasActiveChannel() > ListChannels()", zap.String("err", err.Error()))
		return "", err
	} else {
		return addr.Address, nil
	}
}
