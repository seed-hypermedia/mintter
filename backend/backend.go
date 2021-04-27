package backend

import (
	"context"
	"fmt"
	"sync"

	"github.com/ipfs/go-cid"
	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/multiformats/go-multiaddr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	accounts "mintter/api/go/accounts/v1alpha"
	daemon "mintter/api/go/daemon/v1alpha"
)

type lazyP2PNode func() (*p2pNode, error)

func makeLazyP2PNode(n *p2pNode, ready <-chan struct{}) lazyP2PNode {
	return func() (*p2pNode, error) {
		select {
		case <-ready:
			return n, nil
		default:
			return nil, fmt.Errorf("initialize the account first")
		}
	}
}

type backend struct {
	// log  *zap.Logger
	repo  *repo
	p2p   lazyP2PNode
	store *patchStore

	// Paranoia Mode: we want only one BindAccount call at the time.
	bindAccountMu sync.Mutex

	// List of API services
	accounts *accountsServer
}

func newBackend(r *repo, p2p *p2pNode, store *patchStore) *backend {
	// load the account state.
	// If there's some - init p2p stuff.
	srv := &backend{
		repo:  r,
		p2p:   makeLazyP2PNode(p2p, r.Ready()),
		store: store,

		accounts: &accountsServer{
			repo:    r,
			p2p:     makeLazyP2PNode(p2p, r.Ready()),
			patches: store,
		},
	}

	return srv
}

func (srv *backend) GenSeed(ctx context.Context, req *daemon.GenSeedRequest) (*daemon.GenSeedResponse, error) {
	words, err := NewMnemonic(req.AezeedPassphrase)
	if err != nil {
		return nil, err
	}

	resp := &daemon.GenSeedResponse{
		Mnemonic: words,
	}

	return resp, nil
}

func (srv *backend) Register(ctx context.Context, req *daemon.RegisterRequest) (*daemon.RegisterResponse, error) {
	srv.bindAccountMu.Lock()
	defer srv.bindAccountMu.Unlock()

	var m aezeed.Mnemonic

	if len(req.Mnemonic) != aezeed.NummnemonicWords {
		return nil, fmt.Errorf("mnemonic must be exactly %d words, got %d", aezeed.NummnemonicWords, len(req.Mnemonic))
	}

	select {
	case <-srv.repo.Ready():
		return nil, status.Errorf(codes.FailedPrecondition, "account is already initialized")
	default:
		copy(m[:], req.Mnemonic)

		acc, err := NewAccountFromMnemonic(m, string(req.AezeedPassphrase))
		if err != nil {
			return nil, err
		}

		aid := cid.Cid(acc.id)

		state, err := srv.store.LoadState(ctx, aid)
		if err != nil {
			return nil, err
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
			return nil, fmt.Errorf("failed to create account binding: %w", err)
		}

		if err := srv.register(ctx, state, binding); err != nil {
			return nil, fmt.Errorf("failed to register account: %w", err)
		}

		if err := srv.repo.CommitAccount(acc.pub); err != nil {
			return nil, fmt.Errorf("failed to write account file: %w", err)
		}

		// TODO: Here we would need to public our patch on the PubSub, so that people can discover our new device,
		// but since there would be actually no one to receive the message, it doesn't really make much sense.
		// Plus it complicates a lot the whole process. There's a bit of a chicken-and-egg problem: we don't know
		// which topic to publish to until we create the account, and account gets created just when we publish the patch.
		// We leave it as is right now, but let's see if we need to do something with it in the future.

		return &daemon.RegisterResponse{
			AccountId: aid.String(),
		}, nil
	}
}

func (srv *backend) register(ctx context.Context, state *state, binding AccountBinding) error {
	sp, err := state.NewProtoPatch(binding.Account, srv.repo.Device().priv, &accounts.DeviceRegistered{
		Proof: binding.AccountProof,
	})
	if err != nil {
		return fmt.Errorf("failed to create a patch: %w", err)
	}

	if err := srv.store.AddPatch(ctx, sp); err != nil {
		return fmt.Errorf("failed to add patch: %w", err)
	}

	return nil
}

func (srv *backend) DialPeer(ctx context.Context, req *daemon.DialPeerRequest) (*daemon.DialPeerResponse, error) {
	p2p, err := srv.p2p()
	if err != nil {
		return nil, err
	}

	mas := make([]multiaddr.Multiaddr, len(req.Addrs))

	for i, a := range req.Addrs {
		ma, err := multiaddr.NewMultiaddr(a)
		if err != nil {
			// We allow passing plain peer IDs to attempt the connection, so when parsing fails
			// we adapt the peer ID to be the valid multiaddr.
			a = "/p2p/" + a
			ma, err = multiaddr.NewMultiaddr(a)
			if err != nil {
				return nil, err
			}
		}
		mas[i] = ma
	}

	if err := p2p.Connect(ctx, mas...); err != nil {
		return nil, fmt.Errorf("failed to establish p2p connection: %w", err)
	}

	return &daemon.DialPeerResponse{}, nil
}
