package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"

	"mintter/backend/identity"
	"mintter/backend/rpc"
	"mintter/proto"

	"github.com/burdiyan/go/mainutil"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p-core/host"
	peer "github.com/libp2p/go-libp2p-peer"
	"github.com/mr-tron/base58"
	"github.com/multiformats/go-multiaddr"
	"github.com/textileio/go-threads/cbor"
	"github.com/textileio/go-threads/core/service"
	"github.com/textileio/go-threads/core/thread"
	"github.com/textileio/go-threads/crypto/symmetric"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
)

func init() {
	cbornode.RegisterCborType(profileUpdate{})
}

type Invite struct {
	ThreadAddr ThreadAddr
	FollowKey  *symmetric.Key
	ReadKey    *symmetric.Key
}

type ThreadAddr multiaddr.Multiaddr

func (i Invite) String() string {
	addr := i.ThreadAddr.String()
	fKey := base58.Encode(i.FollowKey.Bytes())
	rKey := base58.Encode(i.ReadKey.Bytes())

	return addr + "?" + fKey + "&" + rKey
}

func threadAddr(h peer.ID, addr multiaddr.Multiaddr, tid thread.ID) (ThreadAddr, error) {
	id, err := multiaddr.NewComponent("p2p", h.String())
	if err != nil {
		return nil, err
	}

	thread, err := multiaddr.NewComponent("thread", tid.String())
	if err != nil {
		return nil, err
	}

	return addr.Encapsulate(id).Encapsulate(thread), nil
}

func main() {
	mainutil.Run(grpcWeb)
}

func grpcWeb() (err error) {
	g, ctx := errgroup.WithContext(mainutil.TrapSignals())

	svc := &rpc.Server{}

	rpcsrv := grpc.NewServer()

	proto.RegisterAccountsServer(rpcsrv, svc)

	grpclis, err := net.Listen("tcp", ":55000")
	if err != nil {
		return err
	}

	wrap := grpcweb.WrapServer(rpcsrv,
		grpcweb.WithOriginFunc(func(origin string) bool {
			return true
		}),
	)

	log, err := zap.NewDevelopment()
	if err != nil {
		return err
	}
	defer log.Sync()

	srv := &http.Server{
		Addr:    ":55001",
		Handler: wrap,
	}

	g.Go(func() error {
		log.Info("ServerStarted", zap.String("url", "http://localhost"+srv.Addr))
		return srv.ListenAndServe()
	})

	g.Go(func() error {
		<-ctx.Done()
		return srv.Shutdown(context.Background())
	})

	g.Go(func() error {
		return rpcsrv.Serve(grpclis)
	})

	g.Go(func() error {
		<-ctx.Done()
		rpcsrv.GracefulStop()
		return nil
	})

	return g.Wait()
}

func closeFunc(err *error, closer func() error) {
	*err = multierr.Append(*err, closer())
}

func run2() (err error) {
	g, ctx := errgroup.WithContext(mainutil.TrapSignals())

	g.Go(func() error {
		<-ctx.Done()
		return ctx.Err()
	})

	log, err := zap.NewDevelopment()
	if err != nil {
		return err
	}
	defer log.Sync()

	var bobPeer *mttPeer
	{
		seed := bob()
		l := log.With(zap.String("peer", "bob"))
		bobPeer, err = newPeer(seed.Entropy[:], "tmp/bob", "/ip4/127.0.0.1/tcp/55002", l)
		if err != nil {
			return err
		}

		l.Info("PeerStarted", zap.String("threadID", bobPeer.tid.String()))
	}
	defer closeFunc(&err, bobPeer.Close)

	var alicePeer *mttPeer
	{
		seed := alice()
		l := log.With(zap.String("peer", "alice"))
		alicePeer, err = newPeer(seed.Entropy[:], "tmp/alice", "/ip4/127.0.0.1/tcp/55003", l)
		if err != nil {
			return err
		}

		l.Info("PeerStarted", zap.String("threadID", alicePeer.tid.String()))
	}
	defer closeFunc(&err, alicePeer.Close)

	invites, err := bobPeer.GetInvites()
	if err != nil {
		return err
	}

	g.Go(func() error {
		ch, err := alicePeer.Subscribe(ctx)
		if err != nil {
			return err
		}

		return drainChannel(ctx, alicePeer.ts, ch, alicePeer.log)
	})

	if err := alicePeer.Follow(ctx, invites[0]); err != nil {
		return err
	}

	_, err = bobPeer.UpdateProfile(ctx, profileUpdate{"Bob", "Fisher"})
	if err != nil {
		return err
	}

	g.Go(func() error {
		ch, err := bobPeer.TraceBackThread(ctx, bobPeer.tid)
		if err != nil {
			return err
		}

		log := bobPeer.log.Named("traceback")

		log.Debug("StartTraceback")
		return drainChannel(ctx, bobPeer.ts, ch, log)
	})

	return g.Wait()
}

func drainChannel(ctx context.Context, ts service.Service, ch <-chan service.ThreadRecord, log *zap.Logger) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case rec, ok := <-ch:
			if !ok {
				return nil
			}

			val := rec.Value()

			event, err := cbor.EventFromRecord(ctx, ts, val)
			if err != nil {
				return err
			}

			tinfo, err := ts.GetThread(ctx, rec.ThreadID())
			if err != nil {
				return err
			}

			body, err := event.GetBody(ctx, ts, tinfo.ReadKey)
			if err != nil {
				log.Debug("MessageDroped", zap.String("reason", "Not for us"), zap.Error(err))
				continue
			}

			var m profileUpdate
			err = cbornode.DecodeInto(body.RawData(), &m)
			if err != nil {
				log.Debug("MessageDropped", zap.String("reason", "Not one of out messages"), zap.Error(err))
				continue
			}

			header, err := event.GetHeader(ctx, ts, nil)
			if err != nil {
				log.Debug("MessageDropped", zap.String("reason", "Can't get event header"), zap.Error(err))
				continue
			}

			msgTime, err := header.Time()
			if err != nil {
				log.Debug("MessageDropped",
					zap.String("reason", "Can't get event time"),
					zap.Error(err))
				continue
			}

			log.Debug("MessageReceived",
				zap.Any("message", m),
				zap.String("valBlockCID", val.BlockID().String()),
				zap.String("recordCID", val.Cid().String()),
				zap.String("headerCID", header.Cid().String()),
				zap.String("bodyCID", body.Cid().String()),
				zap.Time("messageTime", *msgTime))
		}
	}
}

func run() (err error) {
	g, ctx := errgroup.WithContext(mainutil.TrapSignals())

	invitesCh := make(chan []string, 1)

	g.Go(func() error {
		return runAlice(ctx, invitesCh)
	})

	g.Go(func() error {
		return runBob(ctx, invitesCh)
	})

	return g.Wait()
}

func runBob(ctx context.Context, ch <-chan []string) (err error) {
	seed := bob()

	bob, err := identity.FromSeed(seed.Entropy[:])
	if err != nil {
		return err
	}

	priv, _, err := bob.Child(0)
	if err != nil {
		return err
	}

	addr, err := multiaddr.NewMultiaddr("/ip4/0.0.0.0/tcp/55002")
	if err != nil {
		return err
	}

	ts, err := DefaultService("tmp/.bob", priv, WithServiceHostAddr(addr))
	if err != nil {
		return err
	}
	defer func() {
		multierr.Append(err, ts.Close())
	}()

	tid := bob.ThreadID()

	readKey, err := symmetric.CreateKey()
	if err != nil {
		return err
	}

	tinfo, err := ts.CreateThread(ctx, tid, service.LogKey(priv), service.ReadKey(readKey))
	if err != nil {
		return err
	}

	fmt.Println("[BOB]: Thread ID:", tinfo.ID)

	invites := <-ch
	fmt.Println("[BOB]: Joining Alice's thread")
	var aliceTinfo thread.Info
	for _, i := range invites {
		addr, fkey, rkey := parseInviteLink(i)
		tinfo, err := ts.AddThread(ctx, addr, service.FollowKey(fkey), service.ReadKey(rkey))
		if err != nil {
			return err
		}

		aliceTinfo = tinfo

		fmt.Println("[BOB]: Joined Alice Thread", tinfo.ID, tinfo.Logs)
	}

	if err := ts.PullThread(ctx, aliceTinfo.ID); err != nil {
		return err
	}

	<-ctx.Done()
	fmt.Println("[BOB]: Closing")
	return ctx.Err()
}

func runAlice(ctx context.Context, ch chan<- []string) error {
	seed := alice()

	alice, err := identity.FromSeed(seed.Entropy[:])
	if err != nil {
		return err
	}

	priv, _, err := alice.Child(1)
	if err != nil {
		return err
	}

	addr, err := multiaddr.NewMultiaddr("/ip4/127.0.0.1/tcp/55001")
	if err != nil {
		return err
	}

	ts, err := DefaultService("tmp/.alice", priv, WithServiceHostAddr(addr))
	if err != nil {
		return err
	}
	defer func() {
		multierr.Append(err, ts.Close())
	}()

	tid := alice.ThreadID()

	readKey, err := symmetric.CreateKey()
	if err != nil {
		return err
	}

	tinfo, err := ts.CreateThread(ctx, tid,
		service.LogKey(priv),
		service.ReadKey(readKey),
	)
	if err != nil {
		return err
	}

	fmt.Println("[ALICE]: Peer ID:", ts.Host().ID())

	invites, err := inviteLinks(ts.Host(), tinfo)
	if err != nil {
		return err
	}

	fmt.Println("[ALICE]: Invices:", invites)

	ch <- invites

	<-ctx.Done()
	fmt.Println("[ALICE]: Closing")
	return ctx.Err()
}

func dumpRecord(val service.Record) {
	fmt.Println("CID:", val.Cid())
	fmt.Println("Prev ID:", val.PrevID())
	fmt.Println("Block ID:", val.BlockID())
	fmt.Println("Links:", val.Links())
}

type profileUpdate struct {
	FirstName string
	LastName  string
}

func inviteLinks(host host.Host, tinfo thread.Info) ([]string, error) {
	id, err := multiaddr.NewComponent("p2p", host.ID().String())
	if err != nil {
		return nil, err
	}

	thread, err := multiaddr.NewComponent("thread", tinfo.ID.String())
	if err != nil {
		return nil, err
	}

	addrs := host.Addrs()
	res := make([]string, len(addrs))
	for i := range addrs {
		addr := addrs[i].Encapsulate(id).Encapsulate(thread).String()
		fKey := base58.Encode(tinfo.FollowKey.Bytes())
		rKey := base58.Encode(tinfo.ReadKey.Bytes())

		res[i] = addr + "?" + fKey + "&" + rKey
	}
	return res, nil
}

func parseInviteLink(invite string) (addr multiaddr.Multiaddr, fkey *symmetric.Key, rkey *symmetric.Key) {
	addrRest := strings.Split(invite, "?")

	addr, err := multiaddr.NewMultiaddr(addrRest[0])
	if err != nil {
		panic("invalid invite link")
	}
	keys := strings.Split(addrRest[1], "&")
	fkeyBytes, err := base58.Decode(keys[0])
	if err != nil {
		panic("invalid follow key")
	}
	rkeyBytes, err := base58.Decode(keys[1])
	if err != nil {
		panic("invalid read key")
	}
	fkey, err = symmetric.NewKey(fkeyBytes)
	if err != nil {
		panic("can't create follow symkey")
	}
	rkey, err = symmetric.NewKey(rkeyBytes)
	if err != nil {
		panic("can't create read symkey")
	}
	return addr, fkey, rkey
}
