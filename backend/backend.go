package backend

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ipfs/go-cid"
	"github.com/libp2p/go-libp2p-core/peer"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/multiformats/go-multiaddr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	accounts "mintter/api/go/accounts/v1alpha"
)

// backend is the glue between major pieces of Mintter application.
type backend struct {
	// log  *zap.Logger
	repo    *repo
	patches *patchStore
	p2p     *p2pNode
	ready   chan struct{}

	startTime time.Time

	// Paranoia Mode: we don't want any concurrent registration calls happening.
	registerMu sync.Mutex
}

func newBackend(r *repo, store *patchStore, p2p *p2pNode) *backend {
	srv := &backend{
		repo:      r,
		patches:   store,
		startTime: time.Now().UTC(),
		ready:     make(chan struct{}),
		p2p:       p2p,
	}

	return srv
}

// Start instruct the backend to wait until account is ready to use
// and then start the P2P services. Start blocks and returns
// when the process is finished or ctx is canceled.
func (srv *backend) Start(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-srv.repo.Ready():
		if err := srv.p2p.Start(ctx); err != nil {
			return fmt.Errorf("failed to start p2p node: %w", err)
		}
	}

	// TODO: provide account on the DHT.

	// acc, err := srv.repo.Account()
	// if err != nil {
	// 	panic(err)
	// }
	// blk, err := blocks.NewBlockWithCid(nil, cid.Cid(acc.id))
	// if err != nil {
	// 	panic(err)
	// }
	// if err := srv.p2p.BlockService.AddBlock(blk); err != nil {
	// 	panic(err)
	// }

	// fmt.Println("account provided", err)

	close(srv.ready)

	return nil
}

// Register an account on this node using provided mnemonic.
func (srv *backend) Register(ctx context.Context, m aezeed.Mnemonic, passphraze string) (AccountID, error) {
	srv.registerMu.Lock()
	defer srv.registerMu.Unlock()

	if len(m) != aezeed.NummnemonicWords {
		return AccountID{}, fmt.Errorf("mnemonic must be exactly %d words, got %d", aezeed.NummnemonicWords, len(m))
	}

	select {
	case <-srv.repo.Ready():
		return AccountID{}, status.Errorf(codes.FailedPrecondition, "account is already initialized")
	default:
		acc, err := NewAccountFromMnemonic(m, string(passphraze))
		if err != nil {
			return AccountID{}, fmt.Errorf("failed to create account from mnemonic: %w", err)
		}

		aid := cid.Cid(acc.id)

		state, err := srv.patches.LoadState(ctx, aid)
		if err != nil {
			return AccountID{}, fmt.Errorf("failed to load account state: %w", err)
		}

		// TODO: this can be non-empty if we have created the account previously,
		// but failed to write the account file and close the account ready channel.
		// Thus we have to check here if the incoming account is the same - if not fail,
		// and if it is the same - skip creating the patch, and just store the account file.
		// Since it's a very weird situation, we don't have time to deal with that right now.
		if !state.IsEmpty() {
			panic("WEIRD BUG: remove your Mintter state folder and start over again")
		}

		binding, err := InviteDevice(acc, srv.repo.Device())
		if err != nil {
			return AccountID{}, fmt.Errorf("failed to create account binding: %w", err)
		}

		if err := srv.register(ctx, state, binding); err != nil {
			return AccountID{}, fmt.Errorf("failed to register account: %w", err)
		}

		if err := srv.repo.CommitAccount(acc); err != nil {
			return AccountID{}, fmt.Errorf("failed to write account file: %w", err)
		}

		// TODO: Here we would need to publish our patch on the PubSub, so that people can discover our new device,
		// but since there would be actually no one to receive the message, it doesn't really make much sense.
		// Plus it complicates a lot the whole process. There's a bit of a chicken-and-egg problem: we don't know
		// which topic to publish to until we create the account, and account gets created just when we publish the patch.
		// We leave it as is right now, but let's see if we need to do something with it in the future.

		return AccountID(aid), nil
	}
}

func (srv *backend) register(ctx context.Context, state *state, binding AccountBinding) error {
	sp, err := state.NewProtoPatch(binding.Account, srv.repo.Device().priv, &accounts.DeviceRegistered{
		Proof: binding.AccountProof,
	})
	if err != nil {
		return fmt.Errorf("failed to create a patch: %w", err)
	}

	if err := srv.patches.AddPatch(ctx, sp); err != nil {
		return fmt.Errorf("failed to add patch: %w", err)
	}

	return nil
}

func (srv *backend) UpdateProfile(ctx context.Context, in *accounts.Profile) (*accounts.Account, error) {
	acc, err := srv.repo.Account()
	if err != nil {
		return nil, err
	}

	state, account, err := srv.GetAccountState(ctx, acc.id)
	if err != nil {
		return nil, err
	}

	merged := &accounts.Profile{}
	if account.Profile == nil {
		account.Profile = &accounts.Profile{}
	}
	proto.Merge(merged, account.Profile)
	proto.Merge(merged, in)

	diff := diffProto(account.Profile, merged)
	if diff == nil {
		return account, nil
	}

	evt := &accounts.ProfileUpdated{
		Profile: diff.(*accounts.Profile),
	}

	account.Profile = merged

	sp, err := state.NewProtoPatch(cid.Cid(acc.id), srv.repo.Device().priv, evt)
	if err != nil {
		return nil, fmt.Errorf("failed to produce patch to update profile: %w", err)
	}

	if err := srv.patches.AddPatch(ctx, sp); err != nil {
		return nil, fmt.Errorf("failed to store patch: %w", err)
	}

	return account, nil
}

func (srv *backend) GetAccountState(ctx context.Context, id AccountID) (*state, *accounts.Account, error) {
	state, err := srv.patches.LoadState(ctx, cid.Cid(id))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to load state: %w", err)
	}

	if state.size == 0 {
		return nil, nil, fmt.Errorf("no information about account %s", id)
	}

	aid := state.obj.String()

	acc := &accounts.Account{}
	for state.Next() {
		sp := state.Item()
		msg, err := sp.ProtoBody()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal proto body: %w", err)
		}

		switch data := msg.(type) {
		case *accounts.DeviceRegistered:
			if acc.Id == "" {
				acc.Id = aid
			}

			if acc.Id != aid {
				return nil, nil, fmt.Errorf("profile update from unrelated author")
			}

			// TODO: verify proof
			_ = data.Proof
			if acc.Devices == nil {
				acc.Devices = make(map[string]*accounts.Device)
			}
			d, err := srv.getDevice(sp.peer, sp)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to find device %s: %w", sp.peer, err)
			}
			acc.Devices[d.PeerId] = d
		case *accounts.ProfileUpdated:
			if acc.Profile == nil {
				acc.Profile = data.Profile
			} else {
				proto.Merge(acc.Profile, data.Profile)
			}
		}
	}

	return state, acc, nil
}

func (srv *backend) getDevice(c cid.Cid, sp signedPatch) (*accounts.Device, error) {
	return &accounts.Device{
		PeerId:       c.String(),
		RegisterTime: timestamppb.New(sp.CreateTime),
	}, nil
}

func (srv *backend) GetDeviceAddrs(d DeviceID) ([]multiaddr.Multiaddr, error) {
	ipfs, err := srv.readyIPFS()
	if err != nil {
		return nil, err
	}

	info := ipfs.libp2p.Peerstore().PeerInfo(d.PeerID())
	return peer.AddrInfoToP2pAddrs(&info)
}

func (srv *backend) GetAccountForDevice(d DeviceID) (AccountID, error) {
	// TODO: implement proper mapping for all known device IDs.
	if !srv.repo.device.ID().Equals(d) {
		return AccountID{}, nil
	}

	acc, err := srv.repo.Account()
	if err != nil {
		return AccountID{}, status.Errorf(codes.FailedPrecondition, "failed to get own account: %v", err)
	}

	return acc.id, nil
}

func (srv *backend) readyIPFS() (*p2pNode, error) {
	select {
	case <-srv.ready:
		return srv.p2p, nil
	default:
		return nil, fmt.Errorf("p2p node is not ready yet")
	}
}
