package daemon

import (
	context "context"
	"mintter/backend/core"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	"mintter/backend/vcs/mttacc"
	"mintter/backend/vcs/vcsdb"
	sync "sync"
	"time"

	"google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

// Repo is a subset of the [ondisk.OnDisk] used by this server.
type Repo interface {
	Device() core.KeyPair
	Account() (core.PublicKey, error)
	CommitAccount(core.PublicKey) error
}

// Wallet is a subset of the wallet service used by this server.
type Wallet interface {
	ConfigureMintterLNDHub(context.Context, core.KeyPair) error
}

// Server implements the Daemon gRPC API.
type Server struct {
	vcs       *vcsdb.DB
	repo      Repo
	startTime time.Time
	wallet    Wallet

	forceSyncFunc func() error

	mu sync.Mutex // we only want one register request at a time.
}

// NewServer creates a new Server.
func NewServer(r Repo, vcs *vcsdb.DB, w Wallet, syncFunc func() error) *Server {
	return &Server{
		vcs:           vcs,
		repo:          r,
		startTime:     time.Now(),
		wallet:        w,
		forceSyncFunc: syncFunc,
	}
}

// GenMnemonic returns a set of mnemonic words based on bip39 schema. Word count should be 12 or 15 or 18 or 21 or 24.
func (srv *Server) GenMnemonic(ctx context.Context, req *daemon.GenMnemonicRequest) (*daemon.GenMnemonicResponse, error) {
	words, err := core.NewMnemonic(req.MnemonicsLength)
	if err != nil {
		return nil, err
	}

	return &daemon.GenMnemonicResponse{Mnemonic: words}, nil
}

// Register implement the corresponding gRPC method.
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

	acc, err := core.AccountFromMnemonic(req.Mnemonic, req.Passphrase)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to create account: %v", err)
	}

	if err := srv.RegisterAccount(ctx, acc); err != nil {
		return nil, err
	}

	return &daemon.RegisterResponse{
		AccountId: acc.CID().String(),
	}, nil
}

// RegisterAccount performs registration given an existing account key pair.
func (srv *Server) RegisterAccount(ctx context.Context, acc core.KeyPair) error {
	if err := srv.repo.CommitAccount(acc.PublicKey); err != nil {
		return err
	}

	conn, release, err := srv.vcs.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	if err := conn.WithTx(true, func() error {
		_, err := mttacc.Register(ctx, acc, srv.repo.Device(), conn)
		return err
	}); err != nil {
		return err
	}

	if err := srv.wallet.ConfigureMintterLNDHub(ctx, acc); err != nil {
		return err
	}

	return nil
}

// GetInfo implements the corresponding gRPC method.
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

// ForceSync implements the corresponding gRPC method.
func (srv *Server) ForceSync(ctx context.Context, in *daemon.ForceSyncRequest) (*emptypb.Empty, error) {
	if srv.forceSyncFunc == nil {
		return &emptypb.Empty{}, status.Error(codes.FailedPrecondition, "force sync function is not set")
	}

	if err := srv.forceSyncFunc(); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}
