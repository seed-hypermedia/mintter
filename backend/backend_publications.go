package backend

import (
	"context"
	"fmt"
	"mintter/backend/ipfs"
	"time"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Version string

func (v Version) String() string {
	return string(v)
}

type Publication struct {
	Draft

	Version     Version
	PublishTime time.Time
}

type changeMetadata struct {
	CID         cid.Cid
	LamportTime uint64
	Seq         uint64
	CreateTime  time.Time
}

func (pub *Publication) apply(change signedPatch) error {
	meta := changeMetadata{
		CID:         change.cid,
		LamportTime: change.LamportTime,
		Seq:         change.Seq,
		CreateTime:  change.CreateTime,
	}

	evt := &DocumentChange{}
	if err := evt.UnmarshalVT(change.Body); err != nil {
		return err
	}

	if err := pub.applyChange(meta, evt); err != nil {
		return err
	}

	return nil
}

func (pub *Publication) applyChange(change changeMetadata, evt *DocumentChange) error {
	// The first patch ever must have author and create time.
	if evt.Author != "" {
		if pub.Author.Defined() {
			return fmt.Errorf("malformed publication changeset: got author when was already set")
		}

		aid, err := accountIDFromString(evt.Author)
		if err != nil {
			return err
		}

		pub.Author = cid.Cid(aid)

		if evt.CreateTime == nil {
			return fmt.Errorf("missing create time on initial publication change")
		}

		pub.CreateTime = evt.CreateTime.AsTime()
	}

	if change.LamportTime > 1 && !pub.Author.Defined() {
		return fmt.Errorf("missing initial patch for publication")
	}

	pub.Version = Version(change.CID.String()) // TODO: support use case for versions with multiple heads.
	pub.PublishTime = change.CreateTime
	pub.UpdateTime = evt.UpdateTime.AsTime()

	if evt.TitleUpdated != "" {
		pub.Title = evt.TitleUpdated
	}

	if evt.SubtitleUpdated != "" {
		pub.Subtitle = evt.SubtitleUpdated
	}

	if evt.ContentUpdated != nil {
		pub.Content = evt.ContentUpdated
	}

	for _, l := range evt.LinksAdded {
		ll, err := l.ToLink()
		if err != nil {
			return err
		}
		pub.AddLink(ll)
	}

	for _, l := range evt.LinksRemoved {
		ll, err := l.ToLink()
		if err != nil {
			return err
		}
		pub.RemoveLink(ll)
	}

	return nil
}

func publicationFromChanges(s *changeset, cb ...func(meta changeMetadata, evt *DocumentChange) error) (Publication, error) {
	var pub Publication

	pub.ID = s.obj

	for s.Next() {
		change := s.Item()
		meta := changeMetadata{
			CID:         change.cid,
			LamportTime: change.LamportTime,
			Seq:         change.Seq,
			CreateTime:  change.CreateTime,
		}

		evt := &DocumentChange{}
		if err := evt.UnmarshalVT(change.Body); err != nil {
			return pub, err
		}

		if err := pub.applyChange(meta, evt); err != nil {
			return Publication{}, err
		}
		for _, fn := range cb {
			if err := fn(meta, evt); err != nil {
				return pub, err
			}
		}
	}
	return pub, nil
}

func (srv *backend) GetPublication(ctx context.Context, c cid.Cid) (Publication, error) {
	state, err := srv.LoadState(ctx, c)
	if err != nil {
		return Publication{}, err
	}

	if state.size == 0 {
		return Publication{}, status.Errorf(codes.NotFound, "publication with id %s is not found", c)
	}

	return publicationFromChanges(state)
}

func (srv *backend) DeletePublication(ctx context.Context, c cid.Cid) (err error) {
	codec, hash := ipfs.DecodeCID(c)

	return srv.pool.WithTx(ctx, func(conn *sqlite.Conn) error {
		return objectsDelete(conn, hash, int(codec))
	})
}

func (srv *backend) ListPublications(ctx context.Context) ([]publicationsListResult, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return publicationsList(conn)
}
