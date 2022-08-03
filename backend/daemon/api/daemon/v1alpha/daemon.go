package daemon

import (
	context "context"
	"encoding/hex"
	"fmt"
	"mintter/backend/core"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	"mintter/backend/lndhub"
	"mintter/backend/lndhub/lndhubsql"
	"mintter/backend/vcs"
	"mintter/backend/vcs/vcstypes"
	"strings"
	sync "sync"
	"time"

	"github.com/tyler-smith/go-bip39"
	"google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

type (
	DaemonServer = daemon.DaemonServer
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

	forceSyncFunc func() error

	mu sync.Mutex // we only want one register request at a time.
}

func NewServer(r Repo, vcs *vcs.SQLite, syncFunc func() error) *Server {
	return &Server{
		vcs:           vcs,
		repo:          r,
		startTime:     time.Now(),
		forceSyncFunc: syncFunc,
	}
}

func (srv *Server) GenSeed(ctx context.Context, req *daemon.GenSeedRequest) (*daemon.GenSeedResponse, error) {
	words, err := core.NewMnemonic(req.Bip39Nummnemonics)
	if err != nil {
		return nil, err
	}

	_, err = bip39.NewSeedWithErrorChecking(strings.Join(words, " "), req.Bip39Passphrase)
	if err != nil {
		return nil, fmt.Errorf("unable to get a seed from mnemonics: %w", err)
	}

	// TODO GenSeed should return the seed instead of mnemonics. The seed is derived from the mnemonics and the password
	resp := &daemon.GenSeedResponse{
		Mnemonic: words, // Should be the above seed
	}

	return resp, nil
}

func (srv *Server) Register(ctx context.Context, req *daemon.RegisterRequest) (*daemon.RegisterResponse, error) {
	srv.mu.Lock()
	defer srv.mu.Unlock()

	// Check if account already exist
	{
		_, err := srv.repo.Account()
		if err == nil {
			return nil, status.Errorf(codes.AlreadyExists, "account is already registered")
		}
	}

	acc, err := core.AccountFromMnemonic(req.Mnemonic, req.Bip39Passphrase)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to create account: %v", err)
	}

	if err := srv.repo.CommitAccount(acc.PublicKey); err != nil {
		return nil, err
	}

	if _, err := vcstypes.Register(ctx, acc, srv.repo.Device(), srv.vcs); err != nil {
		return nil, err
	}

	signature, err := acc.Sign([]byte(lndhub.SigninMessage))
	if err != nil {
		return nil, err
	}
	conn := srv.vcs.DB().Get(context.Background())
	defer srv.vcs.DB().Put(conn)
	if err := lndhubsql.SetLoginSignature(conn, hex.EncodeToString(signature)); err != nil {
		return nil, fmt.Errorf("Could not store lndhub signature: %w", err)
	}

	return &daemon.RegisterResponse{
		AccountId: acc.CID().String(),
	}, nil
}

func (srv *Server) GetInfo(ctx context.Context, in *daemon.GetInfoRequest) (*daemon.Info, error) {
	pk, err := srv.repo.Account()
	if err != nil {
		return nil, status.Error(codes.FailedPrecondition, err.Error())
	}

	resp := &daemon.Info{
		AccountId: pk.CID().String(),
		PeerId:    srv.repo.Device().CID().String(),
		StartTime: timestamppb.New(srv.startTime),
	}

	return resp, nil
}

func (srv *Server) ForceSync(ctx context.Context, in *daemon.ForceSyncRequest) (*emptypb.Empty, error) {
	if srv.forceSyncFunc == nil {
		return &emptypb.Empty{}, status.Error(codes.FailedPrecondition, "force sync function is not set")
	}

	if err := srv.forceSyncFunc(); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}
