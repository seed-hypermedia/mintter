package lndclient

import (
	"bytes"
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/wire"
	"github.com/btcsuite/btcutil"
	"github.com/lightningnetwork/lnd/channeldb"
	"github.com/lightningnetwork/lnd/lnrpc"
	"github.com/lightningnetwork/lnd/lnrpc/invoicesrpc"
	"github.com/lightningnetwork/lnd/lntypes"
	"github.com/lightningnetwork/lnd/lnwallet/chainfee"
	"github.com/lightningnetwork/lnd/lnwire"
	"github.com/lightningnetwork/lnd/routing/route"
	"github.com/lightningnetwork/lnd/zpay32"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// LightningClient exposes base lightning functionality.
type LightningClient interface {
	PayInvoice(ctx context.Context, invoice string,
		maxFee btcutil.Amount,
		outgoingChannel *uint64) chan PaymentResult

	GetInfo(ctx context.Context) (*Info, error)

	EstimateFeeToP2WSH(ctx context.Context, amt btcutil.Amount,
		confTarget int32) (btcutil.Amount, error)

	// WalletBalance returns a summary of the node's wallet balance.
	WalletBalance(ctx context.Context) (*WalletBalance, error)

	AddInvoice(ctx context.Context, in *invoicesrpc.AddInvoiceData) (
		lntypes.Hash, string, error)

	// LookupInvoice looks up an invoice by hash.
	LookupInvoice(ctx context.Context, hash lntypes.Hash) (*Invoice, error)

	// ListTransactions returns all known transactions of the backing lnd
	// node. It takes a start and end block height which can be used to
	// limit the block range that we query over. These values can be left
	// as zero to include all blocks. To include unconfirmed transactions
	// in the query, endHeight must be set to -1.
	ListTransactions(ctx context.Context, startHeight,
		endHeight int32) ([]Transaction, error)

	// ListChannels retrieves all channels of the backing lnd node.
	ListChannels(ctx context.Context) ([]ChannelInfo, error)

	// PendingChannels returns a list of lnd's pending channels.
	PendingChannels(ctx context.Context) (*PendingChannels, error)

	// ClosedChannels returns all closed channels of the backing lnd node.
	ClosedChannels(ctx context.Context) ([]ClosedChannel, error)

	// ForwardingHistory makes a paginated call to our forwarding history
	// endpoint.
	ForwardingHistory(ctx context.Context,
		req ForwardingHistoryRequest) (*ForwardingHistoryResponse, error)

	// ListInvoices makes a paginated call to our list invoices endpoint.
	ListInvoices(ctx context.Context, req ListInvoicesRequest) (
		*ListInvoicesResponse, error)

	// ListPayments makes a paginated call to our list payments endpoint.
	ListPayments(ctx context.Context,
		req ListPaymentsRequest) (*ListPaymentsResponse, error)

	// ChannelBackup retrieves the backup for a particular channel. The
	// backup is returned as an encrypted chanbackup.Single payload.
	ChannelBackup(context.Context, wire.OutPoint) ([]byte, error)

	// ChannelBackups retrieves backups for all existing pending open and
	// open channels. The backups are returned as an encrypted
	// chanbackup.Multi payload.
	ChannelBackups(ctx context.Context) ([]byte, error)

	// SubscribeChannelBackups allows a client to subscribe to the
	// most up to date information concerning the state of all channel
	// backups.
	SubscribeChannelBackups(ctx context.Context) (
		<-chan lnrpc.ChanBackupSnapshot, <-chan error, error)

	// SubscribeChannelEvents allows a client to subscribe to updates
	// relevant to the state of channels. Events include new active
	// channels, inactive channels, and closed channels.
	SubscribeChannelEvents(ctx context.Context) (
		<-chan *ChannelEventUpdate, <-chan error, error)

	// DecodePaymentRequest decodes a payment request.
	DecodePaymentRequest(ctx context.Context,
		payReq string) (*PaymentRequest, error)

	// OpenChannel opens a channel to the peer provided with the amounts
	// specified.
	OpenChannel(ctx context.Context, peer route.Vertex,
		localSat, pushSat btcutil.Amount, private bool) (
		*wire.OutPoint, error)

	// CloseChannel closes the channel provided.
	CloseChannel(ctx context.Context, channel *wire.OutPoint,
		force bool, confTarget int32, deliveryAddr btcutil.Address) (
		chan CloseChannelUpdate, chan error, error)

	// UpdateChanPolicy updates the channel policy for the passed chanPoint.
	// If the chanPoint is nil, then the policy is applied for all existing
	// channels.
	UpdateChanPolicy(ctx context.Context, req PolicyUpdateRequest,
		chanPoint *wire.OutPoint) error

	// GetChanInfo returns the channel info for the passed channel,
	// including the routing policy for both end.
	GetChanInfo(ctx context.Context, chanID uint64) (*ChannelEdge, error)

	// ListPeers gets a list the peers we are currently connected to.
	ListPeers(ctx context.Context) ([]Peer, error)

	// Connect attempts to connect to a peer at the host specified. If
	// permanent is true then we'll attempt to connect to the peer
	// permanently, meaning that the connection is maintained even if no
	// channels exist between us and the peer.
	Connect(ctx context.Context, peer route.Vertex, host string,
		permanent bool) error

	// SendCoins sends the passed amount of (or all) coins to the passed
	// address. Either amount or sendAll must be specified, while
	// confTarget, satsPerByte are optional and may be set to zero in which
	// case automatic conf target and fee will be used. Returns the tx id
	// upon success.
	SendCoins(ctx context.Context, addr btcutil.Address,
		amount btcutil.Amount, sendAll bool, confTarget int32,
		satsPerByte int64, label string) (string, error)

	// ChannelBalance returns a summary of our channel balances.
	ChannelBalance(ctx context.Context) (*ChannelBalance, error)

	// GetNodeInfo looks up information for a specific node.
	GetNodeInfo(ctx context.Context, pubkey route.Vertex,
		includeChannels bool) (*NodeInfo, error)

	// DescribeGraph returns our view of the graph.
	DescribeGraph(ctx context.Context, includeUnannounced bool) (*Graph, error)

	// SubscribeGraph allows a client to subscribe to gaph topology updates.
	SubscribeGraph(ctx context.Context) (<-chan *GraphTopologyUpdate,
		<-chan error, error)

	// NetworkInfo returns stats regarding our view of the network.
	NetworkInfo(ctx context.Context) (*NetworkInfo, error)

	// SubscribeInvoices allows a client to subscribe to updates
	// of newly added/settled invoices.
	SubscribeInvoices(ctx context.Context, req InvoiceSubscriptionRequest) (
		<-chan *Invoice, <-chan error, error)

	// ListPermissions returns a list of all RPC method URIs and the
	// macaroon permissions that are required to access them.
	ListPermissions(ctx context.Context) (map[string][]MacaroonPermission,
		error)

	// ChannelAcceptor create a channel acceptor using the accept function
	// passed in. The timeout provided will be used to timeout the passed
	// accept closure when it exceeds the amount of time we allow. Note that
	// this amount should be strictly less than lnd's chanacceptor timeout
	// parameter.
	ChannelAcceptor(ctx context.Context, timeout time.Duration,
		accept AcceptorFunction) (chan error, error)

	// QueryRoutes can query LND to return a route (with fees) between two
	// vertices.
	QueryRoutes(ctx context.Context, req QueryRoutesRequest) (
		*QueryRoutesResponse, error)
}

// Info contains info about the connected lnd node.
type Info struct {
	// Version is the version that lnd is running.
	Version string

	// BlockHeight is the best block height that lnd has knowledge of.
	BlockHeight uint32

	// IdentityPubkey is our node's pubkey.
	IdentityPubkey [33]byte

	// Alias is our node's alias.
	Alias string

	// Network is the network we are currently operating on.
	Network string

	// Uris is the set of our node's advertised uris.
	Uris []string

	// SyncedToChain is true if the wallet's view is synced to the main
	// chain.
	SyncedToChain bool

	// SyncedToGraph is true if we consider ourselves to be synced with the
	// public channel graph.
	SyncedToGraph bool

	// BestHeaderTimeStamp is the best block timestamp known to the wallet.
	BestHeaderTimeStamp time.Time

	// ActiveChannels is the number of active channels we have.
	ActiveChannels uint32

	// InactiveChannels is the number of inactive channels we have.
	InactiveChannels uint32

	// PendingChannels is the number of pending channels we have.
	PendingChannels uint32
}

// ChannelInfo stores unpacked per-channel info.
type ChannelInfo struct {
	// ChannelPoint is the funding outpoint of the channel.
	ChannelPoint string

	// Active indicates whether the channel is active.
	Active bool

	// ChannelID holds the unique channel ID for the channel. The first 3 bytes
	// are the block height, the next 3 the index within the block, and the last
	// 2 bytes are the /output index for the channel.
	ChannelID uint64

	// PubKeyBytes is the raw bytes of the public key of the remote node.
	PubKeyBytes route.Vertex

	// Capacity is the total amount of funds held in this channel.
	Capacity btcutil.Amount

	// LocalBalance is the current balance of this node in this channel.
	LocalBalance btcutil.Amount

	// RemoteBalance is the counterparty's current balance in this channel.
	RemoteBalance btcutil.Amount

	// UnsettledBalance is the total amount on this channel that is
	// unsettled.
	UnsettledBalance btcutil.Amount

	// Initiator indicates whether we opened the channel or not.
	Initiator bool

	// Private indicates that the channel is private.
	Private bool

	// LifeTime is the total amount of time we have monitored the peer's
	// online status for.
	LifeTime time.Duration

	// Uptime is the total amount of time the peer has been observed as
	// online over its lifetime.
	Uptime time.Duration

	// TotalSent is the total amount sent over this channel for our own
	// payments.
	TotalSent btcutil.Amount

	// TotalReceived is the total amount received over this channel for our
	// own receipts.
	TotalReceived btcutil.Amount

	// NumUpdates is the number of updates we have had on this channel.
	NumUpdates uint64

	// NumPendingHtlcs is the count of pending htlcs on this channel.
	NumPendingHtlcs int

	// PendingHtlcs stores the pending HTLCs (amount and direction).
	PendingHtlcs []PendingHtlc

	// CSVDelay is the csv delay for our funds.
	CSVDelay uint64

	// FeePerKw is the current fee per kweight of the commit fee.
	FeePerKw chainfee.SatPerKWeight

	// CommitWeight is the weight of the commit.
	CommitWeight int64

	// CommitFee is the current commitment's fee.
	CommitFee btcutil.Amount

	// LocalConstraints is the set of constraints for the local node.
	LocalConstraints *ChannelConstraints

	// RemoteConstraints is the set of constraints for the remote node.
	RemoteConstraints *ChannelConstraints
}

func newChannelInfo(channel *lnrpc.Channel) (*ChannelInfo, error) {
	remoteVertex, err := route.NewVertexFromStr(channel.RemotePubkey)
	if err != nil {
		return nil, err
	}

	chanInfo := &ChannelInfo{
		ChannelPoint:     channel.ChannelPoint,
		Active:           channel.Active,
		ChannelID:        channel.ChanId,
		PubKeyBytes:      remoteVertex,
		Capacity:         btcutil.Amount(channel.Capacity),
		LocalBalance:     btcutil.Amount(channel.LocalBalance),
		RemoteBalance:    btcutil.Amount(channel.RemoteBalance),
		UnsettledBalance: btcutil.Amount(channel.UnsettledBalance),
		Initiator:        channel.Initiator,
		Private:          channel.Private,
		NumPendingHtlcs:  len(channel.PendingHtlcs),
		TotalSent:        btcutil.Amount(channel.TotalSatoshisSent),
		TotalReceived:    btcutil.Amount(channel.TotalSatoshisReceived),
		NumUpdates:       channel.NumUpdates,
		FeePerKw:         chainfee.SatPerKWeight(channel.FeePerKw),
		CommitWeight:     channel.CommitWeight,
		CommitFee:        btcutil.Amount(channel.CommitFee),
		LifeTime: time.Second * time.Duration(
			channel.Lifetime,
		),
		Uptime: time.Second * time.Duration(
			channel.Uptime,
		),
		LocalConstraints: newChannelConstraint(
			channel.LocalConstraints,
		),
		RemoteConstraints: newChannelConstraint(
			channel.RemoteConstraints,
		),
	}

	chanInfo.PendingHtlcs = make([]PendingHtlc, len(channel.PendingHtlcs))
	for i, htlc := range channel.PendingHtlcs {
		chanInfo.PendingHtlcs[i] = PendingHtlc{
			Incoming: htlc.Incoming,
			Amount:   btcutil.Amount(htlc.Amount),
		}
	}

	return chanInfo, nil
}

// ChannelConstraints contains information about the restraints place on a
// channel commit for a particular node.
type ChannelConstraints struct {
	// CsvDelay is the relative CSV delay expressed in blocks.
	CsvDelay uint32

	// Reserve is the minimum balance that the node must maintain.
	Reserve btcutil.Amount

	// DustLimit is the dust limit for the channel commitment.
	DustLimit btcutil.Amount

	// MaxPendingAmt is the maximum amount that may be pending on the
	// channel.
	MaxPendingAmt lnwire.MilliSatoshi

	// MinHtlc is the minimum htlc size that will be accepted on the
	// channel.
	MinHtlc lnwire.MilliSatoshi

	// MaxAcceptedHtlcs is the maximum number of htlcs that the node will
	// accept from its peer.
	MaxAcceptedHtlcs uint32
}

// newChannelConstraint creates a channel constraints struct from the rpc
// response.
func newChannelConstraint(cc *lnrpc.ChannelConstraints) *ChannelConstraints {
	if cc == nil {
		return nil
	}

	return &ChannelConstraints{
		CsvDelay:         cc.CsvDelay,
		Reserve:          btcutil.Amount(cc.ChanReserveSat),
		DustLimit:        btcutil.Amount(cc.DustLimitSat),
		MaxPendingAmt:    lnwire.MilliSatoshi(cc.MaxPendingAmtMsat),
		MinHtlc:          lnwire.MilliSatoshi(cc.MinHtlcMsat),
		MaxAcceptedHtlcs: cc.MaxAcceptedHtlcs,
	}
}

// ChannelUpdateType encodes the type of update for a channel update event.
type ChannelUpdateType uint8

const (
	// PendingOpenChannelUpdate indicates that the channel event holds
	// information about a recently opened channel still in pending state.
	PendingOpenChannelUpdate ChannelUpdateType = iota

	// OpenChannelUpdate indicates that the channel event holds information
	// about a channel that has been opened.
	OpenChannelUpdate

	// ClosedChannelUpdate indicates that the channel event holds
	// information about a closed channel.
	ClosedChannelUpdate

	// ActiveChannelUpdate indicates that the channel event holds
	// information about a channel that became active.
	ActiveChannelUpdate

	// InactiveChannelUpdate indicates that the channel event holds
	// information about a channel that became inactive.
	InactiveChannelUpdate
)

// ChannelEventUpdate holds the data fields and type for a particular channel
// update event.
type ChannelEventUpdate struct {
	// UpdateType encodes the update type. Depending on the type other
	// members may be nil.
	UpdateType ChannelUpdateType

	// ChannelPoints holds the channel point for the updated channel.
	ChannelPoint *wire.OutPoint

	// OpenedChannelInfo holds the channel info for a newly opened channel.
	OpenedChannelInfo *ChannelInfo

	// ClosedChannelInfo holds the channel info for a newly closed channel.
	ClosedChannelInfo *ClosedChannel
}

// ClosedChannel represents a channel that has been closed.
type ClosedChannel struct {
	// ChannelPoint is the funding outpoint of the channel.
	ChannelPoint string

	// ChannelID holds the unique channel ID for the channel. The first 3
	// bytes are the block height, the next 3 the index within the block,
	// and the last 2 bytes are the output index for the channel.
	ChannelID uint64

	// ClosingTxHash is the tx hash of the close transaction for the channel.
	ClosingTxHash string

	// CloseType is the type of channel closure.
	CloseType CloseType

	// CloseHeight is the height that the channel was closed at.
	CloseHeight uint32

	// OpenInitiator is true if we opened the channel. This value is not
	// always available (older channels do not have it).
	OpenInitiator Initiator

	// Initiator indicates which party initiated the channel close. Since
	// this value is not always set in the rpc response, we also make a best
	// effort attempt to set it based on CloseType.
	CloseInitiator Initiator

	// PubKeyBytes is the raw bytes of the public key of the remote node.
	PubKeyBytes route.Vertex

	// Capacity is the total amount of funds held in this channel.
	Capacity btcutil.Amount

	// SettledBalance is the amount we were paid out directly in this
	// channel close. Note that this does not include cases where we need to
	// sweep our commitment or htlcs.
	SettledBalance btcutil.Amount
}

// CloseType is an enum which represents the types of closes our channels may
// have. This type maps to the rpc value.
type CloseType uint8

const (
	// CloseTypeCooperative represents cooperative closes.
	CloseTypeCooperative CloseType = iota

	// CloseTypeLocalForce represents force closes that we initiated.
	CloseTypeLocalForce

	// CloseTypeRemoteForce represents force closes that our peer initiated.
	CloseTypeRemoteForce

	// CloseTypeBreach represents breach closes from our peer.
	CloseTypeBreach

	// CloseTypeFundingCancelled represents channels which were never
	// created because their funding transaction was cancelled.
	CloseTypeFundingCancelled

	// CloseTypeAbandoned represents a channel that was abandoned.
	CloseTypeAbandoned
)

// String returns the string representation of a close type.
func (c CloseType) String() string {
	switch c {
	case CloseTypeCooperative:
		return "Cooperative"

	case CloseTypeLocalForce:
		return "Local Force"

	case CloseTypeRemoteForce:
		return "Remote Force"

	case CloseTypeBreach:
		return "Breach"

	case CloseTypeFundingCancelled:
		return "Funding Cancelled"

	case CloseTypeAbandoned:
		return "Abandoned"

	default:
		return "Unknown"
	}
}

// Initiator indicates the party that opened or closed a channel. This enum is
// used for cases where we may not have a full set of initiator information
// available over rpc (this is the case for older channels).
type Initiator uint8

const (
	// InitiatorUnrecorded is set when we do not know the open/close
	// initiator for a channel, this is the case when the channel was
	// closed before lnd started tracking initiators.
	InitiatorUnrecorded Initiator = iota

	// InitiatorLocal is set when we initiated a channel open or close.
	InitiatorLocal

	// InitiatorRemote is set when the remote party initiated a chanel open
	// or close.
	InitiatorRemote

	// InitiatorBoth is set in the case where both parties initiated a
	// cooperative close (this is possible with multiple rounds of
	// negotiation).
	InitiatorBoth
)

// String provides the string represenetation of a close initiator.
func (c Initiator) String() string {
	switch c {
	case InitiatorUnrecorded:
		return "Unrecorded"

	case InitiatorLocal:
		return "Local"

	case InitiatorRemote:
		return "Remote"

	case InitiatorBoth:
		return "Both"

	default:
		return fmt.Sprintf("unknown initiator: %d", c)
	}
}

// Transaction represents an on chain transaction.
type Transaction struct {
	// Tx is the on chain transaction.
	Tx *wire.MsgTx

	// TxHash is the transaction hash string.
	TxHash string

	// Timestamp is the timestamp our wallet has for the transaction.
	Timestamp time.Time

	// Amount is the balance change that this transaction had on addresses
	// controlled by our wallet.
	Amount btcutil.Amount

	// Fee is the amount of fees our wallet committed to this transaction.
	// Note that this field is not exhaustive, as it does not account for
	// fees taken from inputs that that wallet doesn't know it owns (for
	// example, the fees taken from our channel balance when we close a
	// channel).
	Fee btcutil.Amount

	// Confirmations is the number of confirmations the transaction has.
	Confirmations int32

	// Label is an optional label set for on chain transactions.
	Label string
}

// Peer contains information about a peer we are connected to.
type Peer struct {
	// Pubkey is the peer's pubkey.
	Pubkey route.Vertex

	// Address is the host:port of the peer.
	Address string

	// BytesSent is the total number of bytes we have sent the peer.
	BytesSent uint64

	// BytesReceived is the total number of bytes we have received from
	// the peer.
	BytesReceived uint64

	// Inbound indicates whether the remote peer initiated the connection.
	Inbound bool

	// PingTime is the estimated round trip time to this peer.
	PingTime time.Duration

	// Sent is the total amount we have sent to this peer.
	Sent btcutil.Amount

	// Received is the total amount we have received from this peer.
	Received btcutil.Amount
}

// ChannelBalance contains information about our channel balances.
type ChannelBalance struct {
	// Balance is the sum of all open channels balances denominated.
	Balance btcutil.Amount

	// PendingBalance is the sum of all pending channel balances.
	PendingBalance btcutil.Amount
}

// Node describes a node in the network.
type Node struct {
	// PubKey is the node's pubkey.
	PubKey route.Vertex

	// LastUpdate is the last update time for the node.
	LastUpdate time.Time

	// Alias is the node's chosen alias.
	Alias string

	// Color is the node's chosen color.
	Color string

	// Features is the set of features the node supports.
	Features []lnwire.FeatureBit

	// Addresses holds the network addresses of the node.
	Addresses []string
}

func newNode(lnNode *lnrpc.LightningNode) (*Node, error) {
	if lnNode == nil {
		return nil, nil
	}

	pubKey, err := route.NewVertexFromStr(lnNode.PubKey)
	if err != nil {
		return nil, err
	}

	node := &Node{
		PubKey:     pubKey,
		LastUpdate: time.Unix(int64(lnNode.LastUpdate), 0),
		Alias:      lnNode.Alias,
		Color:      lnNode.Color,
		Features:   make([]lnwire.FeatureBit, 0, len(lnNode.Features)),
		Addresses:  make([]string, len(lnNode.Addresses)),
	}

	for featureBit := range lnNode.Features {
		node.Features = append(
			node.Features, lnwire.FeatureBit(featureBit),
		)
	}

	for i := 0; i < len(lnNode.Addresses); i++ {
		node.Addresses[i] = lnNode.Addresses[i].Addr
	}

	return node, nil
}

// NodeInfo contains information about a node and its channels.
type NodeInfo struct {
	// Node contains information about the node itself.
	*Node

	// ChannelCount is the total number of public channels the node has
	// announced.
	ChannelCount int

	// TotalCapacity is the node's total public channel capacity.
	TotalCapacity btcutil.Amount

	// Channels contains all of the node's channels, only set if GetNode
	// was queried with include channels set to true.
	Channels []ChannelEdge
}

// Graph describes our view of the graph.
type Graph struct {
	// Nodes is the set of nodes in the channel graph.
	Nodes []Node

	// Edges is the set of edges in the channel graph.
	Edges []ChannelEdge
}

// NodeUpdate holds a node announcement graph topology update.
type NodeUpdate struct {
	// Addresses holds the announced node addresses.
	Addresses []string

	// IdentityKey holds the node's pub key.
	IdentityKey route.Vertex

	// Features is the set of features the node supports.
	Features []lnwire.FeatureBit

	// Alias is the node's alias name.
	Alias string

	// Color is the node's color in hex.
	Color string
}

// ChannelEdgeUpdate holds a channel edge graph topology update.
type ChannelEdgeUpdate struct {
	// ChannelID is the short channel id.
	ChannelID lnwire.ShortChannelID

	// ChannelPoint is the funding channel point.
	ChannelPoint wire.OutPoint

	// Capacity is the channel capacity.
	Capacity btcutil.Amount

	// RoutingPolicy is the actual routing policy for the channel.
	RoutingPolicy RoutingPolicy

	// AdvertisingNode is the node who announced the update.
	AdvertisingNode route.Vertex

	// ConnectingNode is the other end of the channel.
	ConnectingNode route.Vertex
}

// ChannelCloseUpdate holds a channel close graph topology update.
type ChannelCloseUpdate struct {
	// ChannelID is the short channel id of the closed channel.
	ChannelID lnwire.ShortChannelID

	// ChannelPoint is the funding channel point of the closed channel.
	ChannelPoint wire.OutPoint

	// Capacity is the capacity of the closed channel.
	Capacity btcutil.Amount

	// ClosedHeight is the block height when the channel was closed.
	ClosedHeight uint32
}

// GraphTopologyUpdate encapsulates a streamed graph update.
type GraphTopologyUpdate struct {
	// NodeUpdates holds the node announcements.
	NodeUpdates []NodeUpdate

	// ChannelEdgeUpdates holds the channel announcements.
	ChannelEdgeUpdates []ChannelEdgeUpdate

	// ChannelCloseUpdates holds the closed channel announcements.
	ChannelCloseUpdates []ChannelCloseUpdate
}

// NetworkInfo describes the structure of our view of the graph.
type NetworkInfo struct {
	// GraphDiameter is the diameter of the graph.
	GraphDiameter uint32

	// AvgOutDegree is the average out degree in the graph.
	AvgOutDegree float64

	// MaxOutDegree is the largest out degree in the graph.
	MaxOutDegree uint32

	// NumNodes is the number of nodes in our view of the network.
	NumNodes uint32

	// NumChannels is the number of channels in our view of the network.
	NumChannels uint32

	// TotalNetworkCapacity is the total amount of funds in public channels.
	TotalNetworkCapacity btcutil.Amount

	// AvgChannelSize is the average public channel size.
	AvgChannelSize btcutil.Amount

	// MinChannelSize is the size of the smallest public channel in the graph.
	MinChannelSize btcutil.Amount

	// MaxChannelSize is the size of the largest public channel in the graph.
	MaxChannelSize btcutil.Amount

	// MedianChannelSize is the median public channel size.
	MedianChannelSize btcutil.Amount

	// NumZombieChans is the number of channels that have been marked as
	// zombies.
	NumZombieChans uint64
}

// AcceptorRequest contains the details of an incoming channel that has been
// proposed to our node.
type AcceptorRequest struct {
	// NodePubkey is the pubkey of the node that wishes to open an inbound
	// channel.
	NodePubkey route.Vertex

	// ChainHash is the hash of the genesis block of the relevant chain.
	ChainHash []byte

	// PendingChanID is the pending channel ID for the channel.
	PendingChanID [32]byte

	// FundingAmt is the total funding amount.
	FundingAmt btcutil.Amount

	// PushAmt is the amount pushed by the party pushing the channel.
	PushAmt btcutil.Amount

	// The dust limit of the initiator's commitment tx.
	DustLimit btcutil.Amount

	// MaxValueInFlight is the maximum msat amount that can be pending in the
	// channel.
	MaxValueInFlight btcutil.Amount

	// ChannelReserve is the minimum amount of satoshis the initiator requires
	// us to have at all times.
	ChannelReserve btcutil.Amount

	// MinHtlc is the smallest HTLC in millisatoshis that the initiator will
	// accept.
	MinHtlc lnwire.MilliSatoshi

	// FeePerKw is the initial fee rate that the initiator suggests for both
	// commitment transactions.
	FeePerKw chainfee.SatPerKWeight

	// CsvDelay is the number of blocks to use for the relative time lock in
	// the pay-to-self output of both commitment transactions.
	CsvDelay uint32

	// MaxAcceptedHtlcs is the total number of incoming HTLC's that the
	// initiator will accept.
	MaxAcceptedHtlcs uint32

	// ChannelFlags is a bit-field which the initiator uses to specify proposed
	// channel behavior.
	ChannelFlags uint32
}

func newAcceptorRequest(req *lnrpc.ChannelAcceptRequest) (*AcceptorRequest,
	error) {

	pk, err := route.NewVertexFromBytes(req.NodePubkey)
	if err != nil {
		return nil, err
	}

	var pending [32]byte
	copy(pending[:], req.PendingChanId)

	return &AcceptorRequest{
		NodePubkey:       pk,
		ChainHash:        req.ChainHash,
		PendingChanID:    pending,
		FundingAmt:       btcutil.Amount(req.FundingAmt),
		PushAmt:          btcutil.Amount(req.PushAmt),
		DustLimit:        btcutil.Amount(req.DustLimit),
		MaxValueInFlight: btcutil.Amount(req.MaxValueInFlight),
		ChannelReserve:   btcutil.Amount(req.ChannelReserve),
		MinHtlc:          lnwire.MilliSatoshi(req.MinHtlc),
		FeePerKw:         chainfee.SatPerKWeight(req.FeePerKw),
		CsvDelay:         req.CsvDelay,
		MaxAcceptedHtlcs: req.MaxAcceptedHtlcs,
		ChannelFlags:     req.ChannelFlags,
	}, nil
}

// AcceptorResponse contains the response to a channel acceptor request.
type AcceptorResponse struct {
	// Accept indicates whether to accept the channel.
	Accept bool

	// Error is an optional error to send the initiating party to indicate
	// why the channel was rejected. This string will be sent to the
	// initiating peer, and is limited to 500 chars. This field cannot be
	// set if the accept boolean is true.
	Error string

	// UpfrontShutdown is the address to use if the initiating peer supports
	// option upfront shutdown. Note that you must check whether the peer
	// supports this feature if setting the address.
	UpfrontShutdown string

	// CsvDelay is the delay (in blocks) that we require for the remote party.
	CsvDelay uint32

	// ReserveSat is the amount that we require the remote peer to adhere to.
	ReserveSat uint64

	// InFlightMaxMsat is the maximum amount of funds in millisatoshis that
	// we allow the remote peer to have in outstanding htlcs.
	InFlightMaxMsat uint64

	// MaxHtlcCount is the maximum number of htlcs that the remote peer can
	// offer us.
	MaxHtlcCount uint32

	// MinHtlcIn is the minimum value in millisatoshis for incoming htlcs
	// on the channel.
	MinHtlcIn uint64

	// MinAcceptDepth is the number of confirmations we require before we
	// consider the channel open.
	MinAcceptDepth uint32
}

// QueryRoutesRequest is the request of a QueryRoutes call.
type QueryRoutesRequest struct {
	// Source is the optional source vertex of the route.
	Source *route.Vertex

	// PubKey is the destination vertex.
	PubKey route.Vertex

	// LastHop is the optional last hop before the destination.
	LastHop *route.Vertex

	// RouteHints represents the different routing hints that can be used to
	// assist the router. These hints will act as optional intermediate hops
	// along the route.
	RouteHints [][]zpay32.HopHint

	// MaxCltv when set is used the the CLTV limit.
	MaxCltv *uint32

	// UseMissionControl if set to true, edge probabilities from mission
	// control will be used to get the optimal route.
	UseMissionControl bool

	// AmtMsat is the amount we'd like to send along the route in
	// millisatoshis.
	AmtMsat lnwire.MilliSatoshi

	// FeeLimitMsat is the fee limit to use in millisatoshis.
	FeeLimitMsat lnwire.MilliSatoshi
}

// Hop holds details about a single hop along a route.
type Hop struct {
	// ChannelID is the short channel ID of the forwarding channel.
	ChannelID uint64

	// Expiry is the timelock value.
	Expiry uint32

	// AmtToForwardMsat is the forwarded amount for this hop.
	AmtToForwardMsat lnwire.MilliSatoshi

	// FeeMsat is the forwarding fee for this hop.
	FeeMsat lnwire.MilliSatoshi

	// PubKey is an optional public key of the hop. If the public key is
	// given, the payment can be executed without relying on a copy of the
	// channel graph.
	PubKey *route.Vertex
}

// QueryRoutesResponse is the response of a QueryRoutes call.
type QueryRoutesResponse struct {
	// TotalTimeLock is the cumulative (final) time lock across the entire
	// route. This is the CLTV value that should be extended to the first
	// hop in the route. All other hops will decrement the time-lock as
	// advertised, leaving enough time for all hops to wait for or present
	// the payment preimage to complete the payment.
	TotalTimeLock uint32

	// Hops contains details concerning the specific forwarding details at
	// each hop.
	Hops []*Hop

	// TotalFeesMsat is the total fees in millisatoshis.
	TotalFeesMsat lnwire.MilliSatoshi

	// TotalAmtMsat is the total amount in millisatoshis.
	TotalAmtMsat lnwire.MilliSatoshi
}

var (
	// ErrNoRouteFound is returned if we can't find a path with the passed
	// parameters.
	ErrNoRouteFound = errors.New("no route found")

	// PaymentResultUnknownPaymentHash is the string result returned by
	// SendPayment when the final node indicates the hash is unknown.
	PaymentResultUnknownPaymentHash = "UnknownPaymentHash"

	// PaymentResultSuccess is the string result returned by SendPayment
	// when the payment was successful.
	PaymentResultSuccess = ""

	// PaymentResultAlreadyPaid is the string result returned by SendPayment
	// when the payment was already completed in a previous SendPayment
	// call.
	PaymentResultAlreadyPaid = channeldb.ErrAlreadyPaid.Error()

	// PaymentResultInFlight is the string result returned by SendPayment
	// when the payment was initiated in a previous SendPayment call and
	// still in flight.
	PaymentResultInFlight = channeldb.ErrPaymentInFlight.Error()

	paymentPollInterval = 3 * time.Second
)

type lightningClient struct {
	client   lnrpc.LightningClient
	wg       sync.WaitGroup
	params   *chaincfg.Params
	timeout  time.Duration
	adminMac serializedMacaroon
}

func newLightningClient(conn grpc.ClientConnInterface, timeout time.Duration,
	params *chaincfg.Params, adminMac serializedMacaroon) *lightningClient {

	return &lightningClient{
		client:   lnrpc.NewLightningClient(conn),
		params:   params,
		timeout:  timeout,
		adminMac: adminMac,
	}
}

// PaymentResult signals the result of a payment.
type PaymentResult struct {
	Err      error
	Preimage lntypes.Preimage
	PaidFee  btcutil.Amount
	PaidAmt  btcutil.Amount
}

func (s *lightningClient) WaitForFinished() {
	s.wg.Wait()
}

// WalletBalance returns a summary of the node's wallet balance.
func (s *lightningClient) WalletBalance(ctx context.Context) (
	*WalletBalance, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.WalletBalance(rpcCtx, &lnrpc.WalletBalanceRequest{})
	if err != nil {
		return nil, err
	}

	return &WalletBalance{
		Confirmed:   btcutil.Amount(resp.ConfirmedBalance),
		Unconfirmed: btcutil.Amount(resp.UnconfirmedBalance),
	}, nil
}

func (s *lightningClient) GetInfo(ctx context.Context) (*Info, error) {
	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.GetInfo(rpcCtx, &lnrpc.GetInfoRequest{})
	if err != nil {
		return nil, err
	}

	return newInfo(resp)
}

func newInfo(resp *lnrpc.GetInfoResponse) (*Info, error) {
	pubKey, err := hex.DecodeString(resp.IdentityPubkey)
	if err != nil {
		return nil, err
	}

	var pubKeyArray [33]byte
	copy(pubKeyArray[:], pubKey)

	return &Info{
		Version:             resp.Version,
		BlockHeight:         resp.BlockHeight,
		IdentityPubkey:      pubKeyArray,
		Alias:               resp.Alias,
		Network:             resp.Chains[0].Network,
		Uris:                resp.Uris,
		SyncedToChain:       resp.SyncedToChain,
		SyncedToGraph:       resp.SyncedToGraph,
		BestHeaderTimeStamp: time.Unix(resp.BestHeaderTimestamp, 0),
		ActiveChannels:      resp.NumActiveChannels,
		InactiveChannels:    resp.NumInactiveChannels,
		PendingChannels:     resp.NumPendingChannels,
	}, nil
}

func (s *lightningClient) EstimateFeeToP2WSH(ctx context.Context,
	amt btcutil.Amount, confTarget int32) (btcutil.Amount,
	error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	// Generate dummy p2wsh address for fee estimation.
	wsh := [32]byte{}
	p2wshAddress, err := btcutil.NewAddressWitnessScriptHash(
		wsh[:], s.params,
	)
	if err != nil {
		return 0, err
	}

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.EstimateFee(
		rpcCtx,
		&lnrpc.EstimateFeeRequest{
			TargetConf: confTarget,
			AddrToAmount: map[string]int64{
				p2wshAddress.String(): int64(amt),
			},
		},
	)
	if err != nil {
		return 0, err
	}
	return btcutil.Amount(resp.FeeSat), nil
}

// PayInvoice pays an invoice.
func (s *lightningClient) PayInvoice(ctx context.Context, invoice string,
	maxFee btcutil.Amount, outgoingChannel *uint64) chan PaymentResult {

	// Use buffer to prevent blocking.
	paymentChan := make(chan PaymentResult, 1)

	// Execute payment in parallel, because it will block until server
	// discovers preimage.
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()

		result := s.payInvoice(ctx, invoice, maxFee, outgoingChannel)
		if result != nil {
			paymentChan <- *result
		}
	}()

	return paymentChan
}

// payInvoice tries to send a payment and returns the final result. If
// necessary, it will poll lnd for the payment result.
func (s *lightningClient) payInvoice(ctx context.Context, invoice string,
	maxFee btcutil.Amount, outgoingChannel *uint64) *PaymentResult {

	payReq, err := zpay32.Decode(invoice, s.params)
	if err != nil {
		return &PaymentResult{
			Err: fmt.Errorf("invoice decode: %v", err),
		}
	}

	if payReq.MilliSat == nil {
		return &PaymentResult{
			Err: errors.New("no amount in invoice"),
		}
	}

	hash := lntypes.Hash(*payReq.PaymentHash)

	ctx = s.adminMac.WithMacaroonAuth(ctx)
	for {
		// Create no timeout context as this call can block for a long
		// time.

		req := &lnrpc.SendRequest{
			FeeLimit: &lnrpc.FeeLimit{
				Limit: &lnrpc.FeeLimit_Fixed{
					Fixed: int64(maxFee),
				},
			},
			PaymentRequest: invoice,
		}

		if outgoingChannel != nil {
			req.OutgoingChanId = *outgoingChannel
		}

		payResp, err := s.client.SendPaymentSync(ctx, req)

		if status.Code(err) == codes.Canceled {
			return nil
		}

		if err == nil {
			// TODO: Use structured payment error when available,
			// instead of this britle string matching.
			switch payResp.PaymentError {

			// Paid successfully.
			case PaymentResultSuccess:
				log.Infof(
					"Payment %v completed", hash,
				)

				r := payResp.PaymentRoute
				preimage, err := lntypes.MakePreimage(
					payResp.PaymentPreimage,
				)
				if err != nil {
					return &PaymentResult{Err: err}
				}
				return &PaymentResult{
					PaidFee: btcutil.Amount(r.TotalFees), // nolint:staticcheck
					PaidAmt: btcutil.Amount(
						r.TotalAmt - r.TotalFees, // nolint:staticcheck
					),
					Preimage: preimage,
				}

			// Invoice was already paid on a previous run.
			case PaymentResultAlreadyPaid:
				log.Infof(
					"Payment %v already completed", hash,
				)

				// Unfortunately lnd doesn't return the route if
				// the payment was successful in a previous
				// call. Assume paid fees 0 and take paid amount
				// from invoice.

				return &PaymentResult{
					PaidFee: 0,
					PaidAmt: payReq.MilliSat.ToSatoshis(),
				}

			// If the payment is already in flight, we will poll
			// again later for an outcome.
			//
			// TODO: Improve this when lnd expose more API to
			// tracking existing payments.
			case PaymentResultInFlight:
				log.Infof(
					"Payment %v already in flight", hash,
				)

				time.Sleep(paymentPollInterval)

			// Other errors are transformed into an error struct.
			default:
				log.Warnf(
					"Payment %v failed: %v", hash,
					payResp.PaymentError,
				)

				return &PaymentResult{
					Err: errors.New(payResp.PaymentError),
				}
			}
		}
	}
}

func (s *lightningClient) AddInvoice(ctx context.Context,
	in *invoicesrpc.AddInvoiceData) (lntypes.Hash, string, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcIn := &lnrpc.Invoice{
		Memo:       in.Memo,
		Value:      int64(in.Value.ToSatoshis()),
		Expiry:     in.Expiry,
		CltvExpiry: in.CltvExpiry,
		Private:    true,
	}

	if in.Preimage != nil {
		rpcIn.RPreimage = in.Preimage[:]
	}
	if in.Hash != nil {
		rpcIn.RHash = in.Hash[:]
	}

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.AddInvoice(rpcCtx, rpcIn)
	if err != nil {
		return lntypes.Hash{}, "", err
	}
	hash, err := lntypes.MakeHash(resp.RHash)
	if err != nil {
		return lntypes.Hash{}, "", err
	}

	return hash, resp.PaymentRequest, nil
}

// WalletBalance describes our wallet's current balance.
type WalletBalance struct {
	// Confirmed is our total confirmed balance.
	Confirmed btcutil.Amount

	// Unconfirmed is our total unconfirmed balance.
	Unconfirmed btcutil.Amount
}

// Invoice represents an invoice in lnd.
type Invoice struct {
	// Preimage is the invoice's preimage, which is set if the invoice
	// is settled.
	Preimage *lntypes.Preimage

	// Hash is the invoice hash.
	Hash lntypes.Hash

	// Memo is an optional memo field for hte invoice.
	Memo string

	// PaymentRequest is the invoice's payment request.
	PaymentRequest string

	// Amount is the amount of the invoice in millisatoshis.
	Amount lnwire.MilliSatoshi

	// AmountPaid is the amount that was paid for the invoice. This field
	// will only be set if the invoice is settled.
	AmountPaid lnwire.MilliSatoshi

	// CreationDate is the time the invoice was created.
	CreationDate time.Time

	// SettleDate is the time the invoice was settled.
	SettleDate time.Time

	// State is the invoice's current state.
	State channeldb.ContractState

	// IsKeysend indicates whether the invoice was a spontaneous payment.
	IsKeysend bool

	// Htlcs is the set of htlcs that the invoice was settled with.
	Htlcs []InvoiceHtlc

	// AddIndex is the index at which the invoice was added.
	AddIndex uint64

	// SettleIndex is the index at which the invoice was settled.
	SettleIndex uint64
}

// InvoiceHtlc represents a htlc that was used to pay an invoice.
type InvoiceHtlc struct {
	// ChannelID is the short channel ID of the incoming channel that the
	// htlc arrived on.
	ChannelID lnwire.ShortChannelID

	// Amount is the amount in millisatoshis that was paid with this htlc.
	// Note that this may not be the full amount because invoices can be
	// paid with multiple hltcs.
	Amount lnwire.MilliSatoshi

	// AcceptTime is the time that the htlc arrived at our node.
	AcceptTime time.Time

	// ResolveTime is the time that the htlc was resolved (settled or failed
	// back).
	ResolveTime time.Time

	// CustomRecords is list of the custom tlv records.
	CustomRecords map[uint64][]byte
}

// PendingHtlc represents a HTLC that is currently pending on some channel.
type PendingHtlc struct {
	// Incoming is true if the HTLC is incoming.
	Incoming bool

	// Amount is the amount in satoshis that this HTLC represents.
	Amount btcutil.Amount
}

// LookupInvoice looks up an invoice in lnd, it will error if the invoice is
// not known to lnd.
func (s *lightningClient) LookupInvoice(ctx context.Context,
	hash lntypes.Hash) (*Invoice, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcIn := &lnrpc.PaymentHash{
		RHash: hash[:],
	}

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.LookupInvoice(rpcCtx, rpcIn)
	if err != nil {
		return nil, err
	}

	invoice, err := unmarshalInvoice(resp)
	if err != nil {
		return nil, err
	}

	return invoice, nil
}

// unmarshalInvoice creates an invoice from the rpc response provided.
func unmarshalInvoice(resp *lnrpc.Invoice) (*Invoice, error) {
	hash, err := lntypes.MakeHash(resp.RHash)
	if err != nil {
		return nil, err
	}

	invoice := &Invoice{
		Preimage:       nil,
		Hash:           hash,
		Memo:           resp.Memo,
		PaymentRequest: resp.PaymentRequest,
		Amount:         lnwire.MilliSatoshi(resp.ValueMsat),
		AmountPaid:     lnwire.MilliSatoshi(resp.AmtPaidMsat),
		CreationDate:   time.Unix(resp.CreationDate, 0),
		IsKeysend:      resp.IsKeysend,
		Htlcs:          make([]InvoiceHtlc, len(resp.Htlcs)),
		AddIndex:       resp.AddIndex,
		SettleIndex:    resp.SettleIndex,
	}

	for i, htlc := range resp.Htlcs {
		invoiceHtlc := InvoiceHtlc{
			ChannelID:     lnwire.NewShortChanIDFromInt(htlc.ChanId),
			Amount:        lnwire.MilliSatoshi(htlc.AmtMsat),
			CustomRecords: htlc.CustomRecords,
		}

		if htlc.AcceptTime != 0 {
			invoiceHtlc.AcceptTime = time.Unix(htlc.AcceptTime, 0)
		}

		if htlc.ResolveTime != 0 {
			invoiceHtlc.ResolveTime = time.Unix(htlc.ResolveTime, 0)
		}

		invoice.Htlcs[i] = invoiceHtlc
	}

	switch resp.State {
	case lnrpc.Invoice_OPEN:
		invoice.State = channeldb.ContractOpen

	case lnrpc.Invoice_ACCEPTED:
		invoice.State = channeldb.ContractAccepted

	// If the invoice is settled, it also has a non-nil preimage, which we
	// can set on our invoice.
	case lnrpc.Invoice_SETTLED:
		invoice.State = channeldb.ContractSettled
		preimage, err := lntypes.MakePreimage(resp.RPreimage)
		if err != nil {
			return nil, err
		}
		invoice.Preimage = &preimage

	case lnrpc.Invoice_CANCELED:
		invoice.State = channeldb.ContractCanceled

	default:
		return nil, fmt.Errorf("unknown invoice state: %v",
			resp.State)
	}

	// Only set settle date if it is non-zero, because 0 unix time is
	// not the same as a zero time struct.
	if resp.SettleDate != 0 {
		invoice.SettleDate = time.Unix(resp.SettleDate, 0)
	}

	return invoice, nil
}

// ListTransactions returns all known transactions of the backing lnd node.
func (s *lightningClient) ListTransactions(ctx context.Context, startHeight,
	endHeight int32) ([]Transaction, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	rpcIn := &lnrpc.GetTransactionsRequest{
		StartHeight: startHeight,
		EndHeight:   endHeight,
	}

	resp, err := s.client.GetTransactions(rpcCtx, rpcIn)
	if err != nil {
		return nil, err
	}

	txs := make([]Transaction, len(resp.Transactions))
	for i, respTx := range resp.Transactions {
		rawTx, err := hex.DecodeString(respTx.RawTxHex)
		if err != nil {
			return nil, err
		}

		var tx wire.MsgTx
		if err := tx.Deserialize(bytes.NewReader(rawTx)); err != nil {
			return nil, err
		}

		txs[i] = Transaction{
			Tx:            &tx,
			TxHash:        tx.TxHash().String(),
			Timestamp:     time.Unix(respTx.TimeStamp, 0),
			Amount:        btcutil.Amount(respTx.Amount),
			Fee:           btcutil.Amount(respTx.TotalFees),
			Confirmations: respTx.NumConfirmations,
			Label:         respTx.Label,
		}
	}

	return txs, nil
}

// ListChannels retrieves all channels of the backing lnd node.
func (s *lightningClient) ListChannels(ctx context.Context) (
	[]ChannelInfo, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	response, err := s.client.ListChannels(
		s.adminMac.WithMacaroonAuth(rpcCtx),
		&lnrpc.ListChannelsRequest{},
	)
	if err != nil {
		return nil, err
	}

	result := make([]ChannelInfo, len(response.Channels))
	for i, channel := range response.Channels {
		channelInfo, err := newChannelInfo(channel)
		if err != nil {
			return nil, err
		}

		result[i] = *channelInfo
	}

	return result, nil
}

// PendingChannels contains lnd's channels that are pending open and close.
type PendingChannels struct {
	// PendingForceClose contains our channels that have been force closed,
	// and are awaiting full on chain resolution.
	PendingForceClose []ForceCloseChannel

	// PendingOpen contains channels that we are waiting to confirm on chain
	// so that they can be marked as fully open.
	PendingOpen []PendingChannel

	// WaitingClose contains channels that are waiting for their close tx
	// to confirm.
	WaitingClose []WaitingCloseChannel
}

// PendingChannel contains the information common to all pending channels.
type PendingChannel struct {
	// ChannelPoint is the outpoint of the channel.
	ChannelPoint *wire.OutPoint

	// PubKeyBytes is the raw bytes of the public key of the remote node.
	PubKeyBytes route.Vertex

	// Capacity is the total amount of funds held in this channel.
	Capacity btcutil.Amount

	// ChannelInitiator indicates which party opened the channel.
	ChannelInitiator Initiator
}

// NewPendingChannel creates a pending channel from the rpc struct.
func NewPendingChannel(channel *lnrpc.PendingChannelsResponse_PendingChannel) (
	*PendingChannel, error) {

	peer, err := route.NewVertexFromStr(channel.RemoteNodePub)
	if err != nil {
		return nil, err
	}

	outpoint, err := NewOutpointFromStr(channel.ChannelPoint)
	if err != nil {
		return nil, err
	}

	initiator, err := getInitiator(channel.Initiator)
	if err != nil {
		return nil, err
	}

	return &PendingChannel{
		ChannelPoint:     outpoint,
		PubKeyBytes:      peer,
		Capacity:         btcutil.Amount(channel.Capacity),
		ChannelInitiator: initiator,
	}, nil
}

// ForceCloseChannel describes a channel that pending force close.
type ForceCloseChannel struct {
	// PendingChannel contains information about the channel.
	PendingChannel

	// CloseTxid is the close transaction that confirmed on chain.
	CloseTxid chainhash.Hash
}

// WaitingCloseChannel describes a channel that we are waiting to be closed on
// chain. It contains both parties close txids because either may confirm at
// this point.
type WaitingCloseChannel struct {
	// PendingChannel contains information about the channel.
	PendingChannel

	// LocalTxid is our close transaction's txid.
	LocalTxid chainhash.Hash

	// RemoteTxid is the remote party's close txid.
	RemoteTxid chainhash.Hash

	// RemotePending is the txid of the remote party's pending commit.
	RemotePending chainhash.Hash
}

// PendingChannels returns a list of lnd's pending channels.
func (s *lightningClient) PendingChannels(ctx context.Context) (*PendingChannels,
	error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	resp, err := s.client.PendingChannels(
		s.adminMac.WithMacaroonAuth(rpcCtx),
		&lnrpc.PendingChannelsRequest{},
	)
	if err != nil {
		return nil, err
	}

	pending := &PendingChannels{
		PendingForceClose: make([]ForceCloseChannel, len(resp.PendingForceClosingChannels)),
		PendingOpen:       make([]PendingChannel, len(resp.PendingOpenChannels)),
		WaitingClose:      make([]WaitingCloseChannel, len(resp.WaitingCloseChannels)),
	}

	for i, force := range resp.PendingForceClosingChannels {
		channel, err := NewPendingChannel(force.Channel)
		if err != nil {
			return nil, err
		}

		hash, err := chainhash.NewHashFromStr(force.ClosingTxid)
		if err != nil {
			return nil, err
		}

		pending.PendingForceClose[i] = ForceCloseChannel{
			PendingChannel: *channel,
			CloseTxid:      *hash,
		}
	}

	for i, waiting := range resp.WaitingCloseChannels {
		channel, err := NewPendingChannel(waiting.Channel)
		if err != nil {
			return nil, err
		}

		local, err := chainhash.NewHashFromStr(
			waiting.Commitments.LocalTxid,
		)
		if err != nil {
			return nil, err
		}

		remote, err := chainhash.NewHashFromStr(
			waiting.Commitments.RemoteTxid,
		)
		if err != nil {
			return nil, err
		}

		remotePending, err := chainhash.NewHashFromStr(
			waiting.Commitments.RemotePendingTxid,
		)
		if err != nil {
			return nil, err
		}

		closing := WaitingCloseChannel{
			PendingChannel: *channel,
			LocalTxid:      *local,
			RemoteTxid:     *remote,
			RemotePending:  *remotePending,
		}
		pending.WaitingClose[i] = closing
	}

	for i, open := range resp.PendingOpenChannels {
		channel, err := NewPendingChannel(open.Channel)
		if err != nil {
			return nil, err
		}

		pending.PendingOpen[i] = *channel
	}

	return pending, nil
}

func getClosedChannel(closeSummary *lnrpc.ChannelCloseSummary) (
	*ClosedChannel, error) {

	remote, err := route.NewVertexFromStr(closeSummary.RemotePubkey)
	if err != nil {
		return nil, err
	}

	closeType, err := rpcCloseType(closeSummary.CloseType)
	if err != nil {
		return nil, err
	}

	openInitiator, err := getInitiator(closeSummary.OpenInitiator)
	if err != nil {
		return nil, err
	}

	closeInitiator, err := rpcCloseInitiator(
		closeSummary.CloseInitiator, closeType,
	)
	if err != nil {
		return nil, err
	}

	return &ClosedChannel{
		ChannelPoint:   closeSummary.ChannelPoint,
		ChannelID:      closeSummary.ChanId,
		ClosingTxHash:  closeSummary.ClosingTxHash,
		CloseType:      closeType,
		CloseHeight:    closeSummary.CloseHeight,
		OpenInitiator:  openInitiator,
		CloseInitiator: closeInitiator,
		PubKeyBytes:    remote,
		Capacity:       btcutil.Amount(closeSummary.Capacity),
		SettledBalance: btcutil.Amount(closeSummary.SettledBalance),
	}, nil
}

// ClosedChannels returns a list of our closed channels.
func (s *lightningClient) ClosedChannels(ctx context.Context) ([]ClosedChannel,
	error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	response, err := s.client.ClosedChannels(
		s.adminMac.WithMacaroonAuth(rpcCtx),
		&lnrpc.ClosedChannelsRequest{},
	)
	if err != nil {
		return nil, err
	}

	channels := make([]ClosedChannel, len(response.Channels))
	for i, channel := range response.Channels {
		closedChannel, err := getClosedChannel(channel)
		if err != nil {
			return nil, err
		}
		channels[i] = *closedChannel
	}

	return channels, nil
}

// rpcCloseType maps a rpc close type to our local enum.
func rpcCloseType(t lnrpc.ChannelCloseSummary_ClosureType) (CloseType, error) {
	switch t {
	case lnrpc.ChannelCloseSummary_COOPERATIVE_CLOSE:
		return CloseTypeCooperative, nil

	case lnrpc.ChannelCloseSummary_LOCAL_FORCE_CLOSE:
		return CloseTypeLocalForce, nil

	case lnrpc.ChannelCloseSummary_REMOTE_FORCE_CLOSE:
		return CloseTypeRemoteForce, nil

	case lnrpc.ChannelCloseSummary_BREACH_CLOSE:
		return CloseTypeBreach, nil

	case lnrpc.ChannelCloseSummary_FUNDING_CANCELED:
		return CloseTypeFundingCancelled, nil

	case lnrpc.ChannelCloseSummary_ABANDONED:
		return CloseTypeAbandoned, nil

	default:
		return 0, fmt.Errorf("unknown close type: %v", t)
	}
}

// rpcCloseInitiator maps a close initiator to our local type. Since this field
// is not always set in lnd for older channels, also use our close type to infer
// who initiated the close when we have force closes.
func rpcCloseInitiator(initiator lnrpc.Initiator,
	closeType CloseType) (Initiator, error) {

	// Since our close type is always set on the rpc, we first check whether
	// we can figure out the close initiator from this value. This is only
	// possible for force closes/breaches.
	switch closeType {
	case CloseTypeLocalForce:
		return InitiatorLocal, nil

	case CloseTypeRemoteForce, CloseTypeBreach:
		return InitiatorRemote, nil
	}

	// Otherwise, we check whether our initiator field is set, and fail only
	// if we have an unknown type.
	return getInitiator(initiator)
}

// getInitiator maps a rpc initiator value to our initiator enum.
func getInitiator(initiator lnrpc.Initiator) (Initiator, error) {
	switch initiator {
	case lnrpc.Initiator_INITIATOR_LOCAL:
		return InitiatorLocal, nil

	case lnrpc.Initiator_INITIATOR_REMOTE:
		return InitiatorRemote, nil

	case lnrpc.Initiator_INITIATOR_BOTH:
		return InitiatorBoth, nil

	case lnrpc.Initiator_INITIATOR_UNKNOWN:
		return InitiatorUnrecorded, nil

	default:
		return InitiatorUnrecorded, fmt.Errorf("unknown "+
			"initiator: %v", initiator)
	}
}

// ForwardingHistoryRequest contains the request parameters for a paginated
// forwarding history call.
type ForwardingHistoryRequest struct {
	// StartTime is the beginning of the query period.
	StartTime time.Time

	// EndTime is the end of the query period.
	EndTime time.Time

	// MaxEvents is the maximum number of events to return.
	MaxEvents uint32

	// Offset is the index from which to start querying.
	Offset uint32
}

// ForwardingHistoryResponse contains the response to a forwarding history
// query, including last index offset required for paginated queries.
type ForwardingHistoryResponse struct {
	// LastIndexOffset is the index offset of the last item in our set.
	LastIndexOffset uint32

	// Events is the set of events that were found in the interval queried.
	Events []ForwardingEvent
}

// ForwardingEvent represents a htlc that was forwarded through our node.
type ForwardingEvent struct {
	// Timestamp is the time that we processed the forwarding event.
	Timestamp time.Time

	// ChannelIn is the id of the channel the htlc arrived at our node on.
	ChannelIn uint64

	// ChannelOut is the id of the channel the htlc left our node on.
	ChannelOut uint64

	// AmountMsatIn is the amount that was forwarded into our node in
	// millisatoshis.
	AmountMsatIn lnwire.MilliSatoshi

	// AmountMsatOut is the amount that was forwarded out of our node in
	// millisatoshis.
	AmountMsatOut lnwire.MilliSatoshi

	// FeeMsat is the amount of fees earned in millisatoshis,
	FeeMsat lnwire.MilliSatoshi
}

// ForwardingHistory returns a set of forwarding events for the period queried.
// Note that this call is paginated, and the information required to make
// subsequent calls is provided in the response.
func (s *lightningClient) ForwardingHistory(ctx context.Context,
	req ForwardingHistoryRequest) (*ForwardingHistoryResponse, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	response, err := s.client.ForwardingHistory(
		s.adminMac.WithMacaroonAuth(rpcCtx),
		&lnrpc.ForwardingHistoryRequest{
			StartTime:    uint64(req.StartTime.Unix()),
			EndTime:      uint64(req.EndTime.Unix()),
			IndexOffset:  req.Offset,
			NumMaxEvents: req.MaxEvents,
		},
	)
	if err != nil {
		return nil, err
	}

	events := make([]ForwardingEvent, len(response.ForwardingEvents))
	for i, event := range response.ForwardingEvents {
		events[i] = ForwardingEvent{
			Timestamp:     time.Unix(int64(event.Timestamp), 0), // nolint:staticcheck
			ChannelIn:     event.ChanIdIn,
			ChannelOut:    event.ChanIdOut,
			AmountMsatIn:  lnwire.MilliSatoshi(event.AmtInMsat),
			AmountMsatOut: lnwire.MilliSatoshi(event.AmtOutMsat),
			FeeMsat:       lnwire.MilliSatoshi(event.FeeMsat),
		}
	}

	return &ForwardingHistoryResponse{
		LastIndexOffset: response.LastOffsetIndex,
		Events:          events,
	}, nil
}

// ListInvoicesRequest contains the request parameters for a paginated
// list invoices call.
type ListInvoicesRequest struct {
	// MaxInvoices is the maximum number of invoices to return.
	MaxInvoices uint64

	// Offset is the index from which to start querying.
	Offset uint64

	// Reversed is set to query our invoices backwards.
	Reversed bool

	// PendingOnly is set if we only want pending invoices.
	PendingOnly bool
}

// ListInvoicesResponse contains the response to a list invoices query,
// including the index offsets required for paginated queries.
type ListInvoicesResponse struct {
	// FirstIndexOffset is the index offset of the first item in our set.
	FirstIndexOffset uint64

	// LastIndexOffset is the index offset of the last item in our set.
	LastIndexOffset uint64

	// Invoices is the set of invoices that were returned.
	Invoices []Invoice
}

// ListInvoices returns a list of invoices from our node.
func (s *lightningClient) ListInvoices(ctx context.Context,
	req ListInvoicesRequest) (*ListInvoicesResponse, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	resp, err := s.client.ListInvoices(
		s.adminMac.WithMacaroonAuth(rpcCtx),
		&lnrpc.ListInvoiceRequest{
			PendingOnly:    false,
			IndexOffset:    req.Offset,
			NumMaxInvoices: req.MaxInvoices,
			Reversed:       req.Reversed,
		},
	)
	if err != nil {
		return nil, err
	}

	invoices := make([]Invoice, len(resp.Invoices))
	for i, invoice := range resp.Invoices {
		inv, err := unmarshalInvoice(invoice)
		if err != nil {
			return nil, err
		}

		invoices[i] = *inv
	}

	return &ListInvoicesResponse{
		FirstIndexOffset: resp.FirstIndexOffset,
		LastIndexOffset:  resp.LastIndexOffset,
		Invoices:         invoices,
	}, nil
}

// Payment represents a payment made by our node.
type Payment struct {
	// Hash is the payment hash used.
	Hash lntypes.Hash

	// Preimage is the preimage of the payment. It will have a non-nil value
	// if the payment is settled.
	Preimage *lntypes.Preimage

	// PaymentRequest is the payment request for this payment. This value
	// will not be set for keysend payments and for payments that manually
	// specify their destination and amount.
	PaymentRequest string

	// Amount is the amount in millisatoshis of the payment.
	Amount lnwire.MilliSatoshi

	// Fee is the amount in millisatoshis that was paid in fees.
	Fee lnwire.MilliSatoshi

	// Status describes the state of a payment.
	Status *PaymentStatus

	// Htlcs is the set of htlc attempts made by the payment.
	Htlcs []*lnrpc.HTLCAttempt

	// SequenceNumber is a unique id for each payment.
	SequenceNumber uint64
}

// ListPaymentsRequest contains the request parameters for a paginated
// list payments call.
type ListPaymentsRequest struct {
	// MaxPayments is the maximum number of payments to return.
	MaxPayments uint64

	// Offset is the index from which to start querying.
	Offset uint64

	// Reversed is set to query our payments backwards.
	Reversed bool

	// IncludeIncomplete is set if we want to include incomplete payments.
	IncludeIncomplete bool
}

// ListPaymentsResponse contains the response to a list payments query,
// including the index offsets required for paginated queries.
type ListPaymentsResponse struct {
	// FirstIndexOffset is the index offset of the first item in our set.
	FirstIndexOffset uint64

	// LastIndexOffset is the index offset of the last item in our set.
	LastIndexOffset uint64

	// Payments is the set of invoices that were returned.
	Payments []Payment
}

// ListPayments makes a paginated call to our listpayments endpoint.
func (s *lightningClient) ListPayments(ctx context.Context,
	req ListPaymentsRequest) (*ListPaymentsResponse, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	resp, err := s.client.ListPayments(
		s.adminMac.WithMacaroonAuth(rpcCtx),
		&lnrpc.ListPaymentsRequest{
			IncludeIncomplete: req.IncludeIncomplete,
			IndexOffset:       req.Offset,
			MaxPayments:       req.MaxPayments,
			Reversed:          req.Reversed,
		})
	if err != nil {
		return nil, err
	}

	payments := make([]Payment, len(resp.Payments))
	for i, payment := range resp.Payments {
		hash, err := lntypes.MakeHashFromStr(payment.PaymentHash)
		if err != nil {
			return nil, err
		}

		status, err := unmarshallPaymentStatus(payment)
		if err != nil {
			return nil, err
		}

		pmt := Payment{
			Hash:           hash,
			PaymentRequest: payment.PaymentRequest,
			Status:         status,
			Htlcs:          payment.Htlcs,
			Amount:         lnwire.MilliSatoshi(payment.ValueMsat),
			Fee:            lnwire.MilliSatoshi(payment.FeeMsat),
			SequenceNumber: payment.PaymentIndex,
		}

		// Add our preimage if it is known.
		if payment.PaymentPreimage != "" {
			preimage, err := lntypes.MakePreimageFromStr(
				payment.PaymentPreimage,
			)
			if err != nil {
				return nil, err
			}
			pmt.Preimage = &preimage
		}

		payments[i] = pmt
	}

	return &ListPaymentsResponse{
		FirstIndexOffset: resp.FirstIndexOffset,
		LastIndexOffset:  resp.LastIndexOffset,
		Payments:         payments,
	}, nil
}

// ChannelBackup retrieves the backup for a particular channel. The backup is
// returned as an encrypted chanbackup.Single payload.
func (s *lightningClient) ChannelBackup(ctx context.Context,
	channelPoint wire.OutPoint) ([]byte, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	req := &lnrpc.ExportChannelBackupRequest{
		ChanPoint: &lnrpc.ChannelPoint{
			FundingTxid: &lnrpc.ChannelPoint_FundingTxidBytes{
				FundingTxidBytes: channelPoint.Hash[:],
			},
			OutputIndex: channelPoint.Index,
		},
	}
	resp, err := s.client.ExportChannelBackup(rpcCtx, req)
	if err != nil {
		return nil, err
	}

	return resp.ChanBackup, nil
}

// ChannelBackups retrieves backups for all existing pending open and open
// channels. The backups are returned as an encrypted chanbackup.Multi payload.
func (s *lightningClient) ChannelBackups(ctx context.Context) ([]byte, error) {
	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	req := &lnrpc.ChanBackupExportRequest{}
	resp, err := s.client.ExportAllChannelBackups(rpcCtx, req)
	if err != nil {
		return nil, err
	}

	return resp.MultiChanBackup.MultiChanBackup, nil
}

// getOutPoint is a helper go convert a hash and output index to
// a wire.OutPoint object.
func getOutPoint(txID []byte, idx uint32) (*wire.OutPoint, error) {
	hash, err := chainhash.NewHash(txID)
	if err != nil {
		return nil, err
	}

	return &wire.OutPoint{
		Hash:  *hash,
		Index: idx,
	}, nil
}

// getChannelEventUpdate converts an lnrpc.ChannelEventUpdate to the higher
// level ChannelEventUpdate.
func getChannelEventUpdate(rpcChannelEventUpdate *lnrpc.ChannelEventUpdate) (
	*ChannelEventUpdate, error) {

	result := &ChannelEventUpdate{}
	var err error

	switch rpcChannelEventUpdate.Type {
	case lnrpc.ChannelEventUpdate_PENDING_OPEN_CHANNEL:
		result.UpdateType = PendingOpenChannelUpdate
		channelPoint := rpcChannelEventUpdate.GetPendingOpenChannel()
		result.ChannelPoint, err = getOutPoint(
			channelPoint.Txid,
			channelPoint.OutputIndex,
		)
		if err != nil {
			return nil, err
		}

	case lnrpc.ChannelEventUpdate_OPEN_CHANNEL:
		result.UpdateType = OpenChannelUpdate
		channel := rpcChannelEventUpdate.GetOpenChannel()

		result.OpenedChannelInfo, err = newChannelInfo(channel)
		if err != nil {
			return nil, err
		}

	case lnrpc.ChannelEventUpdate_CLOSED_CHANNEL:
		result.UpdateType = ClosedChannelUpdate
		closeSummary := rpcChannelEventUpdate.GetClosedChannel()
		result.ClosedChannelInfo, err = getClosedChannel(closeSummary)
		if err != nil {
			return nil, err
		}

	case lnrpc.ChannelEventUpdate_ACTIVE_CHANNEL:
		result.UpdateType = ActiveChannelUpdate
		channelPoint := rpcChannelEventUpdate.GetActiveChannel()
		fundingTxID := channelPoint.FundingTxid.(*lnrpc.ChannelPoint_FundingTxidBytes)

		result.ChannelPoint, err = getOutPoint(
			fundingTxID.FundingTxidBytes,
			channelPoint.OutputIndex,
		)
		if err != nil {
			return nil, err
		}

	case lnrpc.ChannelEventUpdate_INACTIVE_CHANNEL:
		result.UpdateType = InactiveChannelUpdate
		channelPoint := rpcChannelEventUpdate.GetInactiveChannel()
		fundingTxID := channelPoint.FundingTxid.(*lnrpc.ChannelPoint_FundingTxidBytes)

		result.ChannelPoint, err = getOutPoint(
			fundingTxID.FundingTxidBytes,
			channelPoint.OutputIndex,
		)
		if err != nil {
			return nil, err
		}

	default:
		return nil, fmt.Errorf("unhandled update type: %v",
			rpcChannelEventUpdate.Type.String())
	}

	return result, nil
}

// SubscribeChannelEvents allows a client to subscribe to updates relevant to
// the state of channels. Events include new active channels, inactive channels,
// and closed channels.
func (s *lightningClient) SubscribeChannelEvents(ctx context.Context) (
	<-chan *ChannelEventUpdate, <-chan error, error) {

	updateStream, err := s.client.SubscribeChannelEvents(
		s.adminMac.WithMacaroonAuth(ctx),
		&lnrpc.ChannelEventSubscription{},
	)
	if err != nil {
		return nil, nil, err
	}

	updates := make(chan *ChannelEventUpdate)
	errChan := make(chan error, 1)

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()

		for {
			rpcUpdate, err := updateStream.Recv()
			if err != nil {
				errChan <- err
				return
			}

			update, err := getChannelEventUpdate(rpcUpdate)
			if err != nil {
				errChan <- err
				return
			}

			select {
			case updates <- update:
			case <-ctx.Done():
				return
			}
		}
	}()

	return updates, errChan, nil
}

// SubscribeChannelBackups allows a client to subscribe to the
// most up to date information concerning the state of all channel
// backups.
func (s *lightningClient) SubscribeChannelBackups(ctx context.Context) (
	<-chan lnrpc.ChanBackupSnapshot, <-chan error, error) {

	backupStream, err := s.client.SubscribeChannelBackups(
		s.adminMac.WithMacaroonAuth(ctx),
		&lnrpc.ChannelBackupSubscription{},
	)
	if err != nil {
		return nil, nil, err
	}

	backupUpdates := make(chan lnrpc.ChanBackupSnapshot)
	streamErr := make(chan error, 1)

	// Backups updates goroutine.
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		for {
			snapshot, err := backupStream.Recv()
			if err != nil {
				streamErr <- err
				return
			}

			select {
			case backupUpdates <- *snapshot:
			case <-ctx.Done():
				return
			}
		}
	}()

	return backupUpdates, streamErr, nil
}

// PaymentRequest represents a request for payment from a node.
type PaymentRequest struct {
	// Destination is the node that this payment request pays to .
	Destination route.Vertex

	// Hash is the payment hash associated with this payment
	Hash lntypes.Hash

	// Value is the value of the payment request in millisatoshis.
	Value lnwire.MilliSatoshi

	/// Timestamp of the payment request.
	Timestamp time.Time

	// Expiry is the time at which the payment request expires.
	Expiry time.Time

	// Description is a description attached to the payment request.
	Description string

	// PaymentAddress is the payment address associated with the invoice,
	// set if the receiver supports mpp.
	PaymentAddress [32]byte
}

// DecodePaymentRequest decodes a payment request.
func (s *lightningClient) DecodePaymentRequest(ctx context.Context,
	payReq string) (*PaymentRequest, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	resp, err := s.client.DecodePayReq(rpcCtx, &lnrpc.PayReqString{
		PayReq: payReq,
	})
	if err != nil {
		return nil, err
	}

	hash, err := lntypes.MakeHashFromStr(resp.PaymentHash)
	if err != nil {
		return nil, err
	}

	dest, err := route.NewVertexFromStr(resp.Destination)
	if err != nil {
		return nil, err
	}

	paymentReq := &PaymentRequest{
		Destination: dest,
		Hash:        hash,
		Value:       lnwire.MilliSatoshi(resp.NumMsat),
		Description: resp.Description,
	}

	copy(paymentReq.PaymentAddress[:], resp.PaymentAddr)

	// Set our timestamp values if they are non-zero, because unix zero is
	// different to a zero time struct.
	if resp.Timestamp != 0 {
		paymentReq.Timestamp = time.Unix(resp.Timestamp, 0)
	}

	if resp.Expiry != 0 {
		paymentReq.Expiry = time.Unix(resp.Expiry, 0)
	}

	return paymentReq, nil
}

// OpenChannel opens a channel to the peer provided with the amounts specified.
func (s *lightningClient) OpenChannel(ctx context.Context, peer route.Vertex,
	localSat, pushSat btcutil.Amount, private bool) (*wire.OutPoint, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	chanPoint, err := s.client.OpenChannelSync(
		rpcCtx, &lnrpc.OpenChannelRequest{
			NodePubkey:         peer[:],
			LocalFundingAmount: int64(localSat),
			PushSat:            int64(pushSat),
			Private:            private,
		},
	)
	if err != nil {
		return nil, err
	}

	var hash *chainhash.Hash
	switch h := chanPoint.FundingTxid.(type) {
	case *lnrpc.ChannelPoint_FundingTxidBytes:
		hash, err = chainhash.NewHash(h.FundingTxidBytes)

	case *lnrpc.ChannelPoint_FundingTxidStr:
		hash, err = chainhash.NewHashFromStr(h.FundingTxidStr)

	default:
		return nil, fmt.Errorf("unexpected outpoint type: %T",
			chanPoint.FundingTxid)
	}
	if err != nil {
		return nil, err
	}

	return &wire.OutPoint{
		Hash:  *hash,
		Index: chanPoint.OutputIndex,
	}, nil
}

// CloseChannelUpdate is an interface implemented by channel close updates.
type CloseChannelUpdate interface {
	// CloseTxid returns the closing txid of the channel.
	CloseTxid() chainhash.Hash
}

// PendingCloseUpdate indicates that our closing transaction has been broadcast.
type PendingCloseUpdate struct {
	// CloseTx is the closing transaction id.
	CloseTx chainhash.Hash
}

// CloseTxid returns the closing txid of the channel.
func (p *PendingCloseUpdate) CloseTxid() chainhash.Hash {
	return p.CloseTx
}

// ChannelClosedUpdate indicates that our channel close has confirmed on chain.
type ChannelClosedUpdate struct {
	// CloseTx is the closing transaction id.
	CloseTx chainhash.Hash
}

// CloseTxid returns the closing txid of the channel.
func (p *ChannelClosedUpdate) CloseTxid() chainhash.Hash {
	return p.CloseTx
}

// CloseChannel closes the channel provided, returning a channel that will send
// a stream of close updates, and an error channel which will receive errors if
// the channel close stream fails. This function starts a goroutine to consume
// updates from lnd, which can be cancelled by cancelling the context it was
// called with. If lnd finishes sending updates for the close (signalled by
// sending an EOF), we close the updates and error channel to signal that there
// are no more updates to be sent. It takes an optional delivery address that
// funds will be paid out to in the case where we cooperative close a channel
// that *does not* have an upfront shutdown addresss set.
func (s *lightningClient) CloseChannel(ctx context.Context,
	channel *wire.OutPoint, force bool, confTarget int32,
	deliveryAddr btcutil.Address) (chan CloseChannelUpdate, chan error,
	error) {

	var (
		rpcCtx  = s.adminMac.WithMacaroonAuth(ctx)
		addrStr string
	)

	if deliveryAddr != nil {
		addrStr = deliveryAddr.String()
	}

	stream, err := s.client.CloseChannel(rpcCtx, &lnrpc.CloseChannelRequest{
		ChannelPoint: &lnrpc.ChannelPoint{
			FundingTxid: &lnrpc.ChannelPoint_FundingTxidBytes{
				FundingTxidBytes: channel.Hash[:],
			},
			OutputIndex: channel.Index,
		},
		TargetConf:      confTarget,
		Force:           force,
		DeliveryAddress: addrStr,
	})
	if err != nil {
		return nil, nil, err
	}

	updateChan := make(chan CloseChannelUpdate)
	errChan := make(chan error)

	// sendErr is a helper which sends an error or exits because our caller
	// context was cancelled.
	sendErr := func(err error) {
		select {
		case errChan <- err:
		case <-ctx.Done():
		}
	}

	// sendUpdate is a helper which sends an update or exits because our
	// caller context was cancelled.
	sendUpdate := func(update CloseChannelUpdate) {
		select {
		case updateChan <- update:
		case <-ctx.Done():
		}
	}

	// Send updates into our channels from the stream. We will exit if the
	// server finishes sending updates, or if our context is cancelled.
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()

		for {
			// Wait to receive an update from lnd. If we receive
			// an EOF from the server, it has finished providing
			// updates so we close our update and error channels to
			// signal that it has finished sending updates. Our
			// stream will error if the caller cancels their context
			// so this call will not block us.
			resp, err := stream.Recv()
			if err == io.EOF {
				close(updateChan)
				close(errChan)
				return
			} else if err != nil {
				sendErr(err)
				return
			}

			switch update := resp.Update.(type) {
			case *lnrpc.CloseStatusUpdate_ClosePending:
				closingHash := update.ClosePending.Txid
				txid, err := chainhash.NewHash(closingHash)
				if err != nil {
					sendErr(err)
					return
				}

				closeUpdate := &PendingCloseUpdate{
					CloseTx: *txid,
				}
				sendUpdate(closeUpdate)

			case *lnrpc.CloseStatusUpdate_ChanClose:
				closingHash := update.ChanClose.ClosingTxid
				txid, err := chainhash.NewHash(closingHash)
				if err != nil {
					sendErr(err)
					return
				}

				// Create and send our update. We do not need
				// to kill our for loop here because we expect
				// the server to signal that the stream is
				// complete, which is handled above.
				closeUpdate := &ChannelClosedUpdate{
					CloseTx: *txid,
				}
				sendUpdate(closeUpdate)

			default:
				sendErr(fmt.Errorf("unknown channel close "+
					"update: %T", resp.Update))
				return
			}
		}
	}()

	return updateChan, errChan, nil
}

// PolicyUpdateRequest holds UpdateChanPolicy request data.
type PolicyUpdateRequest struct {
	// BaseFeeMsat is the base fee charged regardless of the number of
	// milli-satoshis sent.
	BaseFeeMsat int64

	// FeeRate is the effective fee rate in milli-satoshis. The precision of
	// this value goes up to 6 decimal places, so 1e-6.
	FeeRate float64

	// TimeLockDelta is the required timelock delta for HTLCs forwarded over
	// the channel.
	TimeLockDelta uint32

	// MaxHtlcMsat if set (non zero), holds the maximum HTLC size in
	// milli-satoshis. If unset, the maximum HTLC will be unchanged.
	MaxHtlcMsat uint64

	// MinHtlcMsat is the minimum HTLC size in milli-satoshis. Only applied
	// if MinHtlcMsatSpecified is true.
	MinHtlcMsat uint64

	// MinHtlcMsatSpecified if true, MinHtlcMsat is applied.
	MinHtlcMsatSpecified bool
}

// UpdateChanPolicy updates the channel policy for the passed chanPoint. If
// the chanPoint is nil, then the policy is applied for all existing channels.
func (s *lightningClient) UpdateChanPolicy(ctx context.Context,
	req PolicyUpdateRequest, chanPoint *wire.OutPoint) error {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	rpcReq := &lnrpc.PolicyUpdateRequest{
		BaseFeeMsat:   req.BaseFeeMsat,
		FeeRate:       req.FeeRate,
		TimeLockDelta: req.TimeLockDelta,
		MaxHtlcMsat:   req.MaxHtlcMsat,
	}

	if req.MinHtlcMsatSpecified {
		rpcReq.MinHtlcMsatSpecified = true
		rpcReq.MinHtlcMsat = req.MinHtlcMsat
	}

	if chanPoint != nil {
		rpcChanPoint := &lnrpc.ChannelPoint{
			FundingTxid: &lnrpc.ChannelPoint_FundingTxidBytes{
				FundingTxidBytes: chanPoint.Hash[:],
			},
			OutputIndex: chanPoint.Index,
		}
		rpcReq.Scope = &lnrpc.PolicyUpdateRequest_ChanPoint{
			ChanPoint: rpcChanPoint,
		}
	} else {
		rpcReq.Scope = &lnrpc.PolicyUpdateRequest_Global{
			Global: true,
		}
	}

	_, err := s.client.UpdateChannelPolicy(rpcCtx, rpcReq)
	return err
}

// RoutingPolicy holds the edge routing policy for a channel edge.
type RoutingPolicy struct {
	// TimeLockDelta is the required timelock delta for HTLCs forwarded
	// over the channel.
	TimeLockDelta uint32

	// MinHtlcMsat is the minimum HTLC size in milli-satoshis.
	MinHtlcMsat int64

	// MaxHtlcMsat the maximum HTLC size in milli-satoshis.
	MaxHtlcMsat uint64

	// FeeBaseMsat is the base fee charged regardless of the number of
	// milli-satoshis sent.
	FeeBaseMsat int64

	// FeeRateMilliMsat is the rate that the node will charge for
	// HTLCs for each millionth of a satoshi forwarded, in milli-satoshis.
	FeeRateMilliMsat int64

	// Disabled is true if the edge is disabled.
	Disabled bool

	// LastUpdate is the last update time for the edge policy.
	LastUpdate time.Time
}

// ChannelEdge holds the channel edge information and routing policies.
type ChannelEdge struct {
	// ChannelID is the unique channel ID for the channel. The first 3 bytes
	// are the block height, the next 3 the index within the block, and the
	// last 2 bytes are the output index for the channel.
	ChannelID uint64

	// ChannelPoint is the funding outpoint of the channel.
	ChannelPoint string

	// Capacity is the total channel capacity.
	Capacity btcutil.Amount

	// Node1 holds the vertex of the first node.
	Node1 route.Vertex

	// Node2 holds the vertex of the second node.
	Node2 route.Vertex

	// Node1Policy holds the edge policy for the Node1 -> Node2 edge.
	Node1Policy *RoutingPolicy

	// Node2Policy holds the edge policy for the Node2 -> Node1 edge.
	Node2Policy *RoutingPolicy
}

// getRoutingPolicy converts an lnrpc.RoutingPolicy to RoutingPolicy.
func getRoutingPolicy(policy *lnrpc.RoutingPolicy) *RoutingPolicy {
	if policy == nil {
		return nil
	}

	return &RoutingPolicy{
		TimeLockDelta:    policy.TimeLockDelta,
		MinHtlcMsat:      policy.MinHtlc,
		MaxHtlcMsat:      policy.MaxHtlcMsat,
		FeeBaseMsat:      policy.FeeBaseMsat,
		FeeRateMilliMsat: policy.FeeRateMilliMsat,
		Disabled:         policy.Disabled,
		LastUpdate:       time.Unix(int64(policy.LastUpdate), 0),
	}
}

// GetChanInfo returns the channel info for the passed channel, including the
// routing policy for both end.
func (s *lightningClient) GetChanInfo(ctx context.Context, channelID uint64) (
	*ChannelEdge, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	rpcRes, err := s.client.GetChanInfo(rpcCtx, &lnrpc.ChanInfoRequest{
		ChanId: channelID,
	})
	if err != nil {
		return nil, err
	}

	return newChannelEdge(rpcRes)
}

func newChannelEdge(rpcRes *lnrpc.ChannelEdge) (*ChannelEdge, error) {
	vertex1, err := route.NewVertexFromStr(rpcRes.Node1Pub)
	if err != nil {
		return nil, err
	}

	vertex2, err := route.NewVertexFromStr(rpcRes.Node2Pub)
	if err != nil {
		return nil, err
	}

	return &ChannelEdge{
		ChannelID:    rpcRes.ChannelId,
		ChannelPoint: rpcRes.ChanPoint,
		Capacity:     btcutil.Amount(rpcRes.Capacity),
		Node1:        vertex1,
		Node2:        vertex2,
		Node1Policy:  getRoutingPolicy(rpcRes.Node1Policy),
		Node2Policy:  getRoutingPolicy(rpcRes.Node2Policy),
	}, nil
}

// ListPeers gets a list of pubkeys of the peers we are currently connected to.
func (s *lightningClient) ListPeers(ctx context.Context) ([]Peer,
	error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	resp, err := s.client.ListPeers(rpcCtx, &lnrpc.ListPeersRequest{})
	if err != nil {
		return nil, err
	}

	peers := make([]Peer, len(resp.Peers))
	for i, peer := range resp.Peers {
		pk, err := route.NewVertexFromStr(peer.PubKey)
		if err != nil {
			return nil, err
		}

		pingTime := time.Microsecond * time.Duration(peer.PingTime)

		peers[i] = Peer{
			Pubkey:        pk,
			Address:       peer.Address,
			BytesSent:     peer.BytesSent,
			BytesReceived: peer.BytesRecv,
			Inbound:       peer.Inbound,
			PingTime:      pingTime,
			Sent:          btcutil.Amount(peer.SatSent),
			Received:      btcutil.Amount(peer.SatRecv),
		}
	}

	return peers, err
}

// Connect attempts to connect to a peer at the host specified.
func (s *lightningClient) Connect(ctx context.Context, peer route.Vertex,
	host string, permanent bool) error {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	_, err := s.client.ConnectPeer(rpcCtx, &lnrpc.ConnectPeerRequest{
		Addr: &lnrpc.LightningAddress{
			Pubkey: peer.String(),
			Host:   host,
		},
		Perm: permanent,
	})

	return err
}

// SendCoins sends the passed amount of (or all) coins to the passed address.
// Either amount or sendAll must be specified, while confTarget, satsPerByte are
// optional and may be set to zero in which case automatic conf target and fee
// will be used. Returns the tx id upon success.
func (s *lightningClient) SendCoins(ctx context.Context, addr btcutil.Address,
	amount btcutil.Amount, sendAll bool, confTarget int32,
	satsPerByte int64, label string) (string, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	req := &lnrpc.SendCoinsRequest{
		Addr:       addr.String(),
		Amount:     int64(amount),
		TargetConf: confTarget,
		SatPerByte: satsPerByte,
		SendAll:    sendAll,
		Label:      label,
	}

	resp, err := s.client.SendCoins(rpcCtx, req)
	if err != nil {
		return "", err
	}

	return resp.Txid, nil
}

// ChannelBalance returns a summary of our channel balances.
func (s *lightningClient) ChannelBalance(ctx context.Context) (*ChannelBalance,
	error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	resp, err := s.client.ChannelBalance(
		rpcCtx, &lnrpc.ChannelBalanceRequest{},
	)
	if err != nil {
		return nil, err
	}

	return &ChannelBalance{
		Balance:        btcutil.Amount(resp.Balance),            // nolint:staticcheck
		PendingBalance: btcutil.Amount(resp.PendingOpenBalance), // nolint:staticcheck
	}, nil
}

// GetNodeInfo returns node info for the pubkey provided.
func (s *lightningClient) GetNodeInfo(ctx context.Context, pubkey route.Vertex,
	includeChannels bool) (*NodeInfo, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	nodeInfo, err := s.client.GetNodeInfo(rpcCtx, &lnrpc.NodeInfoRequest{
		PubKey:          hex.EncodeToString(pubkey[:]),
		IncludeChannels: includeChannels,
	})
	if err != nil {
		return nil, err
	}

	node, err := newNode(nodeInfo.Node)
	if err != nil {
		return nil, err
	}

	info := &NodeInfo{
		Node:          node,
		ChannelCount:  int(nodeInfo.NumChannels),
		TotalCapacity: btcutil.Amount(nodeInfo.TotalCapacity),
		Channels:      make([]ChannelEdge, len(nodeInfo.Channels)),
	}

	for i, channel := range nodeInfo.Channels {
		edge, err := newChannelEdge(channel)
		if err != nil {
			return nil, err
		}

		info.Channels[i] = *edge
	}

	return info, nil
}

// DescribeGraph returns our view of the graph.
func (s *lightningClient) DescribeGraph(ctx context.Context,
	includeUnannounced bool) (*Graph, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	resp, err := s.client.DescribeGraph(rpcCtx, &lnrpc.ChannelGraphRequest{
		IncludeUnannounced: includeUnannounced,
	})
	if err != nil {
		return nil, err
	}

	graph := &Graph{
		Nodes: make([]Node, len(resp.Nodes)),
		Edges: make([]ChannelEdge, len(resp.Edges)),
	}

	for i, node := range resp.Nodes {
		nodeinfo, err := newNode(node)
		if err != nil {
			return nil, err
		}

		graph.Nodes[i] = *nodeinfo
	}

	for i, edge := range resp.Edges {
		chanEdge, err := newChannelEdge(edge)
		if err != nil {
			return nil, err
		}

		graph.Edges[i] = *chanEdge
	}

	return graph, nil
}

// SubscribeGraph allows a client to subscribe to gaph topology updates.
func (s *lightningClient) SubscribeGraph(ctx context.Context) (
	<-chan *GraphTopologyUpdate, <-chan error, error) {

	updateStream, err := s.client.SubscribeChannelGraph(
		s.adminMac.WithMacaroonAuth(ctx),
		&lnrpc.GraphTopologySubscription{},
	)
	if err != nil {
		return nil, nil, err
	}

	updates := make(chan *GraphTopologyUpdate)
	errChan := make(chan error, 1)

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()

		for {
			rpcUpdate, err := updateStream.Recv()
			if err != nil {
				errChan <- err
				return
			}

			update, err := getGraphTopologyUpdate(rpcUpdate)
			if err != nil {
				errChan <- err
				return
			}

			select {
			case updates <- update:
			case <-ctx.Done():
				return
			}
		}
	}()

	return updates, errChan, nil
}

// getGraphTopologyUpdate converts an lnrpc.GraphTopologyUpdate to the higher
// level GraphTopologyUpdate.
func getGraphTopologyUpdate(update *lnrpc.GraphTopologyUpdate) (
	*GraphTopologyUpdate, error) {

	result := &GraphTopologyUpdate{
		NodeUpdates: make([]NodeUpdate, len(update.NodeUpdates)),
		ChannelEdgeUpdates: make(
			[]ChannelEdgeUpdate, len(update.ChannelUpdates),
		),
		ChannelCloseUpdates: make(
			[]ChannelCloseUpdate, len(update.ClosedChans),
		),
	}

	for i, nodeUpdate := range update.NodeUpdates {
		identityKey, err := route.NewVertexFromStr(
			nodeUpdate.IdentityKey,
		)
		if err != nil {
			return nil, err
		}

		result.NodeUpdates[i] = NodeUpdate{
			Addresses:   nodeUpdate.Addresses, // nolint:staticcheck
			IdentityKey: identityKey,
			Features: make(
				[]lnwire.FeatureBit, 0,
				len(nodeUpdate.Features),
			),
			Alias: nodeUpdate.Alias,
			Color: nodeUpdate.Color,
		}

		for featureBit := range nodeUpdate.Features {
			result.NodeUpdates[i].Features = append(
				result.NodeUpdates[i].Features,
				lnwire.FeatureBit(featureBit),
			)
		}
	}

	for i, channelUpdate := range update.ChannelUpdates {
		channelPoint, err := getOutPoint(
			channelUpdate.ChanPoint.GetFundingTxidBytes(),
			channelUpdate.ChanPoint.OutputIndex,
		)
		if err != nil {
			return nil, err
		}

		advertisingNode, err := route.NewVertexFromStr(
			channelUpdate.AdvertisingNode,
		)
		if err != nil {
			return nil, err
		}

		connectingNode, err := route.NewVertexFromStr(
			channelUpdate.ConnectingNode,
		)
		if err != nil {
			return nil, err
		}

		result.ChannelEdgeUpdates[i] = ChannelEdgeUpdate{
			ChannelID: lnwire.NewShortChanIDFromInt(
				channelUpdate.ChanId,
			),
			ChannelPoint: *channelPoint,
			Capacity:     btcutil.Amount(channelUpdate.Capacity),
			// Note: routing policy is always set in lnd's
			// rpcserver.go and therefore should never be nil.
			RoutingPolicy: *getRoutingPolicy(
				channelUpdate.RoutingPolicy,
			),
			AdvertisingNode: advertisingNode,
			ConnectingNode:  connectingNode,
		}
	}

	for i, closedChan := range update.ClosedChans {
		channelPoint, err := getOutPoint(
			closedChan.ChanPoint.GetFundingTxidBytes(),
			closedChan.ChanPoint.OutputIndex,
		)
		if err != nil {
			return nil, err
		}

		result.ChannelCloseUpdates[i] = ChannelCloseUpdate{
			ChannelID: lnwire.NewShortChanIDFromInt(
				closedChan.ChanId,
			),
			ChannelPoint: *channelPoint,
			Capacity:     btcutil.Amount(closedChan.Capacity),
			ClosedHeight: closedChan.ClosedHeight,
		}
	}

	return result, nil
}

// NetworkInfo returns stats regarding our view of the network.
func (s *lightningClient) NetworkInfo(ctx context.Context) (*NetworkInfo,
	error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)

	resp, err := s.client.GetNetworkInfo(rpcCtx, &lnrpc.NetworkInfoRequest{})
	if err != nil {
		return nil, err
	}

	return &NetworkInfo{
		GraphDiameter:        resp.GraphDiameter,
		AvgOutDegree:         resp.AvgOutDegree,
		MaxOutDegree:         resp.MaxOutDegree,
		NumNodes:             resp.NumNodes,
		NumChannels:          resp.NumChannels,
		TotalNetworkCapacity: btcutil.Amount(resp.TotalNetworkCapacity),
		AvgChannelSize:       btcutil.Amount(resp.AvgChannelSize),
		MinChannelSize:       btcutil.Amount(resp.MinChannelSize),
		MaxChannelSize:       btcutil.Amount(resp.MaxChannelSize),
		MedianChannelSize:    btcutil.Amount(resp.MedianChannelSizeSat),
		NumZombieChans:       resp.NumZombieChans,
	}, nil
}

// InvoiceSubscriptionRequest holds the parameters to specify from which update
// to start streaming.
type InvoiceSubscriptionRequest struct {
	// If specified (non-zero), then we'll first start by sending out
	// notifications for all added indexes with an add_index greater than this
	// value. This allows callers to catch up on any events they missed while they
	// weren't connected to the streaming RPC.
	AddIndex uint64

	// If specified (non-zero), then we'll first start by sending out
	// notifications for all settled indexes with an settle_index greater than
	// this value. This allows callers to catch up on any events they missed while
	// they weren't connected to the streaming RPC.
	SettleIndex uint64
}

// SubscribeInvoices subscribes a client to updates of newly added/settled invoices.
func (s *lightningClient) SubscribeInvoices(ctx context.Context,
	req InvoiceSubscriptionRequest) (<-chan *Invoice, <-chan error, error) {

	rpcCtx := s.adminMac.WithMacaroonAuth(ctx)
	invoiceStream, err := s.client.SubscribeInvoices(
		rpcCtx, &lnrpc.InvoiceSubscription{
			AddIndex:    req.AddIndex,
			SettleIndex: req.SettleIndex,
		},
	)
	if err != nil {
		return nil, nil, err
	}

	invoiceUpdates := make(chan *Invoice)
	streamErr := make(chan error, 1)

	// New invoices updates goroutine.
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		defer close(streamErr)
		defer close(invoiceUpdates)

		for {
			rpcInvoice, err := invoiceStream.Recv()
			if err != nil {
				streamErr <- err
				return
			}
			invoice, err := unmarshalInvoice(rpcInvoice)
			if err != nil {
				streamErr <- err
				return
			}

			select {
			case invoiceUpdates <- invoice:
			case <-ctx.Done():
				return
			}
		}
	}()

	return invoiceUpdates, streamErr, nil
}

// MacaroonPermission is a struct that holds a permission entry, consisting of
// an entity and an action.
type MacaroonPermission struct {
	// Entity is the entity a permission grants access to.
	Entity string

	// Action is the action that is granted by a permission.
	Action string
}

// String returns the human readable representation of a permission.
func (p *MacaroonPermission) String() string {
	return fmt.Sprintf("%s:%s", p.Entity, p.Action)
}

// ListPermissions returns a list of all RPC method URIs and the macaroon
// permissions that are required to access them.
func (s *lightningClient) ListPermissions(
	ctx context.Context) (map[string][]MacaroonPermission, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	perms, err := s.client.ListPermissions(
		rpcCtx, &lnrpc.ListPermissionsRequest{},
	)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]MacaroonPermission)
	for methodURI, list := range perms.MethodPermissions {
		permissions := list.Permissions
		result[methodURI] = make([]MacaroonPermission, len(permissions))
		for idx, entry := range permissions {
			result[methodURI][idx] = MacaroonPermission{
				Entity: entry.Entity,
				Action: entry.Action,
			}
		}
	}

	return result, nil
}

// AcceptorFunction is the signature used for functions passed to our channel
// acceptor.
type AcceptorFunction func(context.Context,
	*AcceptorRequest) (*AcceptorResponse, error)

// ChannelAcceptor create a channel acceptor using the accept function passed
// in. The timeout provided will be used to timeout the passed accept closure
// when it exceeds the amount of time we allow. Note that this amount should be
// strictly less than lnd's chanacceptor timeout parameter.
func (s *lightningClient) ChannelAcceptor(ctx context.Context,
	timeout time.Duration, accept AcceptorFunction) (chan error, error) {

	acceptStream, err := s.client.ChannelAcceptor(
		s.adminMac.WithMacaroonAuth(ctx),
	)
	if err != nil {
		return nil, err
	}

	errChan := make(chan error, 1)

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()

		for {
			select {
			case <-ctx.Done():
				errChan <- ctx.Err()
				return

			default:
			}

			request, err := acceptStream.Recv()
			if err != nil {
				errChan <- fmt.Errorf("channel acceptor "+
					"receive failed: %v", err)

				return
			}

			accReq, err := newAcceptorRequest(request)
			if err != nil {
				errChan <- fmt.Errorf("invalid request sent "+
					"from lnd: %v", err)

				return
			}

			// Create a child context for our accept function which
			// will timeout after the timeout period provided.
			ctxt, cancel := context.WithTimeout(ctx, timeout)

			resp, err := accept(ctxt, accReq)
			cancel()
			if err != nil {
				errChan <- fmt.Errorf("accept function "+
					"failed: %v", err)

				return
			}

			rpcResp := &lnrpc.ChannelAcceptResponse{
				Accept:          resp.Accept,
				PendingChanId:   request.PendingChanId,
				Error:           resp.Error,
				UpfrontShutdown: resp.UpfrontShutdown,
				CsvDelay:        resp.CsvDelay,
				ReserveSat:      resp.ReserveSat,
				InFlightMaxMsat: resp.InFlightMaxMsat,
				MaxHtlcCount:    resp.MaxHtlcCount,
				MinHtlcIn:       resp.MinHtlcIn,
				MinAcceptDepth:  resp.MinAcceptDepth,
			}

			if err := acceptStream.Send(rpcResp); err != nil {
				errChan <- fmt.Errorf("channel acceptor send "+
					"failed: %v", err)

				return
			}
		}
	}()

	return errChan, nil
}

// unmarshallHop unmarshalls a single hop.
func unmarshallHop(rpcHop *lnrpc.Hop) (*Hop, error) {
	var pubKey *route.Vertex

	if rpcHop.PubKey != "" {
		vertex, err := route.NewVertexFromStr(rpcHop.PubKey)
		if err != nil {
			return nil, err
		}
		pubKey = &vertex
	}

	return &Hop{
		ChannelID:        rpcHop.ChanId,
		Expiry:           rpcHop.Expiry,
		AmtToForwardMsat: lnwire.MilliSatoshi(rpcHop.AmtToForwardMsat),
		FeeMsat:          lnwire.MilliSatoshi(rpcHop.FeeMsat),
		PubKey:           pubKey,
	}, nil
}

// QueryRoutes can query LND to return a route (with fees) between two vertices.
func (s *lightningClient) QueryRoutes(ctx context.Context,
	req QueryRoutesRequest) (*QueryRoutesResponse, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.adminMac.WithMacaroonAuth(rpcCtx)
	rpcReq := &lnrpc.QueryRoutesRequest{
		PubKey:  req.PubKey.String(),
		AmtMsat: int64(req.AmtMsat),
		FeeLimit: &lnrpc.FeeLimit{
			Limit: &lnrpc.FeeLimit_FixedMsat{
				FixedMsat: int64(req.FeeLimitMsat),
			},
		},
		UseMissionControl: req.UseMissionControl,
	}

	if req.Source != nil {
		rpcReq.SourcePubKey = req.Source.String()
	}

	if req.MaxCltv != nil {
		rpcReq.CltvLimit = *req.MaxCltv
	}

	if req.LastHop != nil {
		rpcReq.LastHopPubkey = req.LastHop[:]
	}

	var err error
	rpcReq.RouteHints, err = marshallRouteHints(req.RouteHints)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.QueryRoutes(rpcCtx, rpcReq)
	if err != nil {
		return nil, err
	}

	if len(resp.Routes) == 0 {
		return nil, ErrNoRouteFound
	}

	route := resp.Routes[0]
	hops := make([]*Hop, len(route.Hops))
	for i, rpcHop := range route.Hops {
		hops[i], err = unmarshallHop(rpcHop)
		if err != nil {
			return nil, err
		}
	}

	return &QueryRoutesResponse{
		TotalTimeLock: route.TotalTimeLock,
		Hops:          hops,
		TotalFeesMsat: lnwire.MilliSatoshi(route.TotalFeesMsat),
		TotalAmtMsat:  lnwire.MilliSatoshi(route.TotalAmtMsat),
	}, nil
}
