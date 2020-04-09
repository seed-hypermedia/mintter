// Package appendonly provides local immutable append-only log, very similar to
// Secure Scuttlebutt. See: https://ssbc.github.io/scuttlebutt-protocol-guide/#feeds.
package appendonly

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"mintter/backend/identity"
	"sync"
	"time"

	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
	"github.com/multiformats/go-multihash"
)

const defaultMultihashCode = multihash.SHA2_256

type head struct {
	seq  uint64
	hash string
}

func (h head) MarshalBinary() ([]byte, error) {
	hash := []byte(h.hash)
	out := make([]byte, 8+len(hash))
	binary.BigEndian.PutUint64(out, h.seq)
	out = append(out, hash...)

	return out, nil
}

func (h *head) UnmarshalBinary(data []byte) error {
	h.seq = binary.BigEndian.Uint64(data)
	h.hash = string(data[8:])
	return nil
}

// Log is a single-writer append-only log.
type Log struct {
	name string
	prof identity.Profile
	db   datastore.TxnDatastore

	headKey    datastore.Key
	recordsKey datastore.Key
	nowFunc    func() time.Time

	mu      sync.Mutex
	head    head
	nextSeq int
}

// NewLog creates a new Log. The underlying database will have the following keys scheme:
//
// `/logs/<profile-id>/<log-name>/head` - stores head of the log.
// `/logs/<profile-id>/<log-name>/records/<seq>` - stored records by their sequence id.
func NewLog(name string, prof identity.Profile, db datastore.TxnDatastore) (*Log, error) {
	k := datastore.KeyWithNamespaces([]string{"/logs", prof.ID.String(), string(name)})
	l := &Log{
		headKey:    k.ChildString("head"),
		recordsKey: k.ChildString("records"),
		name:       name,
		prof:       prof,
		db:         db,
		nowFunc:    time.Now,
	}

	if err := l.init(); err != nil {
		return nil, fmt.Errorf("failed to initialize datastore: %w", err)
	}

	return l, nil
}

func (l *Log) init() error {
	v, err := l.db.Get(l.headKey)
	if err != nil {
		if errors.Is(err, datastore.ErrNotFound) {
			return nil
		}
		return err
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	if err := l.head.UnmarshalBinary(v); err != nil {
		return err
	}

	l.nextSeq = int(l.head.seq + 1)

	return nil
}

// Append record to the log.
func (l *Log) Append(v interface{}) (SignedRecord, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	txn, err := l.db.NewTransaction(false)
	if err != nil {
		return SignedRecord{}, fmt.Errorf("failed to open transaction: %w", err)
	}
	defer txn.Discard()

	content, err := encMode.Marshal(v)
	if err != nil {
		return SignedRecord{}, fmt.Errorf("failed to encode content: %w", err)
	}

	seq := l.nextSeq

	rec := Record{
		Seq:           seq,
		Author:        l.prof.ID.String(),
		MultihashCode: defaultMultihashCode,
		Previous:      l.head.hash,
		Content:       content,
		AppendTime:    l.nowFunc(),
	}

	signed, err := rec.Sign(l.prof.PrivKey)
	if err != nil {
		return SignedRecord{}, err
	}

	// TODO(burdiyan): Think how expensive is this marshaling.
	// This could be optimized, because we already marshaled the whole record to produce the hash.
	data, err := encMode.Marshal(signed)
	if err != nil {
		return SignedRecord{}, fmt.Errorf("failed to marshal record before storing: %w", err)
	}

	newHead := head{seq: uint64(seq), hash: signed.Hash()}
	binhead, err := newHead.MarshalBinary()
	if err != nil {
		return SignedRecord{}, err
	}

	// Sequence number is encoded as big endian uint64 to sort lexicographically correctly.
	seqstr := string(binhead[:8])

	if err := txn.Put(l.recordsKey.ChildString(seqstr), data); err != nil {
		return SignedRecord{}, fmt.Errorf("failed to add record to datastore: %w", err)
	}

	if err := txn.Put(l.headKey, binhead); err != nil {
		return SignedRecord{}, fmt.Errorf("failed to store head: %w", err)
	}

	if err := txn.Commit(); err != nil {
		return SignedRecord{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	l.head = newHead
	l.nextSeq = seq + 1

	return signed, nil
}

// Get record by its seq.
func (l *Log) Get(seq int) (SignedRecord, error) {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, uint64(seq))

	v, err := l.db.Get(l.recordsKey.ChildString(string(b)))
	if err != nil {
		return SignedRecord{}, err
	}

	return DecodeSignedRecord(v)
}

// List appended records from the log.
func (l *Log) List(seq, limit int) (*Results, error) {
	resp, err := l.db.Query(query.Query{
		Prefix: l.recordsKey.String(),
		Offset: seq,
		Limit:  limit,
	})
	if err != nil {
		return nil, err
	}

	return &Results{q: resp}, nil
}

// Results wraps query results.
type Results struct {
	q query.Results
}

// Next record. Blocks until context is canceled or record is retrieved.
func (r *Results) Next(ctx context.Context) (sr SignedRecord, hasMore bool) {
	select {
	case <-ctx.Done():
		return SignedRecord{}, false
	case rec, ok := <-r.q.Next():
		if !ok {
			return SignedRecord{}, false
		}

		sr, err := DecodeSignedRecord(rec.Value)
		if err != nil {
			panic("bug: " + err.Error())
		}

		return sr, true
	}
}

// Close the results.
func (r *Results) Close() error {
	return r.q.Close()
}
