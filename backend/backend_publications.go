package backend

import (
	"context"
	"fmt"
	"mintter/backend/ipfs"
	"time"

	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Publication struct {
	Draft

	Version     string
	PublishTime time.Time
}

func (pub *Publication) applyChange(change signedPatch) error {
	var evt DocumentChange

	// TODO: avoid double serialization here.

	if err := evt.UnmarshalVT(change.Body); err != nil {
		return nil
	}

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

	pub.Version = change.cid.String()
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

	return nil
}

func publicationFromChanges(s *changeset) (Publication, error) {
	var pub Publication

	pub.ID = s.obj

	for s.Next() {
		change := s.Item()
		if err := pub.applyChange(change); err != nil {
			return Publication{}, err
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

	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	defer sqlitex.Save(conn)(&err)

	if err := objectsDelete(conn, hash, int(codec)); err != nil {
		return err
	}

	return nil
}

func (srv *backend) ListPublications(ctx context.Context) ([]publicationsListResult, error) {
	conn, release, err := srv.pool.Conn(ctx)
	if err != nil {
		return nil, err
	}
	defer release()

	return publicationsList(conn)
}
