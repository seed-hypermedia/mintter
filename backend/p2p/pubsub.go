package p2p

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	v2 "mintter/backend/api/v2"
	"mintter/backend/document"
	"mintter/backend/identity"

	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"go.uber.org/multierr"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
)

type subscription struct {
	T *pubsub.Topic
	S *pubsub.Subscription
}

func (s *subscription) Close() error {
	s.S.Cancel()
	return s.T.Close()
}

func (n *Node) startSyncing() {
	n.g.Go(func() error {
		t := time.NewTicker(defaultSyncPeriod)
		defer t.Stop()

		for {
			if err := n.syncAll(); err != nil {
				n.log.Error("FailedSyncingLoop", zap.Error(err))
			}

			select {
			case <-n.ctx.Done():
				return n.ctx.Err()
			case <-t.C:
				continue
			}
		}
	})

	c := make(chan proto.Message, 50)
	n.docsrv.Subscribe(c)

	n.g.Go(func() error {
		for {
			select {
			case <-n.ctx.Done():
				return n.ctx.Err()
			case evt, ok := <-c:
				if !ok {
					return nil
				}

				published := evt.(*v2.PublishDraftResponse)

				msg := "document:" + published.Version

				err := n.pubsub.Publish(n.acc.ID.String(), []byte(msg))
				if err != nil {
					n.log.Error("PublicationBroadcastFailed", zap.Error(err), zap.String("cid", published.Version))
				} else {
					n.log.Debug("PublicationBroadcastSuccess", zap.String("cid", published.Version))
				}
			}
		}
	})
}

func (n *Node) syncAll() error {
	// Iterate over all profiles and setup listeners.
	profiles, err := n.store.ListProfiles(n.ctx, 0, 0)
	if err != nil {
		return err
	}

	for _, prof := range profiles {
		if err := n.SyncProfiles(n.ctx, prof.ID); err != nil && err != context.Canceled {
			n.log.Error("SyncProfilesFailed", zap.Error(err), zap.String("profile", prof.ID.String()))
		}

		if err := n.SyncDocuments(n.ctx, prof.ID); err != nil && err != context.Canceled {
			n.log.Error("SyncDocumentsFailed", zap.Error(err), zap.String("profile", prof.ID.String()))
		}
	}

	return nil
}

func (n *Node) subscribeToKnownProfiles(ctx context.Context) error {
	// Iterate over all profiles and setup listeners.
	profiles, err := n.store.ListProfiles(ctx, 0, 0)
	if err != nil {
		return err
	}

	for _, prof := range profiles {
		if err := n.addSubscription(prof.ID); err != nil {
			n.log.Error("FailedToAddSubscriptionWhenStarting", zap.Error(err), zap.String("profile", prof.ID.String()))
		}
	}

	return nil
}

func (n *Node) addSubscription(pid identity.ProfileID) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	handle, ok := n.subs[pid]
	if ok {
		return nil
	}

	// Create new handle
	topic, err := n.pubsub.Join(pid.String())
	if err != nil {
		return err
	}
	sub, err := topic.Subscribe()
	if err != nil {
		return err
	}

	handle = &subscription{
		T: topic,
		S: sub,
	}
	n.subs[pid] = handle

	n.g.Go(func() (err error) {
		defer func() {
			err = multierr.Append(err, handle.Close())
		}()

		for {
			msg, err := handle.S.Next(n.ctx)
			if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				return err
			}
			if err != nil {
				n.log.Error("ErrorGettingPubSubMessage", zap.Error(err), zap.String("subscription", pid.String()))
				continue
			}

			if err := n.handlePubSubMessage(msg); err != nil {
				n.log.Error("ErrorHandlingPubSubMessage", zap.Error(err), zap.String("subscription", pid.String()))
				continue
			}
		}
	})

	return nil
}

func (n *Node) handlePubSubMessage(msg *pubsub.Message) error {
	parts := strings.Split(string(msg.Message.Data), ":")
	kind, version := parts[0], parts[1]

	// TODO(burdiyan): we need to sign messages propertly to avoid flood.

	switch kind {
	case "document":
		if _, err := n.docsrv.GetDocument(document.AdminContext(n.ctx), &v2.GetDocumentRequest{
			Version: version,
		}); err != nil {
			return err
		}

		return nil
	default:
		return fmt.Errorf("unknown pubsub message type: %s", kind)
	}
}
