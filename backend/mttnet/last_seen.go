package mttnet

import (
	"math/rand"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/libp2p/go-libp2p/core/host"
)

type lastSeenTracker struct {
	host  host.Host
	db    *sqlitex.Pool
	rand  rand.Rand
	proto protocolInfo
}

// func (l *lastSeenTracker) run(ctx context.Context) error {
// 	t := time.NewTimer(time.Nanosecond)
// 	defer t.Stop()

// 	type onlinePeer struct {
// 		peer core.Principal
// 	}

// 	for {
// 		select {
// 		case <-ctx.Done():
// 			return ctx.Err()
// 		case <-t.C:
// 			now := time.Now()

// 			var peers []onlinePeer
// 			for _, conn := range l.host.Network().Conns() {
// 				p, err := l.host.Peerstore().FirstSupportedProtocol(conn.RemotePeer(), l.proto.ID)
// 				if err != nil {
// 					return err
// 				}

// 				if p != l.proto.ID {
// 					continue
// 				}

// 				peers = append(peers, onlinePeer{peer: conn.RemotePeer()})
// 			}

// 			t.Reset(l.nextSleepDuration())
// 		}
// 	}
// }

func (l *lastSeenTracker) nextSleepDuration() time.Duration {
	const (
		base   = time.Minute
		jitter = 10 * time.Second
	)

	dur := base + time.Duration(l.rand.Int63n(int64(jitter*2))-int64(jitter))
	if dur < 0 {
		dur = 0
	}

	return dur
}
