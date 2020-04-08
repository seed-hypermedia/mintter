// Package appendonly provides local immutable append-only log, very similar to
// Secure Scuttlebutt. See: https://ssbc.github.io/scuttlebutt-protocol-guide/#feeds.
package appendonly

import (
	"context"
	"errors"
	"fmt"
	"mintter/backend/identity"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/ipfs/go-datastore"
	"github.com/ipfs/go-datastore/query"
	"github.com/multiformats/go-multihash"
)

const defaultMultihashCode = multihash.SHA2_256

// Log is a single-writer append-only log.
type Log struct {
	name string
	prof identity.Profile
	db   datastore.TxnDatastore

	headKey    datastore.Key
	recordsKey datastore.Key
	nowFunc    func() time.Time

	mu      sync.Mutex
	nextSeq int
	head    string
}

// NewLog creates a new Log. The underlying database will have the following keys scheme:
//
// `/logs/<profile-id>/<log-name>/head` - stores head of the log.
// `/logs/<profile-id>/<log-name>/records/<seq>` - stored records by their sequence id.
func NewLog(name string, prof identity.Profile, db datastore.TxnDatastore) (*Log, error) {
	k := datastore.KeyWithNamespaces([]string{"/logs", prof.ID(), string(name)})
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

func (l *Log) init() (err error) {
	v, err := l.db.Get(l.headKey)
	if err != nil {
		if errors.Is(err, datastore.ErrNotFound) {
			return nil
		}
		return err
	}

	key := strings.Split(string(v), "-")
	lastSeq, err := strconv.Atoi(key[0])
	if err != nil {
		panic("bug: " + err.Error())
	}

	l.mu.Lock()
	l.nextSeq = lastSeq + 1
	l.head = key[1]
	l.mu.Unlock()

	return
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
		Author:        l.prof.ID(),
		MultihashCode: defaultMultihashCode,
		Previous:      l.head,
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

	seqstr := strconv.Itoa(seq)
	headKey := seqstr + "-" + signed.Hash()

	if err := txn.Put(l.recordsKey.ChildString(seqstr), data); err != nil {
		return SignedRecord{}, fmt.Errorf("failed to add record to datastore: %w", err)
	}

	if err := txn.Put(l.headKey, []byte(headKey)); err != nil {
		return SignedRecord{}, fmt.Errorf("failed to store head: %w", err)
	}

	if err := txn.Commit(); err != nil {
		return SignedRecord{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	l.nextSeq++
	l.head = signed.Hash()

	return signed, nil
}

// Get record by its seq.
func (l *Log) Get(seq int) (SignedRecord, error) {
	v, err := l.db.Get(l.recordsKey.ChildString(strconv.Itoa(seq)))
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
