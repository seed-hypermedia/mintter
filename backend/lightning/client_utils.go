package lightning

import (
	"context"
	"encoding/hex"
	"fmt"

	"github.com/lightningnetwork/lnd/lnrpc"
	"go.uber.org/zap"
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

	if addr, err := lnclient.NewAddress(context.Background(),
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

	if resp, err := lnclient.WalletBalance(context.Background(),
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

	if res, err := lnclient.EstimateFee(context.Background(), &lnrpc.EstimateFeeRequest{
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
// byte) and any error on failure
func (d *Ldaemon) OpenChannel(counterpartyID string, localAmt, remoteAmt int64,
	private, inmediate bool, satPerVbyte uint64) (string, uint64, error) {

	lnclient := d.APIClient()
	if lnclient == nil {
		return "", 0, fmt.Errorf("lnclient is not ready yet")
	}
	var MinConfs int32 = 1   // The minimum number of confirmations each one of the outputs used for the funding transaction must satisfy.
	var TargetConf int32 = 0 // The target number of blocks that the funding transaction should be confirmed by.
	outputs := make(map[string]int64)
	outputs[counterpartyID] = localAmt

	if inmediate {
		MinConfs = 0
		TargetConf = 1
		satPerVbyte = 0
	} else if satPerVbyte == 0 {
		TargetConf = 1
	}

	if res, err := lnclient.OpenChannelSync(context.Background(), &lnrpc.OpenChannelRequest{
		SatPerVbyte:        satPerVbyte,
		NodePubkeyString:   counterpartyID,
		LocalFundingAmount: localAmt,
		PushSat:            remoteAmt,
		TargetConf:         TargetConf,
		Private:            private,
		MinConfs:           MinConfs,
		SpendUnconfirmed:   MinConfs == 0,
	}); err != nil {
		return "", 0, err
	} else {
		channelPoint := channelIdToString(res.GetFundingTxidBytes()) + ":" + fmt.Sprint(res.OutputIndex)
		d.log.Info("Init channel opening process", zap.String("ChannelPoint", channelPoint))

		return channelPoint, satPerVbyte, nil
	}
}

func channelIdToString(hash []byte) string {
	HashSize := len(hash)
	for i := 0; i < HashSize/2; i++ {
		hash[i], hash[HashSize-1-i] = hash[HashSize-1-i], hash[i]
	}
	return hex.EncodeToString(hash[:])
}
