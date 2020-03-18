package main

import (
	"context"

	profile "mintter/backend/identity"
	"mintter/backend/threadsutil"

	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/multiformats/go-multiaddr"
	"github.com/multiformats/go-multihash"
	service "github.com/textileio/go-threads/core/net"
	"github.com/textileio/go-threads/core/thread"
	"github.com/textileio/go-threads/crypto/symmetric"
	threadsvc "github.com/textileio/go-threads/net"
	"go.uber.org/zap"
)

type mttPeer struct {
	tid   thread.ID
	tinfo thread.Info
	prof  *profile.Profile
	ts    *threadsutil.ServiceBootstrapper
	priv  crypto.PrivKey
	log   *zap.Logger
}

func newPeer(seed []byte, repoPath string, address string, log *zap.Logger) (*mttPeer, error) {
	prof, err := profile.FromSeed(seed)
	if err != nil {
		return nil, err
	}

	priv, _, err := prof.Child(0)
	if err != nil {
		return nil, err
	}

	addr, err := multiaddr.NewMultiaddr(address)
	if err != nil {
		return nil, err
	}

	ts, err := threadsutil.DefaultService(repoPath, priv, threadsutil.WithServiceHostAddr(addr))
	if err != nil {
		return nil, err
	}

	tid := prof.ThreadID()

	ctx := context.TODO()

	tinfo, err := ts.GetThread(ctx, tid)
	if err != nil {
		return nil, err
	}

	if tinfo.ReadKey == nil {
		readKey := symmetric.New()

		tinfo, err = ts.CreateThread(ctx, tid, service.LogKey(priv), service.ReadKey(readKey))
		if err != nil {
			return nil, err
		}
	}

	return &mttPeer{
		tid:   tid,
		tinfo: tinfo,
		ts:    ts,
		prof:  prof,
		priv:  priv,
		log:   log,
	}, nil
}

func (p *mttPeer) Close() error {
	p.log.Info("PeerClosing")
	return p.ts.Close()
}

func (p *mttPeer) GetInvites() ([]Invite, error) {
	var out []Invite
	h := p.ts.Host()

	for _, a := range h.Addrs() {
		taddr, err := threadAddr(h.ID(), a, p.tinfo.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, Invite{
			ThreadAddr: taddr,
			FollowKey:  p.tinfo.FollowKey,
			ReadKey:    p.tinfo.ReadKey,
		})
	}

	return out, nil
}

func (p *mttPeer) Follow(ctx context.Context, i Invite) error {
	log := p.log.With(zap.String("inviteAddress", i.ThreadAddr.String()))

	log.Debug("FollowInit")

	tinfo, err := p.ts.AddThread(ctx, i.ThreadAddr, service.ReadKey(i.ReadKey), service.FollowKey(i.FollowKey))
	if err != nil {
		return err
	}

	log.Debug("FollowOK", zap.Any("threadInfo", tinfo))

	return nil
}

func (p *mttPeer) UpdateProfile(ctx context.Context, msg profileUpdate) (service.ThreadRecord, error) {
	body, err := cbornode.WrapObject(msg, multihash.SHA2_256, -1)
	if err != nil {
		return nil, err
	}

	return p.ts.CreateRecord(ctx, p.tid, body)
}

func (p *mttPeer) Subscribe(ctx context.Context) (<-chan service.ThreadRecord, error) {
	return p.ts.Subscribe(ctx)
}

func (p *mttPeer) TraceBackThread(ctx context.Context, tid thread.ID) (<-chan service.ThreadRecord, error) {
	tinfo, err := p.ts.GetThread(ctx, tid)
	if err != nil {
		return nil, err
	}

	if len(tinfo.Logs) != 1 {
		panic("We assume only one log per thread for now")
	}

	log := tinfo.Logs[0]

	if len(log.Heads) != 1 {
		panic("There must be only one head per log")
	}

	head := log.Heads[0]

	c := make(chan service.ThreadRecord)

	go func() {
		defer close(c)

		nextRec := head

	Loop:
		for nextRec.Defined() {
			select {
			case <-ctx.Done():
				return
			default:
				rec, err := p.ts.GetRecord(ctx, tid, nextRec)
				if err != nil {
					p.log.Error("FailedTraceBackLog", zap.Error(err))
					break Loop
				}

				nextRec = rec.PrevID()
				c <- threadsvc.NewRecord(rec, tinfo.ID, log.ID)
			}
		}
	}()

	return c, nil
}
