package store

import (
	"fmt"
	pb "mintter/proto"

	"github.com/golang/protobuf/proto"
	"github.com/ipfs/go-datastore/query"
)

// StoreDraft in the database.
func (s *Store) StoreDraft(in *pb.Draft) error {
	data, err := proto.Marshal(in)
	if err != nil {
		return fmt.Errorf("failed to marshal proto: %w", err)
	}

	return s.db.Put(s.draftsKey.ChildString(in.DocumentId), data)
}

// GetDraft from the database.
func (s *Store) GetDraft(docID string) (*pb.Draft, error) {
	data, err := s.db.Get(s.draftsKey.ChildString(docID))
	if err != nil {
		return nil, err
	}

	draft := &pb.Draft{}

	if err := proto.Unmarshal(data, draft); err != nil {
		return nil, err
	}

	return draft, err
}

// HasDraft checks if there's a draft for given document ID.
func (s *Store) HasDraft(docID string) (bool, error) {
	return s.db.Has(s.draftsKey.ChildString(docID))
}

// ListDrafts existing in the database. It will not include content.
func (s *Store) ListDrafts(offset, limit int) ([]*pb.Draft, error) {
	res, err := s.db.Query(query.Query{
		Prefix: s.draftsKey.String(),
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
