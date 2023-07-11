package daemon

import (
	context "context"
	"fmt"
	"mintter/backend/core"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	"mintter/backend/hyper"
	"mintter/backend/pkg/future"
	sync "sync"
	"time"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

// Repo is a subset of the [ondisk.OnDisk] used by this server.
type Repo interface {
	Device() core.KeyPair
	Identity() *future.ReadOnly[core.Identity]
	CommitAccount(core.PublicKey) error
}

// Wallet is a subset of the wallet service used by this server.
type Wallet interface {
	ConfigureMintterLNDHub(context.Context, core.KeyPair) error
}

// Server implements the Daemon gRPC API.
type Server struct {
	blobs     *hyper.Storage
	repo      Repo
	startTime time.Time
	wallet    Wallet

	forceSyncFunc func() error

	mu sync.Mutex // we only want one register request at a time.
}

// NewServer creates a new Server.
func NewServer(r Repo, blobs *hyper.Storage, w Wallet, syncFunc func() error) *Server {
	return &Server{
		blobs:         blobs,
		repo:          r,
		startTime:     time.Now(),
		wallet:        w,
		forceSyncFunc: syncFunc,
	}
}

// GenMnemonic returns a set of mnemonic words based on bip39 schema. Word count should be 12 or 15 or 18 or 21 or 24.
func (srv *Server) GenMnemonic(_ context.Context, req *daemon.GenMnemonicRequest) (*daemon.GenMnemonicResponse, error) {
	words, err := core.NewBIP39Mnemonic(req.MnemonicsLength)
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
		if _, ok := srv.repo.Identity().Get(); ok {
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
		AccountId: acc.String(),
	}, nil
}

// RegisterAccount performs registration given an existing account key pair.
func (srv *Server) RegisterAccount(ctx context.Context, acc core.KeyPair) error {
	if err := srv.repo.CommitAccount(acc.PublicKey); err != nil {
		return err
	}

	_, err := Register(ctx, srv.blobs, acc, srv.repo.Device().PublicKey, time.Now().UTC())
	if err != nil {
		return err
	}

	if err := srv.wallet.ConfigureMintterLNDHub(ctx, acc); err != nil {
		return fmt.Errorf("failed to configure wallet when registering: %w", err)
	}

	return nil
}

// Register creates key delegation from account to device.
func Register(ctx context.Context, bs *hyper.Storage, account core.KeyPair, device core.PublicKey, at time.Time) (cid.Cid, error) {
	kd, err := hyper.NewKeyDelegation(account, device, time.Now().UTC())
	if err != nil {
		return cid.Undef, err
	}

	blob := kd.Blob()

	if err := bs.SaveBlob(ctx, blob); err != nil {
		return cid.Undef, err
	}

	return blob.CID, nil
}

// GetInfo implements the corresponding gRPC method.
func (srv *Server) GetInfo(context.Context, *daemon.GetInfoRequest) (*daemon.Info, error) {
	me, ok := srv.repo.Identity().Get()
	if !ok {
		return nil, status.Error(codes.FailedPrecondition, "account is not initialized yet")
	}

	resp := &daemon.Info{
		AccountId: me.Account().Principal().String(),
		DeviceId:  srv.repo.Device().PeerID().String(),
		StartTime: timestamppb.New(srv.startTime),
	}

	return resp, nil
}

// ForceSync implements the corresponding gRPC method.
func (srv *Server) ForceSync(context.Context, *daemon.ForceSyncRequest) (*emptypb.Empty, error) {
	if srv.forceSyncFunc == nil {
		return &emptypb.Empty{}, status.Error(codes.FailedPrecondition, "force sync function is not set")
	}

	if err := srv.forceSyncFunc(); err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}
