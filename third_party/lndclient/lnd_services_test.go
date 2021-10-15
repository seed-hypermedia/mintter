package lndclient

import (
	"context"
	"errors"
	"testing"

	"google.golang.org/grpc"

	"github.com/lightningnetwork/lnd/lnrpc"

	"github.com/lightningnetwork/lnd/lnrpc/verrpc"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type mockVersioner struct {
	version *verrpc.Version
	err     error
}

func (m *mockVersioner) GetVersion(_ context.Context) (*verrpc.Version, error) {
	return m.version, m.err
}

// TestCheckVersionCompatibility makes sure the correct error is returned if an
// old lnd is connected that doesn't implement the version RPC, has an older
// version or if an lnd with not all subservers enabled is connected.
func TestCheckVersionCompatibility(t *testing.T) {
	// Make sure a version check against a node that doesn't implement the
	// version RPC always fails.
	unimplemented := &mockVersioner{
		err: status.Error(codes.Unimplemented, "missing"),
	}
	_, err := checkVersionCompatibility(unimplemented, &verrpc.Version{
		AppMajor: 0,
		AppMinor: 10,
		AppPatch: 0,
	})
	if err != ErrVersionCheckNotImplemented {
		t.Fatalf("unexpected error. got '%v' wanted '%v'", err,
			ErrVersionCheckNotImplemented)
	}

	// Next, make sure an older version than what we want is rejected.
	oldVersion := &mockVersioner{
		version: &verrpc.Version{
			AppMajor: 0,
			AppMinor: 10,
			AppPatch: 0,
		},
	}
	_, err = checkVersionCompatibility(oldVersion, &verrpc.Version{
		AppMajor: 0,
		AppMinor: 11,
		AppPatch: 0,
	})
	if err != ErrVersionIncompatible {
		t.Fatalf("unexpected error. got '%v' wanted '%v'", err,
			ErrVersionIncompatible)
	}

	// Finally, make sure we also get the correct error when trying to run
	// against an lnd that doesn't have all required build tags enabled.
	buildTagsMissing := &mockVersioner{
		version: &verrpc.Version{
			AppMajor:  0,
			AppMinor:  10,
			AppPatch:  0,
			BuildTags: []string{"dev", "lntest", "btcd", "signrpc"},
		},
	}
	_, err = checkVersionCompatibility(buildTagsMissing, &verrpc.Version{
		AppMajor:  0,
		AppMinor:  10,
		AppPatch:  0,
		BuildTags: []string{"signrpc", "walletrpc"},
	})
	if err != ErrBuildTagsMissing {
		t.Fatalf("unexpected error. got '%v' wanted '%v'", err,
			ErrVersionIncompatible)
	}
}

// TestLndVersionCheckComparison makes sure the version check comparison works
// correctly and considers all three version levels.
func TestLndVersionCheckComparison(t *testing.T) {
	actual := &verrpc.Version{
		AppMajor: 1,
		AppMinor: 2,
		AppPatch: 3,
	}
	testCases := []struct {
		name        string
		expectMajor uint32
		expectMinor uint32
		expectPatch uint32
		actual      *verrpc.Version
		expectedErr error
	}{
		{
			name:        "no expectation",
			expectMajor: 0,
			expectMinor: 0,
			expectPatch: 0,
			actual:      actual,
			expectedErr: nil,
		},
		{
			name:        "expect exact same version",
			expectMajor: 1,
			expectMinor: 2,
			expectPatch: 3,
			actual:      actual,
			expectedErr: nil,
		},
		{
			name:        "ignore patch if minor is bigger",
			expectMajor: 12,
			expectMinor: 9,
			expectPatch: 14,
			actual: &verrpc.Version{
				AppMajor: 12,
				AppMinor: 22,
				AppPatch: 0,
			},
			expectedErr: nil,
		},
		{
			name:        "all fields different",
			expectMajor: 3,
			expectMinor: 2,
			expectPatch: 1,
			actual:      actual,
			expectedErr: ErrVersionIncompatible,
		},
		{
			name:        "patch version different",
			expectMajor: 1,
			expectMinor: 2,
			expectPatch: 4,
			actual:      actual,
			expectedErr: ErrVersionIncompatible,
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			err := assertVersionCompatible(
				tc.actual, &verrpc.Version{
					AppMajor: tc.expectMajor,
					AppMinor: tc.expectMinor,
					AppPatch: tc.expectPatch,
				},
			)
			if err != tc.expectedErr {
				t.Fatalf("unexpected error, got '%v' wanted "+
					"'%v'", err, tc.expectedErr)
			}
		})
	}
}

// lockLNDMock is a mock lightning client which mocks calls to getinfo to
// determine the unlocked state of lnd.
type lockLNDMock struct {
	lnrpc.LightningClient
	StateClient
	callCount int
	errors    []error
	stateErr  error
	states    []WalletState
}

// GetInfo mocks a call to getinfo, using our call count to get the error for
// this call as the index in our pre-set error slice.
func (l *lockLNDMock) GetInfo(ctx context.Context, _ *lnrpc.GetInfoRequest,
	_ ...grpc.CallOption) (*lnrpc.GetInfoResponse, error) {

	// Our actual call would use ctx, so add a panic to reflect that.
	if ctx == nil {
		panic("nil context for getinfo")
	}

	err := l.errors[l.callCount]

	l.callCount++

	return &lnrpc.GetInfoResponse{
		Chains: []*lnrpc.Chain{{}},
	}, err
}

func (l *lockLNDMock) SubscribeState(context.Context) (chan WalletState,
	chan error, error) {

	if l.stateErr != nil {
		return nil, nil, l.stateErr
	}

	stateChan := make(chan WalletState, 1)
	errChan := make(chan error, 1)

	go func() {
		for _, state := range l.states {
			stateChan <- state

			// If this is the final state, no more states will be
			// sent to us and we can close the subscription.
			if state == WalletStateRPCActive {
				close(stateChan)
				close(errChan)

				return
			}
		}
	}()

	return stateChan, errChan, nil
}

func newLockLndMock(errors []error, stateErr error,
	states []WalletState) *lockLNDMock {

	return &lockLNDMock{
		errors:   errors,
		stateErr: stateErr,
		states:   states,
	}
}

// TestGetLndInfo tests our logic for querying lnd for information in the case
// where we wait for the wallet to unlock, and when we fail fast.
func TestGetLndInfo(t *testing.T) {
	var (
		ctx       = context.Background()
		nonNilErr = errors.New("failed")
		unlockErr = status.Error(codes.Unimplemented, "unimpl")
	)

	tests := []struct {
		name         string
		context      context.Context
		waitUnlocked bool
		stateErr     error
		states       []WalletState
		errors       []error
		expected     error
	}{
		{
			name:    "no error",
			context: ctx,
			errors:  []error{nil},
			states: []WalletState{
				WalletStateWaitingToStart,
				WalletStateLocked,
				WalletStateUnlocked,
				WalletStateRPCActive,
			},
			expected: nil,
		},
		{
			name: "nil context",
			errors: []error{
				nil,
			},
			states: []WalletState{
				WalletStateRPCActive,
			},
			expected: nil,
		},
		{
			name:     "do not wait for unlock",
			errors:   []error{unlockErr},
			expected: unlockErr,
		},
		{
			name:         "wait for unlock",
			waitUnlocked: true,
			errors:       []error{nil},
			states: []WalletState{
				WalletStateRPCActive,
			},
			expected: nil,
		},
		{
			name:         "lnd down",
			waitUnlocked: true,
			stateErr:     context.DeadlineExceeded,
			expected:     context.DeadlineExceeded,
		},
		{
			name:         "other error",
			waitUnlocked: true,
			errors:       []error{nonNilErr},
			states: []WalletState{
				WalletStateRPCActive,
			},
			expected: nonNilErr,
		},
	}

	for _, test := range tests {
		test := test

		t.Run(test.name, func(t *testing.T) {
			mock := newLockLndMock(
				test.errors, test.stateErr, test.states,
			)

			_, err := getLndInfo(
				test.context, mock, "readonlymac", mock,
				test.waitUnlocked,
			)

			if test.expected == nil {
				require.NoError(t, err)
			} else {
				require.Error(t, err)

				// Error might be wrapped.
				require.True(t, errors.Is(err, test.expected))
			}
		})
	}
}
