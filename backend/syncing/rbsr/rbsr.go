// Package rbsr provides Range-Based Set Reconciliation protocol.
// It's largely based on the corresponding [paper by Aljoscha Meyer][paper],
// and some practical implementation ideas from [Negentropy][negentropy].
//
// [paper]: https://github.com/AljoschaMeyer/set-reconciliation
// [negentropy]: https://github.com/hoytech/negentropy
package rbsr

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"math"
	p2p "seed/backend/genproto/p2p/v1alpha"
	"unsafe"
)

func init() {
	// Fingerprint function depends on the machine's byte order.
	// No need/time to implement big-endian right now.
	ensureLittleEndian()
}

const (
	msgSizeMin      = 4096
	fingerprintSize = 16
)

var maxItem = Item{Timestamp: math.MaxInt64}

// Range is a subset of the data that needs to be reconciled.
type Range = p2p.SetReconciliationRange

// Mode is the reconciliation mode for a given range.
type Mode = p2p.SetReconciliationRange_Mode

type response struct {
	Ranges []*p2p.SetReconciliationRange
	Size   int
}

func (r *response) AddRange(rng *p2p.SetReconciliationRange) {
	r.Ranges = append(r.Ranges, rng)
	for _, c := range rng.Values {
		r.Size += len(c)
	}

	r.Size += len(rng.BoundValue)
	r.Size += len(rng.Fingerprint)
	r.Size += 10 // roughly the size of the protobuf wrapping.
}

// Range modes for the reconciliation protocol.
const (
	SkipMode        = p2p.SetReconciliationRange_SKIP
	FingerprintMode = p2p.SetReconciliationRange_FINGERPRINT
	ListMode        = p2p.SetReconciliationRange_LIST
)

type Item struct {
	Timestamp int64
	Value     []byte
}

func NewItem(timestamp int64, id []byte) Item {
	return Item{Timestamp: timestamp, Value: id}
}

func (i Item) Cmp(other Item) int {
	if i.Timestamp < other.Timestamp {
		return -1
	}

	if i.Timestamp > other.Timestamp {
		return +1
	}

	return bytes.Compare(i.Value, other.Value)
}

// Session holds state for a single running reconciliation between two peers.
type Session struct {
	store        Store
	msgSizeLimit uint64
	isInitiator  bool
}

// NewSession creates a new reconciliation session to track its state and progress.
func NewSession(store Store, msgSizeLimitBytes uint64) (*Session, error) {
	if msgSizeLimitBytes != 0 && msgSizeLimitBytes < msgSizeMin {
		return nil, errors.New("message size limit is too small")
	}
	return &Session{
		store:        store,
		msgSizeLimit: msgSizeLimitBytes,
	}, nil
}

func (n *Session) Initiate() ([]*Range, error) {
	if n.isInitiator {
		return nil, errors.New("already initiated")
	}
	n.isInitiator = true

	var out response

	if err := n.SplitRange(0, n.store.Size(), maxItem, &out); err != nil {
		return nil, err
	}

	return out.Ranges, nil
}

func (n *Session) Reconcile(query []*Range) ([]*Range, error) {
	if n.isInitiator {
		return nil, errors.New("initiator not asking for have/need IDs")
	}
	var haveIds, needIds [][]byte

	output, err := n.reconcile(query, &haveIds, &needIds)
	if err != nil {
		return nil, err
	}

	if len(output) == 1 && n.isInitiator {
		return nil, nil
	}

	return output, nil
}

func (n *Session) ReconcileWithIDs(query []*Range, haveIds, needIds *[][]byte) ([]*Range, error) {
	if !n.isInitiator {
		return nil, errors.New("non-initiator asking for have/need IDs")
	}

	output, err := n.reconcile(query, haveIds, needIds)
	if err != nil {
		return nil, err
	}
	if len(output) == 1 {
		// Assuming an empty string is a special case indicating a condition similar to std::nullopt
		return nil, nil
	}

	return output, nil
}

func (n *Session) reconcile(query []*Range, haveIds, needIds *[][]byte) ([]*Range, error) {
	var fullOutput response

	var prevBound Item
	prevIndex := 0
	skip := false

	for _, rng := range query {
		doSkip := func() {
			if skip {
				skip = false

				rng := &Range{
					Mode:           SkipMode,
					BoundTimestamp: prevBound.Timestamp,
					BoundValue:     prevBound.Value,
				}

				fullOutput.AddRange(rng)
			}
		}

		currBound := NewItem(rng.BoundTimestamp, rng.BoundValue)
		mode := Mode(rng.Mode)

		lower := prevIndex
		upper, err := n.store.FindLowerBound(prevIndex, currBound)
		if err != nil {
			return nil, err
		}

		switch mode {
		case SkipMode:
			skip = true

		case FingerprintMode:
			theirFingerprint := rng.Fingerprint // TODO(burdiyan): maybe validate their fingerprint before using?
			ourFingerprint, err := n.Fingerprint(lower, upper)
			if err != nil {
				return nil, err
			}

			if !bytes.Equal(theirFingerprint, ourFingerprint[:]) {
				doSkip()
				if err := n.SplitRange(lower, upper, currBound, &fullOutput); err != nil {
					return nil, err
				}
			} else {
				skip = true
			}

		case ListMode:
			theirElems := make(map[string][]byte)
			for _, e := range rng.Values {
				theirElems[string(e)] = e
			}

			if err := n.store.ForEach(lower, upper, func(_ int, item Item) bool {
				have := item.Value
				if _, exists := theirElems[string(have)]; !exists {
					if n.isInitiator {
						*haveIds = append(*haveIds, have)
					}
				} else {
					delete(theirElems, string(have))
				}
				return true
			}); err != nil {
				return nil, err
			}

			if n.isInitiator {
				skip = true

				for _, v := range theirElems {
					*needIds = append(*needIds, v)
				}
			} else {
				doSkip()

				var (
					responseIDs [][]byte
					endBound    = currBound
				)

				if err := n.store.ForEach(lower, upper, func(i int, item Item) bool {
					size := fullOutput.Size
					for _, x := range responseIDs {
						size += len(x)
					}

					if n.checkMessageSize(size) {
						endBound = item
						upper = i
						return false
					}

					responseIDs = append(responseIDs, item.Value)
					return true
				}); err != nil {
					return nil, err
				}

				rng := &Range{
					Mode:           ListMode,
					BoundTimestamp: endBound.Timestamp,
					BoundValue:     endBound.Value,
					Values:         responseIDs,
				}
				fullOutput.AddRange(rng)
			}

		default:
			return nil, errors.New("unexpected mode")
		}

		if n.checkMessageSize(fullOutput.Size) {
			remainingFingerprint, err := n.Fingerprint(upper, n.store.Size())
			if err != nil {
				panic(err)
			}

			bound := maxItem

			rng := &Range{
				Mode:           FingerprintMode,
				BoundTimestamp: bound.Timestamp,
				BoundValue:     bound.Value,
				Fingerprint:    remainingFingerprint[:],
			}
			fullOutput.AddRange(rng)

			break
		}

		prevIndex = upper
		prevBound = currBound
	}

	return fullOutput.Ranges, nil
}

func (n *Session) SplitRange(lower, upper int, upperBound Item, output *response) error {
	if output == nil {
		panic("BUG: output must be initialized when splitting range")
	}

	numElems := upper - lower
	const Buckets = 16

	if numElems < Buckets*2 {
		rng := &Range{
			Mode:           ListMode,
			BoundTimestamp: upperBound.Timestamp,
			BoundValue:     upperBound.Value,
			Values:         make([][]byte, 0, numElems),
		}

		if err := n.store.ForEach(lower, upper, func(i int, item Item) bool {
			rng.Values = append(rng.Values, item.Value)
			return true
		}); err != nil {
			return err
		}

		output.AddRange(rng)
	} else {
		itemsPerBucket := numElems / Buckets
		bucketsWithExtra := numElems % Buckets
		curr := lower

		for i := 0; i < Buckets; i++ {
			bucketSize := itemsPerBucket
			if i < bucketsWithExtra {
				bucketSize++
			}
			ourFingerprint, err := n.Fingerprint(curr, curr+bucketSize)
			if err != nil {
				return err
			}

			curr += bucketSize

			var nextBound Item
			if curr == upper {
				nextBound = upperBound
			} else {
				var currItem Item
				if err := n.store.ForEach(curr, curr+1, func(_ int, item Item) bool {
					currItem = item
					return true
				}); err != nil {
					return err
				}

				nextBound = currItem
			}

			rng := &Range{
				Mode:           FingerprintMode,
				BoundTimestamp: nextBound.Timestamp,
				BoundValue:     nextBound.Value,
				Fingerprint:    ourFingerprint[:],
			}

			output.AddRange(rng)
		}
	}

	return nil
}

func (n *Session) checkMessageSize(size int) (ok bool) {
	return n.msgSizeLimit != 0 && size > int(n.msgSizeLimit)-200
}

func (n *Session) Fingerprint(begin, end int) (Fingerprint, error) {
	var out accumulator

	if err := n.store.ForEach(begin, end, func(_ int, item Item) bool {
		h := sha256.Sum256(item.Value) // TODO(burdiyan): cache the value of the hash between rounds.
		out.Add(h)
		return true
	}); err != nil {
		return Fingerprint{}, err
	}

	return out.Fingerprint(), nil
}

func ensureLittleEndian() {
	var nativeEndian binary.ByteOrder

	var buf [2]byte
	*(*uint16)(unsafe.Pointer(&buf[0])) = uint16(0xABCD)

	switch buf {
	case [2]byte{0xCD, 0xAB}:
		nativeEndian = binary.LittleEndian
	case [2]byte{0xAB, 0xCD}:
		nativeEndian = binary.BigEndian
	default:
		panic("Could not determine native endianness.")
	}

	if nativeEndian != binary.LittleEndian {
		panic("This code only works on little-endian architectures.")
	}
}
