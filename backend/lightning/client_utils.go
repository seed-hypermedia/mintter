package lightning

import (
	"context"
	"encoding/hex"
	"fmt"
	"io"

	"github.com/lightningnetwork/lnd/lnrpc"
	"github.com/lightningnetwork/lnd/lnrpc/invoicesrpc"
	"github.com/lightningnetwork/lnd/lnrpc/routerrpc"
	"go.uber.org/zap"
)

const (
	minExpirationSecsInvoice = 1
)

type AccountBalance struct {
	// The confirmed balance of the account (with >= 1 confirmations).
	ConfirmedBalance int64
	// The unconfirmed balance of the account (with 0 confirmations).
	UnconfirmedBalance int64
}

type WalletBalance struct {
	Accounts map[string]AccountBalance
}

// Adds up all the accounts of a wallet to get the total sat value
// of the wallet. You can include also the unconfirmed balance or not
func (b WalletBalance) TotalFunds(onlyConfirmed bool) int64 {
	var balance int64 = 0
	for _, b := range b.Accounts {
		balance += b.ConfirmedBalance
		if !onlyConfirmed {
			balance += b.UnconfirmedBalance
		}
	}
	return balance
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
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if addr, err := lnclient.NewAddress(ctx,
		&lnrpc.NewAddressRequest{Type: lnrpc.AddressType(addressType),
			Account: account}); err != nil {
		d.log.Error("Error in HasActiveChannel() > ListChannels()", zap.String("err", err.Error()))
		return "", err
	} else {
		return addr.Address, nil
	}
}

// Gets the balance from the account ID provided (LND supports multiple accounts
// under the same wallet). If no account is provided, this function returns all
// available accounts
func (d *Ldaemon) GetBalance(account string) (WalletBalance, error) {

	balance := make(map[string]AccountBalance)

	lnclient := d.APIClient()
	if lnclient == nil {
		return WalletBalance{Accounts: balance}, fmt.Errorf("lnclient is not ready yet")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if resp, err := lnclient.WalletBalance(ctx,
		&lnrpc.WalletBalanceRequest{}); err != nil {
		return WalletBalance{Accounts: balance}, err
	} else {
		for acc_name, m_balance := range resp.AccountBalance {
			balance[acc_name] = AccountBalance{ConfirmedBalance: (*m_balance).ConfirmedBalance,
				UnconfirmedBalance: (*m_balance).UnconfirmedBalance}
		}
		return WalletBalance{Accounts: balance}, nil
	}
}

// Estimate the fees needed to get the transactions in outputs in a block. TargetConf is the
// number of blocks that the transactions should be confirmed by. Minconfs is the minimum
// number of confirmations each one of your outputs used for the transaction must satisfy.
// SpendUnconfirmed is whether unconfirmed outputs should be used as inputs for the transaction.
func (d *Ldaemon) EstimateFees(TargetConf, MinConfs int32, SpendUnconfirmed bool,
	outputs map[string]int64) (uint64, error) {
	lnclient := d.APIClient()
	var satPerVbyte uint64 = 0
	if lnclient == nil {
		return 0, fmt.Errorf("lnclient is not ready yet")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if res, err := lnclient.EstimateFee(ctx, &lnrpc.EstimateFeeRequest{
		AddrToAmount:     outputs,
		TargetConf:       TargetConf,
		MinConfs:         MinConfs,
		SpendUnconfirmed: SpendUnconfirmed,
	}); err != nil {
		return 0, err
	} else if TargetConf > 0 {
		satPerVbyte = res.SatPerVbyte
	} else { // For zero confirmation tx, we increase the fees by 10% to make sure we are at the top of the mempool
		satPerVbyte = uint64(1.1 * float32(res.SatPerVbyte))
	}
	return satPerVbyte, nil
}

// Opens a channel to counterpartyID with a capacity of localAmt and pushig remoteAmt funds.
// All amounts are in satoshis. If inmediate flag is set, then the channel can be created
// with zero confirmations at a cost of higher fees. User can manually select the fees
// associated with the funding transaction but it could be overiden if inmediate flag is set.
// This function returns a channel point (Txid:index) the associated fees (in sats per virtual
// byte) and any error on failure. If block flag is set, this function waits until the channel
// is fully opened. It exits after pending channel otherwise
func (d *Ldaemon) OpenChannel(counterpartyID string, localAmt, remoteAmt int64,
	private, inmediate bool, satPerVbyte uint64, blocking bool) (string, error) {

	lnclient := d.APIClient()
	if lnclient == nil {
		return "", fmt.Errorf("lnclient is not ready yet")
	}

	var nodePubHex []byte
	var err error
	if nodePubHex, err = hex.DecodeString(counterpartyID); err != nil {
		return "", fmt.Errorf("lnclient is not ready yet")
	}

	var MinConfs int32 = 1   // The minimum number of confirmations each one of the outputs used for the funding transaction must satisfy.
	var TargetConf int32 = 0 // The target number of blocks that the funding transaction should be confirmed by.

	// TODO: track this PR https://github.com/lightningnetwork/lnd/pull/4424
	// as this will allow us to set a target confirmation of 0 blocks
	if inmediate {
		MinConfs = 0
		TargetConf = 1
		satPerVbyte = 0
	} else if satPerVbyte == 0 {
		TargetConf = 1
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if stream, err := lnclient.OpenChannel(ctx, &lnrpc.OpenChannelRequest{
		SatPerVbyte:        satPerVbyte,
		NodePubkey:         nodePubHex,
		LocalFundingAmount: localAmt,
		PushSat:            remoteAmt,
		TargetConf:         TargetConf,
		Private:            private,
		MinConfs:           MinConfs,
		SpendUnconfirmed:   MinConfs == 0,
	}); err != nil {
		return "", err
	} else {

		for {
			resp, err := stream.Recv()
			if err == io.EOF {
				d.log.Warn("EOF reached when reading from open channel stream")
				return "", nil
			} else if err != nil {
				return "", err
			}

			switch update := resp.Update.(type) {
			case *lnrpc.OpenStatusUpdate_ChanPending:
				if !blocking {
					channelPoint := channelIdToString(update.ChanPending.Txid) + ":" + fmt.Sprint(update.ChanPending.OutputIndex)
					d.log.Info("Init channel opening process", zap.String("ChannelPoint", channelPoint))
					return channelPoint, nil
				}

			case *lnrpc.OpenStatusUpdate_ChanOpen:
				channelPoint := update.ChanOpen.ChannelPoint.GetFundingTxidStr() + ":" + fmt.Sprint(update.ChanOpen.ChannelPoint.GetOutputIndex())
				d.log.Info("Init channel succeded", zap.String("ChannelPoint", channelPoint))
				return channelPoint, nil
			}
		}
	}
}

// List all the channels this node has with the provided peer. If no peer
// is provided then all channels with all peers are returned. Channels can
// be active or inactive and can be public or private. This function returns
// an array containing an iformation struct for each channel matching the
// peer Id provided.
func (d *Ldaemon) ListChannels(peer string) ([]*lnrpc.Channel, error) {

	lnclient := d.APIClient()
	if lnclient == nil {
		return nil, fmt.Errorf("lnclient is not ready yet")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	peerID := []byte{}
	var err error

	if peer != "" {
		if peerID, err = hex.DecodeString(peer); err != nil {
			return nil, fmt.Errorf("Couln't convert peerID string to byte array" + err.Error())
		}
	}
	if res, err := lnclient.ListChannels(ctx, &lnrpc.ListChannelsRequest{Peer: peerID}); err != nil {
		return nil, err
	} else {
		return res.Channels, nil
	}
}

// Generates an invoice to be paid with amount in millisatoshis. The invoice is constructed
// from the preimage indicated, and it accepts a memo so the payer knows what it this invoice
// for. This invoice  expires in expirySeconds, after that it cannot be paid. If for some reason
// there is a non cooperative node involved in the HTLC transmission of the payment of this invoice
// the funds can be recovered in the fallback addres, if provided. Internal wallet addres used otherwise
// If private flag is set, then hop hints (private channels) will be advertised to reach this node.
func (d *Ldaemon) GenerateInvoice(amountMSat int64, preimage []byte, memo string,
	expirySeconds int64, fallbackAddr string, private bool) (string, error) {
	lnclient := d.APIClient()
	if lnclient == nil {
		return "", fmt.Errorf("lnclient is not ready yet")
	}

	if expirySeconds < minExpirationSecsInvoice {
		expirySeconds = minExpirationSecsInvoice
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if res, err := lnclient.AddInvoice(ctx, &lnrpc.Invoice{
		Memo:         memo,
		RPreimage:    preimage,
		ValueMsat:    amountMSat,
		Expiry:       expirySeconds,
		FallbackAddr: fallbackAddr,
		Private:      private,
		IsAmp:        false,
	}); err != nil {
		return "", err
	} else {
		return res.PaymentRequest, nil
	}
}

// Generates an invoice to be paid with amount in millisatoshis. The invoice is constructed
// without the preimage information, so only the hash is known (The preimage has to be
// revelaed at settlement time). like regular invoices, it accepts a memo so the payer knows
// what it this invoice for. This invoice  expires in expirySeconds, after that it cannot
// be paid. If there is a non cooperative node involved in the HTLC transmission of the
// payment of this invoice the funds can be recovered in the fallback addres, if provided.
// Internal wallet addres used otherwise If private flag is set, then hop hints
// (private channels) will be advertised to reach this node
func (d *Ldaemon) GenerateHoldInvoice(amountMSat int64, preimageHash []byte, memo string,
	expirySeconds int64, fallbackAddr string, private bool) (string, error) {
	lnclient := d.InvoicesClient()
	if lnclient == nil {
		return "", fmt.Errorf("lnclient is not ready yet")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if res, err := lnclient.AddHoldInvoice(ctx, &invoicesrpc.AddHoldInvoiceRequest{
		Memo:         memo,
		Hash:         preimageHash,
		ValueMsat:    amountMSat,
		Expiry:       expirySeconds,
		FallbackAddr: fallbackAddr,
		Private:      private,
	}); err != nil {
		return "", err
	} else {
		return res.PaymentRequest, nil
	}
}

// Pays amtMsat millisatoshis to the invoice represented by paymentRequest. It uses the
// OutgoingChanId channel to forward the HTLC, if provided. User can set fee limits to
// the payment by either setting an absolute millisatoshis value or a percentage value
// of the total amount (1-100%) if both are set, the most restrictive will be taken.
// User can specify a pubkey to be used as a last hop of the HTLC transmission.
// This function blocks until either the payment success or timeout in seconds is reached
// On success, it returns the preimage of the payment hash
func (d *Ldaemon) PayInvoice(paymentRequest string, OutgoingChanId uint64, amtMsat int64,
	fee_limit_msat int64, fee_limit_percent int64, lastHopPubkey string, timeout int32) (string, error) {
	routerClient := d.RouterClient()
	if routerClient == nil {
		return "", fmt.Errorf("routerClient is not ready yet")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var feeLimit int64
	totPercentFee := amtMsat * fee_limit_percent / 100
	if totPercentFee >= fee_limit_msat {
		feeLimit = fee_limit_msat
	} else {
		feeLimit = fee_limit_percent
	}

	var lastHop []byte
	var err error
	if lastHopPubkey != "" {
		if lastHop, err = hex.DecodeString(lastHopPubkey); err != nil {
			return "", fmt.Errorf("Couln't convert peerID string to byte array" + err.Error())
		}
	}
	if stream, err := routerClient.SendPaymentV2(ctx, &routerrpc.SendPaymentRequest{
		AmtMsat:          amtMsat,
		PaymentRequest:   paymentRequest,
		FeeLimitMsat:     feeLimit,
		OutgoingChanId:   OutgoingChanId,
		AllowSelfPayment: true,
		LastHopPubkey:    lastHop,
		TimeoutSeconds:   timeout,
	}); err != nil {
		return "", err
	} else {
		for {
			payment, err := stream.Recv()
			if err != nil {
				return "", err
			}
			// Terminate loop if payments state is final.
			if payment.Status != lnrpc.Payment_IN_FLIGHT {
				if payment.Status != lnrpc.Payment_SUCCEEDED {
					return "", fmt.Errorf("Payment didn't succed. Reason: " +
						lnrpc.PaymentFailureReason_name[int32(payment.FailureReason)])
				} else {
					return payment.PaymentPreimage, nil
				}

			}
		}
	}

}

// TODO: Track this PR: https://github.com/lightningnetwork/lnd/pull/5346
// When it is merged, we can implement direct messaging
func (d *Ldaemon) SendDirectMessage(peerID string, message string) error {
	lnclient := d.APIClient()
	if lnclient == nil {
		return fmt.Errorf("lnclient is not ready yet")
	}
	_, cancel := context.WithCancel(context.Background())
	defer cancel()

	return nil
}

// This function takes a byte array, swaps it and encodes the hex representation in a string
func channelIdToString(hash []byte) string {
	HashSize := len(hash)
	for i := 0; i < HashSize/2; i++ {
		hash[i], hash[HashSize-1-i] = hash[HashSize-1-i], hash[i]
	}
	return hex.EncodeToString(hash[:])
}
