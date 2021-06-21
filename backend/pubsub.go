package backend

import (
	"context"
	"sync"

	p2p "mintter/api/go/p2p/v1alpha"

	"github.com/ipfs/go-cid"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"go.uber.org/multierr"
	"google.golang.org/protobuf/proto"
)

type pubSub struct {
	ps *pubsub.PubSub

	mu   sync.Mutex
	subs map[cid.Cid]*pubsub.Topic
}

// Subscribe creates a new subscription. Callers are responsible for closing them,
// before closing the pubSub instance.
func (p *pubSub) Subscribe(object cid.Cid) (*pubsub.Subscription, error) {
	t, err := p.topic(object)
	if err != nil {
		return nil, err
	}

	return t.Subscribe()
}

// Publish a new peer version of a given object.
func (p *pubSub) Publish(ctx context.Context, object cid.Cid, pv *p2p.PeerVersion) error {
	t, err := p.topic(object)
	if err != nil {
		return err
	}

	data, err := proto.Marshal(pv)
	if err != nil {
		return err
	}

	return t.Publish(ctx, data)
}

func (p *pubSub) topic(object cid.Cid) (*pubsub.Topic, error) {
	p.mu.Lock()
	if p.subs == nil {
		p.subs = make(map[cid.Cid]*pubsub.Topic)
	}
	t, ok := p.subs[object]
	if !ok {
		topic, err := p.ps.Join(object.String())
		if err != nil {
			return nil, err
		}

		t = topic

		p.subs[object] = t
	}

	return t, nil
}

func (p *pubSub) Close() (err error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	for _, t := range p.subs {
		if e := t.Close(); e != context.Canceled {
			err = multierr.Append(err, e)
		}
	}

	return
}
