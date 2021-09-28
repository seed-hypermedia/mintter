package lightning

import (
	"context"
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
