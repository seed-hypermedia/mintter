package lndclient

import (
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"time"

	"github.com/btcsuite/btcutil"
	"github.com/lightningnetwork/lnd/channeldb"
	"github.com/lightningnetwork/lnd/lnrpc"
	"github.com/lightningnetwork/lnd/lnrpc/routerrpc"
	"github.com/lightningnetwork/lnd/lntypes"
	"github.com/lightningnetwork/lnd/lnwire"
	"github.com/lightningnetwork/lnd/record"
	"github.com/lightningnetwork/lnd/routing/route"
	"github.com/lightningnetwork/lnd/zpay32"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// RouterClient exposes payment functionality.
type RouterClient interface {
	// SendPayment attempts to route a payment to the final destination. The
	// call returns a payment update stream and an error stream.
	SendPayment(ctx context.Context, request SendPaymentRequest) (
		chan PaymentStatus, chan error, error)

	// TrackPayment picks up a previously started payment and returns a
	// payment update stream and an error stream.
	TrackPayment(ctx context.Context, hash lntypes.Hash) (
		chan PaymentStatus, chan error, error)

	// EstimateRouteFee uses the channel router's internal state to estimate
	// the routing cost of the given amount to the destination node.
	EstimateRouteFee(ctx context.Context, dest route.Vertex,
		amt btcutil.Amount) (lnwire.MilliSatoshi, error)

	// SubscribeHtlcEvents subscribes to a stream of htlc events from the
	// router.
	SubscribeHtlcEvents(ctx context.Context) (<-chan *routerrpc.HtlcEvent,
		<-chan error, error)
}

// PaymentStatus describe the state of a payment.
type PaymentStatus struct {
	State lnrpc.Payment_PaymentStatus

	// FailureReason is the reason why the payment failed. Only set when
	// State is Failed.
	FailureReason lnrpc.PaymentFailureReason

	Preimage      lntypes.Preimage
	Fee           lnwire.MilliSatoshi
	Value         lnwire.MilliSatoshi
	InFlightAmt   lnwire.MilliSatoshi
	InFlightHtlcs int

	Htlcs []*HtlcAttempt
}

func (p PaymentStatus) String() string {
	text := fmt.Sprintf("state=%v", p.State)
	if p.State == lnrpc.Payment_IN_FLIGHT {
		text += fmt.Sprintf(", inflight_htlcs=%v, inflight_amt=%v",
			p.InFlightHtlcs, p.InFlightAmt)
	}

	return text
}

// HtlcAttempt provides information about a htlc sent as part of a payment.
type HtlcAttempt struct {
	// The status of the HTLC.
	Status lnrpc.HTLCAttempt_HTLCStatus

	// The route taken by this HTLC.
	Route *lnrpc.Route

	// AttemptTime is the time that the htlc was dispatched.
	AttemptTime time.Time

	// ResolveTime is the time the htlc was settled or failed.
	ResolveTime time.Time

	// Failure will be non-nil if the htlc failed, and provides more
	// information about the payment failure.
	Failure *HtlcFailure

	// Preimage is the preimage that was used to settle the payment.
	Preimage lntypes.Preimage
}

// AmountInFlight returns the amount in flight for this htlc attempt that
// contributes to paying the final recipient, if any.
func (h *HtlcAttempt) AmountInFlight() lnwire.MilliSatoshi {
	if h.Status != lnrpc.HTLCAttempt_IN_FLIGHT {
		return 0
	}

	if h.Route == nil || h.Route.Hops == nil {
		return 0
	}

	lastHop := h.Route.Hops[len(h.Route.Hops)-1]
	return lnwire.MilliSatoshi(lastHop.AmtToForwardMsat)
}

// String returns a string representation of a htlc attempt.
func (h *HtlcAttempt) String() string {
	return fmt.Sprintf("Htlc attempt status: %v, attempted at: %v, "+
		"resolved at: %v, preimage: %v", h.Status, h.AttemptTime,
		h.ResolveTime, h.Preimage)
}

// NewHtlcAttempt creates a htlc attempt from its rpc counterpart.
func NewHtlcAttempt(rpcAttempt *lnrpc.HTLCAttempt) (*HtlcAttempt, error) {
	attempt := &HtlcAttempt{
		Status: rpcAttempt.Status,
		Route:  rpcAttempt.Route,
	}

	if rpcAttempt.AttemptTimeNs != 0 {
		attempt.AttemptTime = time.Unix(0, rpcAttempt.AttemptTimeNs)
	}

	if rpcAttempt.ResolveTimeNs != 0 {
		attempt.ResolveTime = time.Unix(0, rpcAttempt.ResolveTimeNs)
	}

	if rpcAttempt.Failure != nil {
		attempt.Failure = NewHtlcFailure(rpcAttempt.Failure)
	}

	if rpcAttempt.Preimage != nil {
		var err error
		attempt.Preimage, err = lntypes.MakePreimage(
			rpcAttempt.Preimage,
		)
		if err != nil {
			return nil, err
		}
	}

	return attempt, nil
}

// HtlcFailure provides information about a htlc attempt failure.
type HtlcFailure struct {
	// Code is the failure code as defined in the lightning spec.
	Code lnrpc.Failure_FailureCode

	// FailureSourceIndex is the position in the path of the intermediate
	// or final node that generated the failure message. A value of 0
	// indicates that the failure occurred at the sender.
	FailureSourceIndex uint32
}

// String returns a string representation of a htlc failure.
func (h *HtlcFailure) String() string {
	return fmt.Sprintf("Htlc failure code: %v, index: %v", h.Code,
		h.FailureSourceIndex)
}

// NewHtlcFailure creates a htlc failure from its rpc counterpart.
func NewHtlcFailure(rpcFailure *lnrpc.Failure) *HtlcFailure {
	if rpcFailure == nil {
		return nil
	}

	return &HtlcFailure{
		Code:               rpcFailure.Code,
		FailureSourceIndex: rpcFailure.FailureSourceIndex,
	}
}

// SendPaymentRequest defines the payment parameters for a new payment.
type SendPaymentRequest struct {
	// Invoice is an encoded payment request. The individual payment
	// parameters Target, Amount, PaymentHash, FinalCLTVDelta and RouteHints
	// are only processed when the Invoice field is empty.
	Invoice string

	// MaxFee is the fee limit for this payment.
	MaxFee btcutil.Amount

	// MaxFeeMsat is the fee limit for this payment in millisatoshis.
	// MaxFee and MaxFeeMsat are mutually exclusive.
	MaxFeeMsat lnwire.MilliSatoshi

	// MaxCltv is the maximum timelock for this payment. If nil, there is no
	// maximum.
	MaxCltv *int32

	// OutgoingChanIds is a restriction on the set of possible outgoing
	// channels. If nil or empty, there is no restriction.
	OutgoingChanIds []uint64

	// Timeout is the payment loop timeout. After this time, no new payment
	// attempts will be started.
	Timeout time.Duration

	// Target is the node in which the payment should be routed towards.
	Target route.Vertex

	// Amount is the value of the payment to send through the network in
	// satoshis.
	Amount btcutil.Amount

	// PaymentHash is the r-hash value to use within the HTLC extended to
	// the first hop.
	PaymentHash *lntypes.Hash

	// FinalCLTVDelta is the CTLV expiry delta to use for the _final_ hop
	// in the route. This means that the final hop will have a CLTV delta
	// of at least: currentHeight + FinalCLTVDelta.
	FinalCLTVDelta uint16

	// RouteHints represents the different routing hints that can be used to
	// assist a payment in reaching its destination successfully. These
	// hints will act as intermediate hops along the route.
	//
	// NOTE: This is optional unless required by the payment. When providing
	// multiple routes, ensure the hop hints within each route are chained
	// together and sorted in forward order in order to reach the
	// destination successfully.
	RouteHints [][]zpay32.HopHint

	// LastHopPubkey is the pubkey of the last hop of the route taken
	// for this payment. If empty, any hop may be used.
	LastHopPubkey *route.Vertex

	// MaxParts is the maximum number of partial payments that may be used
	// to complete the full amount.
	MaxParts uint32

	// KeySend is set to true if the tlv payload will include the preimage.
	KeySend bool

	// CustomRecords holds the custom TLV records that will be added to the
	// payment.
	CustomRecords map[uint64][]byte

	// If set, circular payments to self are permitted.
	AllowSelfPayment bool
}

// routerClient is a wrapper around the generated routerrpc proxy.
type routerClient struct {
	client       routerrpc.RouterClient
	routerKitMac serializedMacaroon
	timeout      time.Duration
}

func newRouterClient(conn grpc.ClientConnInterface,
	routerKitMac serializedMacaroon, timeout time.Duration) *routerClient {

	return &routerClient{
		client:       routerrpc.NewRouterClient(conn),
		routerKitMac: routerKitMac,
		timeout:      timeout,
	}
}

// SendPayment attempts to route a payment to the final destination. The call
// returns a payment update stream and an error stream.
func (r *routerClient) SendPayment(ctx context.Context,
	request SendPaymentRequest) (chan PaymentStatus, chan error, error) {

	rpcCtx := r.routerKitMac.WithMacaroonAuth(ctx)
	rpcReq := &routerrpc.SendPaymentRequest{
		FeeLimitSat:      int64(request.MaxFee),
		FeeLimitMsat:     int64(request.MaxFeeMsat),
		PaymentRequest:   request.Invoice,
		TimeoutSeconds:   int32(request.Timeout.Seconds()),
		MaxParts:         request.MaxParts,
		OutgoingChanIds:  request.OutgoingChanIds,
		AllowSelfPayment: request.AllowSelfPayment,
	}
	if request.MaxCltv != nil {
		rpcReq.CltvLimit = *request.MaxCltv
	}

	if request.LastHopPubkey != nil {
		rpcReq.LastHopPubkey = request.LastHopPubkey[:]
	}

	rpcReq.DestCustomRecords = request.CustomRecords

	if request.KeySend {
		if request.PaymentHash != nil {
			return nil, nil, fmt.Errorf(
				"keysend payment must not include a preset payment hash")
		}

		var preimage lntypes.Preimage
		if _, err := rand.Read(preimage[:]); err != nil {
			return nil, nil, err
		}

		if rpcReq.DestCustomRecords == nil {
			rpcReq.DestCustomRecords = make(map[uint64][]byte)
		}

		// Override the payment hash.
		rpcReq.DestCustomRecords[record.KeySendType] = preimage[:]
		hash := preimage.Hash()
		request.PaymentHash = &hash
	}

	// Only if there is no payment request set, we will parse the individual
	// payment parameters.
	if request.Invoice == "" {
		rpcReq.Dest = request.Target[:]
		rpcReq.Amt = int64(request.Amount)
		rpcReq.PaymentHash = request.PaymentHash[:]
		rpcReq.FinalCltvDelta = int32(request.FinalCLTVDelta)

		routeHints, err := marshallRouteHints(request.RouteHints)
		if err != nil {
			return nil, nil, err
		}
		rpcReq.RouteHints = routeHints
	}

	stream, err := r.client.SendPaymentV2(rpcCtx, rpcReq)
	if err != nil {
		return nil, nil, err
	}

	return r.trackPayment(ctx, stream)
}

// TrackPayment picks up a previously started payment and returns a payment
// update stream and an error stream.
func (r *routerClient) TrackPayment(ctx context.Context,
	hash lntypes.Hash) (chan PaymentStatus, chan error, error) {

	ctx = r.routerKitMac.WithMacaroonAuth(ctx)
	stream, err := r.client.TrackPaymentV2(
		ctx, &routerrpc.TrackPaymentRequest{
			PaymentHash: hash[:],
		},
	)
	if err != nil {
		return nil, nil, err
	}

	return r.trackPayment(ctx, stream)
}

// trackPayment takes an update stream from either a SendPayment or a
// TrackPayment rpc call and converts it into distinct update and error streams.
// Once the payment reaches a final state, the status and error channels will
// be closed to signal that we are finished sending into them.
func (r *routerClient) trackPayment(ctx context.Context,
	stream routerrpc.Router_TrackPaymentV2Client) (chan PaymentStatus,
	chan error, error) {

	statusChan := make(chan PaymentStatus)
	errorChan := make(chan error, 1)
	go func() {
		for {
			payment, err := stream.Recv()
			if err != nil {
				// If we get an EOF error, the payment has
				// reached a final state and the server is
				// finished sending us updates. We close both
				// channels to signal that we are done sending
				// values on them and return.
				if err == io.EOF {
					close(statusChan)
					close(errorChan)
					return
				}

				switch status.Convert(err).Code() {

				// NotFound is only expected as a response to
				// TrackPayment.
				case codes.NotFound:
					err = channeldb.ErrPaymentNotInitiated

				// NotFound is only expected as a response to
				// SendPayment.
				case codes.AlreadyExists:
					err = channeldb.ErrAlreadyPaid
				}

				errorChan <- err
				return
			}

			status, err := unmarshallPaymentStatus(payment)
			if err != nil {
				errorChan <- err
				return
			}

			select {
			case statusChan <- *status:
			case <-ctx.Done():
				return
			}
		}
	}()

	return statusChan, errorChan, nil
}

// EstimateRouteFee uses the channel router's internal state to estimate the
// routing cost of the given amount to the destination node.
func (r *routerClient) EstimateRouteFee(ctx context.Context, dest route.Vertex,
	amt btcutil.Amount) (lnwire.MilliSatoshi, error) {

	rpcCtx := r.routerKitMac.WithMacaroonAuth(ctx)
	rpcReq := &routerrpc.RouteFeeRequest{
		Dest:   dest[:],
		AmtSat: int64(amt),
	}

	rpcRes, err := r.client.EstimateRouteFee(rpcCtx, rpcReq)
	if err != nil {
		return 0, err
	}

	return lnwire.MilliSatoshi(rpcRes.RoutingFeeMsat), nil
}

// unmarshallPaymentStatus converts an rpc status update to the PaymentStatus
// type that is used throughout the application.
func unmarshallPaymentStatus(rpcPayment *lnrpc.Payment) (
	*PaymentStatus, error) {

	status := PaymentStatus{
		State: rpcPayment.Status,
		Htlcs: make([]*HtlcAttempt, len(rpcPayment.Htlcs)),
	}

	switch status.State {
	case lnrpc.Payment_SUCCEEDED:
		preimage, err := lntypes.MakePreimageFromStr(
			rpcPayment.PaymentPreimage,
		)
		if err != nil {
			return nil, err
		}
		status.Preimage = preimage
		status.Fee = lnwire.MilliSatoshi(rpcPayment.FeeMsat)
		status.Value = lnwire.MilliSatoshi(rpcPayment.ValueMsat)

	case lnrpc.Payment_FAILED:
		status.FailureReason = rpcPayment.FailureReason
	}

	for i, htlc := range rpcPayment.Htlcs {
		attempt, err := NewHtlcAttempt(htlc)
		if err != nil {
			return nil, err
		}
		status.Htlcs[i] = attempt

		if htlc.Status != lnrpc.HTLCAttempt_IN_FLIGHT {
			continue
		}

		status.InFlightHtlcs++
		status.InFlightAmt += attempt.AmountInFlight()
	}

	return &status, nil
}

// marshallRouteHints marshalls a list of route hints.
func marshallRouteHints(routeHints [][]zpay32.HopHint) (
	[]*lnrpc.RouteHint, error) {

	rpcRouteHints := make([]*lnrpc.RouteHint, 0, len(routeHints))
	for _, routeHint := range routeHints {
		rpcRouteHint := make(
			[]*lnrpc.HopHint, 0, len(routeHint),
		)
		for _, hint := range routeHint {
			rpcHint, err := marshallHopHint(hint)
			if err != nil {
				return nil, err
			}

			rpcRouteHint = append(rpcRouteHint, rpcHint)
		}
		rpcRouteHints = append(rpcRouteHints, &lnrpc.RouteHint{
			HopHints: rpcRouteHint,
		})
	}

	return rpcRouteHints, nil
}

// marshallHopHint marshalls a single hop hint.
func marshallHopHint(hint zpay32.HopHint) (*lnrpc.HopHint, error) {
	nodeID, err := route.NewVertexFromBytes(
		hint.NodeID.SerializeCompressed(),
	)
	if err != nil {
		return nil, err
	}

	return &lnrpc.HopHint{
		ChanId:                    hint.ChannelID,
		CltvExpiryDelta:           uint32(hint.CLTVExpiryDelta),
		FeeBaseMsat:               hint.FeeBaseMSat,
		FeeProportionalMillionths: hint.FeeProportionalMillionths,
		NodeId:                    nodeID.String(),
	}, nil
}

// SubscribeHtlcEvents subscribes to a stream of htlc events from the router.
func (r *routerClient) SubscribeHtlcEvents(ctx context.Context) (
	<-chan *routerrpc.HtlcEvent, <-chan error, error) {

	stream, err := r.client.SubscribeHtlcEvents(
		r.routerKitMac.WithMacaroonAuth(ctx),
		&routerrpc.SubscribeHtlcEventsRequest{},
	)
	if err != nil {
		return nil, nil, err
	}

	// Buffer our error channel by 1 so we don't need to worry about the
	// client not listening or shutting down when we send an error.
	errChan := make(chan error, 1)
	htlcChan := make(chan *routerrpc.HtlcEvent)

	go func() {
		// Close our error and htlc channel when this loop exits to
		// signal that we will no longer be sending results.
		defer close(errChan)
		defer close(htlcChan)

		for {
			htlc, err := stream.Recv()
			if err != nil {
				errChan <- err
				return
			}

			// Send the update to into our events channel, or exit
			// if our context has been cancelled.
			select {
			case htlcChan <- htlc:

			case <-ctx.Done():
				errChan <- ctx.Err()
				return
			}
		}
	}()

	return htlcChan, errChan, nil
}
