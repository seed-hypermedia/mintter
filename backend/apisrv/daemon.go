package apisrv

import (
	"context"
	daemon "mintter/backend/api/daemon/v1alpha"
	"mintter/backend/core"
	"mintter/backend/core/registration"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Daemon implements the com.mintter.accounts.v1alpha gRPC API.
type Daemon struct {
	reg       *registration.Service
	startTime time.Time
}

// NewDaemon creates a new Daemon API implementation.
func NewDaemon(reg *registration.Service) (*Daemon, error) {
	return &Daemon{
		reg:       reg,
		startTime: time.Now(),
	}, nil
}

// GenSeed creates a new account seed.
func (srv *Daemon) GenSeed(ctx context.Context, req *daemon.GenSeedRequest) (*daemon.GenSeedResponse, error) {
	words, err := core.NewMnemonic(req.AezeedPassphrase)
	if err != nil {
		return nil, err
	}

	resp := &daemon.GenSeedResponse{
		Mnemonic: words,
	}

	return resp, nil
}

// Register previously created seed within the running node.
func (srv *Daemon) Register(ctx context.Context, req *daemon.RegisterRequest) (*daemon.RegisterResponse, error) {
	acc, err := core.NewAccountFromMnemonic(req.Mnemonic, req.AezeedPassphrase)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to decode account from mnemonic: %v", err)
	}

	if err := srv.reg.RegisterAccount(ctx, acc); err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "failed to register account: %v", err)
	}

	return &daemon.RegisterResponse{
		AccountId: acc.ID.String(),
	}, nil
}

// GetInfo about the running daemon.
func (srv *Daemon) GetInfo(ctx context.Context, in *daemon.GetInfoRequest) (*daemon.Info, error) {
	aid, err := srv.reg.AccountID(ctx)
	if err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "failed to retrieve account: %v", err)
	}

	did := srv.reg.DeviceID()

	return &daemon.Info{
		AccountId: aid.String(),
		PeerId:    did.String(),
		StartTime: timestamppb.New(srv.startTime),
	}, nil
}
