package lightning

import (
	"context"
	"io"
	"time"

	"github.com/lightningnetwork/lnd/lnrpc"
	"github.com/lightningnetwork/lnd/lnrpc/chainrpc"
	"github.com/lightningnetwork/lnd/lnrpc/invoicesrpc"
	"github.com/lightningnetwork/lnd/lnrpc/routerrpc"
	"github.com/lightningnetwork/lnd/lnrpc/signrpc"
	"github.com/lightningnetwork/lnd/lnrpc/walletrpc"
	"github.com/lightningnetwork/lnd/lnwire"
	"github.com/lightningnetwork/lnd/subscribe"
	"go.uber.org/zap"
)

var (
	acceptorCallback = func(req *lnrpc.ChannelAcceptRequest) bool { return true }
)

// DaemonReadyEvent is sent when the daemon is ready for RPC requests
type DaemonReadyEvent struct {
	IdentityPubkey string
}

// DaemonDownEvent is sent when the daemon stops
type DaemonDownEvent struct {
	err error
}

// ChannelEvent is sent whenever a channel is created/closed or active/inactive.
type ChannelEvent struct {
	*lnrpc.ChannelEventUpdate
}

// PeerEvent is sent whenever a peer is connected/disconnected.
type PeerEvent struct {
	*lnrpc.PeerEvent
}

// TransactionEvent is sent when a new transaction is received.
type TransactionEvent struct {
	*lnrpc.Transaction
}

// InvoiceEvent is sent when a new invoice is created/settled.
type InvoiceEvent struct {
	*lnrpc.Invoice
}

// ChainSyncedEvent is sent when the chain gets into synced state.
type ChainSyncedEvent struct{}

// ResumeEvent is sent when the app resumes.
type ResumeEvent struct{}

// BackupNeededEvent is sent when the node signals backup is needed.
type BackupNeededEvent struct{}

// RoutingNodeChannelOpened is sent when a channel with the routing
// node is opened.
type RoutingNodeChannelOpened struct{}

// SubscribeEvents subscribe to various application events
func (d *Ldaemon) SubscribeEvents() (*subscribe.Client, error) {
	return d.ntfnServer.Subscribe()
}

// If no marshaled macaroon is provided, we tried to use the local macaroon
// stored in workinng_dir/data/chain/bitcoin/network/ if stateless init is set
// it won't probably find any though
func (d *Ldaemon) startRpcClients(macBytes []byte) error {
	var err error

	grpcCon, err := newLightningClient(false, macBytes, d.cfg.LndDir+"/data/chain/bitcoin/"+d.cfg.Network+
		"/"+defaultMacaroonFilename, d.cfg.LndDir+"/"+defaultTLSCertFilename, d.cfg.RawRPCListeners[0])
	if err != nil {
		return err
	}

	d.Lock()
	d.unlockerClient = lnrpc.NewWalletUnlockerClient(grpcCon)
	d.lightningClient = lnrpc.NewLightningClient(grpcCon)
	d.routerClient = routerrpc.NewRouterClient(grpcCon)
	d.walletKitClient = walletrpc.NewWalletKitClient(grpcCon)
	d.chainNotifierClient = chainrpc.NewChainNotifierClient(grpcCon)
	d.signerClient = signrpc.NewSignerClient(grpcCon)
	d.invoicesClient = invoicesrpc.NewInvoicesClient(grpcCon)
	d.Unlock()

	return nil
}

// This function asynchronously subscribe to important events such as channels updates, peer updates, transactions updates,
// invoices updates, chain synchronization updates and channel acceptor updates
func (d *Ldaemon) startSubscriptions() error {
	var i = 0
	//We need time for the LND to complete init once the rest of the servers (except from the unlocker) to be up and running
loop:
	for {
		time.Sleep(waitSecondsPerAttempt * time.Second)
		info, chainErr := d.lightningClient.GetInfo(context.Background(), &lnrpc.GetInfoRequest{})
		if chainErr != nil {
			select {
			case <-d.quitChan: // Early exit on shutdown
				return chainErr
			default:
				//A common error is "server still waking up"
				i++
				if i < maxConnAttemps {
					continue loop
				}
				d.log.Warn("Failed get chain info:", zap.String("wrn", chainErr.Error()))
				return chainErr
			}
		}
		d.Lock()
		d.nodeID = info.IdentityPubkey
		d.Unlock()
		break loop
	}

	//Once the general info server returns, we consider it to be safe to start connecting to other servers
	ctx, cancel := context.WithCancel(context.Background())

	d.wg.Add(6)
	go d.subscribeChannels(ctx, d.lightningClient)
	go d.subscribePeers(ctx, d.lightningClient)
	go d.subscribeTransactions(ctx)
	go d.subscribeInvoices(ctx)
	go d.subscribeChannelAcceptor(ctx, d.lightningClient)
	go d.syncToChain(ctx)

	// cancel subscriptions on quit
	go func() {
		<-d.quitChan
		cancel()
	}()

	if err := d.ntfnServer.SendUpdate(DaemonReadyEvent{IdentityPubkey: d.nodeID}); err != nil {
		return err
	}
	d.log.Info("Daemon ready! subscriptions started")
	return nil
}

// By subscribing to this, every time someone wants to open a channel with us, we get called. In this call
// we decide wether we accept the incoming channel or not. The function that decides can be set calling
// SetAcceptorCallback function. The default is allowing all connections
func (d *Ldaemon) subscribeChannelAcceptor(ctx context.Context, client lnrpc.LightningClient) error {
	defer d.wg.Done()

	channelAcceptorClient, err := client.ChannelAcceptor(ctx)
	if err != nil {
		d.log.Error("Failed to get a channel acceptor", zap.String("err", err.Error()))
		return err
	}
	for {
		request, err := channelAcceptorClient.Recv()
		if err == io.EOF || ctx.Err() == context.Canceled {
			d.log.Warn("channelAcceptorClient cancelled, shutting down", zap.String("err", err.Error()))
			return nil
		} else if err != nil {
			d.log.Error("Unexpected error in channelAcceptor subscriptions", zap.String("err", err.Error()))
			return err
		}

		if err != nil {
			d.log.Error("channelAcceptorClient failed to get notification", zap.String("err", err.Error()))
			// in case of unexpected error, we will wait a bit so we won't get
			// into infinite loop.
			time.Sleep(2 * time.Second)
			continue
		}
		private := request.ChannelFlags&uint32(lnwire.FFAnnounceChannel) == 0
		accepted := acceptorCallback(request)

		err = channelAcceptorClient.Send(&lnrpc.ChannelAcceptResponse{
			PendingChanId: request.PendingChanId,
			Accept:        accepted,
		})
		if err != nil {
			d.log.Error("Error in channelAcceptorClient.Send", zap.String("PendingChanId", string(request.PendingChanId)),
				zap.Bool("private", private), zap.String("err", err.Error()))
			return err
		}
		d.log.Info("channel creation requested", zap.String("counterparty ID", string(request.NodePubkey)),
			zap.Bool("private", private), zap.Uint64("amount", request.FundingAmt),
			zap.Uint64("push_amount", request.PushAmt), zap.Uint64("fee_per_kw", request.FeePerKw),
			zap.Uint64("min_htlc", request.MinHtlc), zap.Bool("accepted", accepted))
	}
}

func (d *Ldaemon) subscribePeers(ctx context.Context, client lnrpc.LightningClient) error {
	defer d.wg.Done()

	subscription, err := client.SubscribePeerEvents(ctx, &lnrpc.PeerEventSubscription{})
	if err != nil {
		d.log.Error("Failed to subscribe peers", zap.String("err", err.Error()))
		return err
	}

	d.log.Info("Peers subscription created")
	for {
		notification, err := subscription.Recv()
		if err == io.EOF || ctx.Err() == context.Canceled {
			d.log.Warn("subscribePeers cancelled, shutting down", zap.String("err", err.Error()))
			return nil
		} else if err != nil {
			d.log.Error("Unexpected error in peers subscriptions", zap.String("err", err.Error()))
			return err
		}

		d.log.Info("Peer event received", zap.String("type", notification.GetType().String()),
			zap.String("peerID", notification.PubKey))
		if err != nil {
			d.log.Error("Subscribe peers Failed to get notification", zap.String("err", err.Error()))
			// in case of unexpected error, we will wait a bit so we won't get
			// into infinite loop.
			time.Sleep(2 * time.Second)
			continue
		}

		d.ntfnServer.SendUpdate(PeerEvent{notification})
	}
}

func (d *Ldaemon) subscribeChannels(ctx context.Context, client lnrpc.LightningClient) error {
	defer d.wg.Done()

	subscription, err := client.SubscribeChannelEvents(ctx, &lnrpc.ChannelEventSubscription{})
	if err != nil {
		d.log.Error("Failed to subscribe channels", zap.String("err", err.Error()))
		return err
	}

	d.log.Info("Channels subscription created")
	for {
		notification, err := subscription.Recv()
		if err == io.EOF || ctx.Err() == context.Canceled {
			d.log.Warn("subscribeChannels cancelled, shutting down", zap.String("err", err.Error()))
			return nil
		} else if err != nil {
			d.log.Error("Unexpected error in channel subscriptions", zap.String("err", err.Error()))
			return err
		}
		d.log.Info("Channel event received", zap.String("type", string(notification.Type)))
		if err != nil {
			d.log.Error("subscribe channels Failed to get notification", zap.String("err", err.Error()))
			// in case of unexpected error, we will wait a bit so we won't get
			// into infinite loop.
			time.Sleep(2 * time.Second)
			continue
		}

		d.ntfnServer.SendUpdate(ChannelEvent{notification})
	}
}

func (d *Ldaemon) subscribeTransactions(ctx context.Context) error {
	defer d.wg.Done()

	stream, err := d.lightningClient.SubscribeTransactions(ctx, &lnrpc.GetTransactionsRequest{})
	if err != nil {
		d.log.Error("Failed to call SubscribeTransactions", zap.String("err", err.Error()))
		return err
	}

	d.log.Info("Wallet transactions subscription created")
	for {
		notification, err := stream.Recv()
		if err == io.EOF || ctx.Err() == context.Canceled {
			d.log.Warn("subscribeTransactions cancelled, shutting down", zap.String("err", err.Error()))
			return nil
		} else if err != nil {
			d.log.Error("Unexpected error in transactions subscriptions", zap.String("err", err.Error()))
			return err
		}
		d.log.Info("SubscribeTransactions received new transaction")
		if err != nil {
			d.log.Error("Failed to receive a transaction", zap.String("err", err.Error()))
			// in case of unexpected error, we will wait a bit so we won't get
			// into infinite loop.
			time.Sleep(2 * time.Second)
		}
		d.log.Info("watchOnChainState sending account change notification")
		d.ntfnServer.SendUpdate(TransactionEvent{notification})
	}
}

func (d *Ldaemon) subscribeInvoices(ctx context.Context) error {
	defer d.wg.Done()

	stream, err := d.lightningClient.SubscribeInvoices(ctx, &lnrpc.InvoiceSubscription{})
	if err != nil {
		d.log.Error("Failed to call SubscribeInvoices", zap.String("err", err.Error()))
		return err
	}

	d.log.Info("Invoices subscription created")
	for {
		invoice, err := stream.Recv()
		if err == io.EOF || ctx.Err() == context.Canceled {
			d.log.Warn("subscribeInvoices cancelled, shutting down", zap.String("err", err.Error()))
			return nil
		} else if err != nil {
			d.log.Error("Unexpected error in invoices subscriptions", zap.String("err", err.Error()))
			return err
		}
		if err != nil {
			d.log.Error("subscribeInvoices cancelled, shutting down", zap.String("err", err.Error()))
			return err
		}
		d.log.Info("watchPayments - Invoice received by subscription")
		d.ntfnServer.SendUpdate(InvoiceEvent{invoice})
	}
}

func (d *Ldaemon) syncToChain(ctx context.Context) error {
	defer d.wg.Done()
	for {
		chainInfo, chainErr := d.lightningClient.GetInfo(ctx, &lnrpc.GetInfoRequest{})
		if ctx.Err() == context.Canceled {
			d.log.Warn("syncToChain cancelled, shutting down")
			return nil
		} else if chainErr != nil {
			d.log.Warn("Failed get chain info", zap.String("err", chainErr.Error()))
			return chainErr
		}

		d.log.Info("Sync to chain interval", zap.Bool("Synced", chainInfo.SyncedToChain),
			zap.Uint32("BlockHeight", chainInfo.BlockHeight))

		if chainInfo.SyncedToChain {
			d.log.Info("Synchronized to chain finshed", zap.Uint32("BlockHeight", chainInfo.BlockHeight))
			break
		}
		time.Sleep(time.Second * 5)
	}
	d.ntfnServer.SendUpdate(ChainSyncedEvent{})
	return nil
}
