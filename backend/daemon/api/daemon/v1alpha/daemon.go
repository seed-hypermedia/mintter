// Package daemon assembles everything to boot the seed-daemon program. It's like main, but made a separate package
// to be importable and testable by other packages, because package main can't be imported.
package daemon

import (
	context "context"
	"fmt"
	"seed/backend/core"
	daemon "seed/backend/genproto/daemon/v1alpha"
	"seed/backend/hyper"
	sync "sync"
	"time"

	"github.com/ipfs/go-cid"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
	emptypb "google.golang.org/protobuf/types/known/emptypb"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

// Storage is a subset of the [ondisk.OnDisk] used by this server.
type Storage interface {
	Device() core.KeyPair
	KeyStore() core.KeyStore
}

// Wallet is a subset of the wallet service used by this server.
type Wallet interface {
	ConfigureSeedLNDHub(context.Context, core.KeyPair) error
}

// Server implements the Daemon gRPC API.
type Server struct {
	store     Storage
	blobs     *hyper.Storage
	startTime time.Time
	wallet    Wallet

	forceSyncFunc func() error

	mu sync.Mutex // we only want one register request at a time.
}

// NewServer creates a new Server.
func NewServer(store Storage, blobs *hyper.Storage, w Wallet, syncFunc func() error) *Server {
	return &Server{
		store:     store,
		blobs:     blobs,
		startTime: time.Now(),
		// wallet:        w, // TODO(hm24): Put the wallet back.
		forceSyncFunc: syncFunc,
	}
}

// RegisterServer registers the server with the gRPC server.
func (srv *Server) RegisterServer(rpc grpc.ServiceRegistrar) {
	daemon.RegisterDaemonServer(rpc, srv)
}

// GenMnemonic returns a set of mnemonic words based on bip39 schema. Word count should be 12 or 15 or 18 or 21 or 24.
func (srv *Server) GenMnemonic(_ context.Context, req *daemon.GenMnemonicRequest) (*daemon.GenMnemonicResponse, error) {
	if req.WordCount == 0 {
		req.WordCount = 12
	}

	words, err := core.NewBIP39Mnemonic(uint32(req.WordCount))
	if err != nil {
		return nil, err
	}

	return &daemon.GenMnemonicResponse{Mnemonic: words}, nil
}

// RegisterKey implement the corresponding gRPC method.
func (srv *Server) RegisterKey(ctx context.Context, req *daemon.RegisterKeyRequest) (*daemon.NamedKey, error) {
	// We only want one concurrent register request to happen.
	srv.mu.Lock()
	defer srv.mu.Unlock()

	if req.Name == "" {
		return nil, status.Errorf(codes.InvalidArgument, "name is required for a key")
	}

	acc, err := core.AccountFromMnemonic(req.Mnemonic, req.Passphrase)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "failed to create account: %v", err)
	}

	if err := srv.RegisterAccount(ctx, req.Name, acc); err != nil {
		return nil, err
	}

	return &daemon.NamedKey{
		PublicKey: acc.Principal().String(),
		Name:      req.Name,
		AccountId: "hm://a/" + acc.Principal().String(),
	}, nil
}

// DeleteKey implement the corresponding gRPC method.
func (srv *Server) DeleteKey(ctx context.Context, req *daemon.DeleteKeyRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, srv.store.KeyStore().DeleteKey(ctx, req.Name)
}

// ListKeys implement the corresponding gRPC method.
func (srv *Server) ListKeys(ctx context.Context, req *daemon.ListKeysRequest) (*daemon.ListKeysResponse, error) {
	//var ret []*daemon.NamedKey
	out := &daemon.ListKeysResponse{}
	keys, err := srv.store.KeyStore().ListKeys(ctx)
	if err != nil {
		return out, err
	}
	out.Keys = make([]*daemon.NamedKey, 0, len(keys))
	for _, key := range keys {
		out.Keys = append(out.Keys, &daemon.NamedKey{
			Name:      key.Name,
			PublicKey: key.PublicKey.String(),
			AccountId: "hm://a/" + key.PublicKey.String(),
		})
	}
	return out, nil
}

// UpdateKey implement the corresponding gRPC method.
func (srv *Server) UpdateKey(ctx context.Context, req *daemon.UpdateKeyRequest) (*daemon.NamedKey, error) {
	if err := srv.store.KeyStore().ChangeKeyName(ctx, req.CurrentName, req.NewName); err != nil {
		return &daemon.NamedKey{}, err
	}

	kp, err := srv.store.KeyStore().GetKey(ctx, req.NewName)
	if err != nil {
		return &daemon.NamedKey{}, err
	}

	return &daemon.NamedKey{
		PublicKey: kp.PublicKey.String(),
		Name:      req.NewName,
		AccountId: "hm://a/" + kp.PublicKey.String(),
	}, nil
}

func (srv *Server) RegisterAccount(ctx context.Context, name string, kp core.KeyPair) error {
	if err := srv.store.KeyStore().StoreKey(ctx, name, kp); err != nil {
		return err
	}

	// TODO(hm24): Get rid of this Register function entirely.
	// if _, err := Register(ctx, srv.blobs, kp, kp.PublicKey, time.Now().UTC()); err != nil {
	// 	return err
	// }

	// TODO(hm24): we don't need to do this here since now we have the keys always accessible, unless the user
	// chooses not to store the keys... Do this at the time of creating the seed wallet (new method not insert
	// wallet which is an external wallet)
	if srv.wallet != nil {
		if err := srv.wallet.ConfigureSeedLNDHub(ctx, kp); err != nil {
			return fmt.Errorf("failed to configure wallet when registering: %w", err)
		}
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

	if err = bs.SetAccountTrust(ctx, account.Principal()); err != nil {
		return blob.CID, fmt.Errorf("could not set own account to trusted: " + err.Error())
	}
	return blob.CID, nil
}

// GetInfo implements the corresponding gRPC method.
func (srv *Server) GetInfo(context.Context, *daemon.GetInfoRequest) (*daemon.Info, error) {
	resp := &daemon.Info{
		PeerId:    srv.store.Device().PeerID().String(),
		StartTime: timestamppb.New(srv.startTime),
		State:     daemon.State_ACTIVE, // TODO(hm24): handle the state correctly, providing feedback for database migrations.
	}

	return resp, nil
}

// ForceSync implements the corresponding gRPC method.
func (srv *Server) ForceSync(context.Context, *daemon.ForceSyncRequest) (*emptypb.Empty, error) {
	if srv.forceSyncFunc == nil {
		return &emptypb.Empty{}, status.Error(codes.FailedPrecondition, "force sync function is not set")
	}

	if err := srv.forceSyncFunc(); err != nil {
		return &emptypb.Empty{}, err
	}

	return &emptypb.Empty{}, nil
}
