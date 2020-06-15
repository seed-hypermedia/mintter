package store

import (
	"errors"
	"fmt"

	pb "mintter/proto"

	"github.com/golang/protobuf/proto"
	"github.com/ipfs/go-cid"
	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
)

// StoreDraft in the database.
func (s *Store) StoreDraft(in *pb.Draft) error {
	data, err := proto.Marshal(in)
	if err != nil {
		return fmt.Errorf("failed to marshal proto: %w", err)
	}

	return s.db.Put(keyDrafts.ChildString(in.DocumentId), data)
}

// GetDraft from the database.
func (s *Store) GetDraft(docID string) (*pb.Draft, error) {
	data, err := s.db.Get(keyDrafts.ChildString(docID))
	if err != nil {
		return nil, err
	}

	draft := &pb.Draft{}

	if err := proto.Unmarshal(data, draft); err != nil {
		return nil, err
	}

	return draft, err
}

// DeleteDraft from the database.
func (s *Store) DeleteDraft(docID string) error {
	return s.db.Delete(keyDrafts.ChildString(docID))
}

// HasDraft checks if there's a draft for given document ID.
func (s *Store) HasDraft(docID string) (bool, error) {
	return s.db.Has(keyDrafts.ChildString(docID))
}

// ListDrafts existing in the database. It will not include content.
func (s *Store) ListDrafts(offset, limit int) ([]*pb.Draft, error) {
	res, err := s.db.Query(query.Query{
		Prefix: keyDrafts.String(),
		Offset: offset,
		Limit:  limit,
	})
	if err != nil {
		return nil, err
	}
	defer res.Close()

	items, err := res.Rest()
	if err != nil {
		return nil, err
	}

	out := make([]*pb.Draft, len(items))

	for i, it := range items {
		draft := &pb.Draft{}
		if err := proto.Unmarshal(it.Value, draft); err != nil {
			return nil, err
		}

		draft.Sections = nil

		out[i] = draft
	}

	return out, nil
}

// AddPublication to for our internal tracking.
func (s *Store) AddPublication(author, docID string, cid cid.Cid) error {
	k := keyPublications.ChildString(author).ChildString(docID)

	ok, err := s.db.Has(k)
	if err != nil {
		return err
	}

	// TODO(burdiyan): allow multiple publications.
	if ok {
		return fmt.Errorf("document %s already has saved publication", docID)
	}

	return s.db.Put(k, cid.Bytes())
}

// ListPublications stored in the database.
func (s *Store) ListPublications(author string, offset, limit int) ([]cid.Cid, error) {
	res, err := s.db.Query(query.Query{
		Prefix: keyPublications.ChildString(author).String(),
		Offset: offset,
		Limit:  limit,
	})
	if err != nil {
		return nil, err
	}
	defer res.Close()

	items, err := res.Rest()
	if err != nil {
		return nil, err
	}

	out := make([]cid.Cid, len(items))

	for i, it := range items {
		cid, err := cid.Cast(it.Value)
		if err != nil {
			return nil, err
		}
		out[i] = cid
	}

	return out, nil
}

// IsNotFound is used to check if error because of not found item.
func IsNotFound(err error) bool {
	return errors.Is(err, datastore.ErrNotFound)
}
