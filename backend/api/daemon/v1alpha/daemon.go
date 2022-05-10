package daemon

import (
	context "context"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	sync "sync"
	"time"

	"github.com/lightningnetwork/lnd/aezeed"
	"google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

type Repo interface {
	Device() core.KeyPair
	Account() (core.PublicKey, error)
	CommitAccount(core.PublicKey) error
}

type Server struct {
	vcs       *vcs.SQLite
	repo      Repo
	startTime time.Time

	forceSyncFunc func()

	mu sync.Mutex // we only want one register request at a time.
}

func NewServer(r Repo, vcs *vcs.SQLite, syncFunc func()) *Server {
	return &Server{
		vcs:           vcs,
		repo:          r,
		startTime:     time.Now(),
		forceSyncFunc: syncFunc,
	}
}

func (srv *Server) GenSeed(ctx context.Context, req *GenSeedRequest) (*GenSeedResponse, error) {
	words, err := core.NewMnemonic(req.AezeedPassphrase)
	if err != nil {
		return nil, err
	}

	resp := &GenSeedResponse{
		Mnemonic: words,
	}

	return resp, nil
}

func (srv *Server) Register(ctx context.Context, req *RegisterRequest) (*RegisterResponse, error) {
	srv.mu.Lock()
	defer srv.mu.Unlock()

	// Check if account already exist
	{
		_, err := srv.repo.Account()
		if err == nil {
			return nil, status.Errorf(codes.AlreadyExists, "account is already registered")
		}
	}

	var m aezeed.Mnemonic
	copy(m[:], req.Mnemonic)

	acc, err := core.AccountFromMnemonic(m, req.AezeedPassphrase)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to create account: %v", err)
	}

	if err := srv.repo.CommitAccount(acc.PublicKey); err != nil {
		return nil, err
	}

	if _, err := vcstypes.Register(ctx, acc, srv.repo.Device(), srv.vcs); err != nil {
		return nil, err
	}

	return &RegisterResponse{
		AccountId: acc.CID().String(),
	}, nil
}

func (srv *Server) GetInfo(ctx context.Context, in *GetInfoRequest) (*Info, error) {
	pk, err := srv.repo.Account()
	if err != nil {
		return nil, status.Error(codes.FailedPrecondition, err.Error())
	}

	resp := &Info{
		AccountId: pk.CID().String(),
		PeerId:    srv.repo.Device().CID().String(),
		StartTime: timestamppb.New(srv.startTime),
	}

	return resp, nil
}

func (srv *Server) ForceSync(ctx context.Context, in *ForceSyncRequest) (*emptypb.Empty, error) {
	go srv.forceSyncFunc()

	return &emptypb.Empty{}, nil
}
