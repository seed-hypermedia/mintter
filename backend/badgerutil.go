package backend

import (
	"encoding/binary"
	"fmt"
	"mintter/backend/ipfsutil"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
)

/*
mtt/lastuid => last allocated uid <namespace><internalbyte><lastuid>
mtt/uid/<multicodec>/<cid-multihash> => uid <namespace><internalbyte><uid-byte><multicodec><cid-multihash>

<namespace><default-prefix><data-byte><predicate><uid>

mtt/cid/<uid> => full cid value for this uid.
mtt/patchHeads/<object-uid>/<peer-uid> => head

predicates:
  cid
  patchHeads<object-uid>

<namespace><default-prefix><data|index|reverse|count>
*/

// <namespace><default-prefix|internal><...>

/*
predicates:
  mtt:prefix:data:peers/cid:<uid> => full cid value  -  list all the peers i know, peer uid to cid
  mtt:prefix:idx:peers/cid:<cid> => uid  - peer cid to uid

  mtt:prefix:data:objects/cid:<uid> => full cid value   -   list all the object I know;  object uid to cid
  mtt:prefix:idx:objects/cid:<cid> => uid    -    list all objects I know,   object cid to uid.

  mtt:prefix:data:peers/objects/<obj-uid>:<peer-uid> => head for this object   -   iterate over heads of a given object, list peers that edited this object


  data key:    mtt:prefix:data:<predicate>:uid => value
  index key:   mtt:prefix:index:<predicate>:term =>

  predicates:
    peers/cid => full cid value Indexed
	peers/objects/<object-uid>
	objects/<obj-type>/cid => full cid value. Indexed


  TODO: add object type.

  objects/cid/<uid>

*/

const keyNamespace = "mtt"

type keyPrefix byte

const (
	prefixInternal keyPrefix = 0x00
	prefixDefault  keyPrefix = 0x02
)

type keyType byte

const (
	keyTypeData keyType = 0x02
)

type predicate byte

const (
	predicateCID       predicate = 0x00
	predicatePatchHead predicate = 0x02
)

func makeKeyBuf(p keyPrefix, t keyType, size int) ([]byte, int) {
	k := make([]byte, len(keyNamespace)+1+1+size)
	var pos int
	pos += copy(k, keyNamespace)
	k[pos] = byte(p)
	pos++
	k[pos] = byte(t)
	pos++
	return k, pos
}

func makeLastUIDKey() []byte {
	const t = "lastuid"
	k, _ := makeKeyBuf(prefixInternal, keyTypeData, len(t))
	copy(k, t)
	return k
}

// mtt/uid/<multicodec>/<multihash> => uid value.
func makeUIDKey(c cid.Cid) []byte {
	codec, mh := ipfsutil.DecodeCID(c)
	const t = "uid"
	k, pos := makeKeyBuf(prefixInternal, keyTypeData, len(t)+8+len(mh)) // t + multicodec + multihash
	pos += copy(k, t)
	binary.BigEndian.PutUint64(k[pos:], codec)
	pos += 8
	copy(k[pos:], mh)
	return k
}

func makeUIDPrefix(codec uint64) []byte {
	const t = "uid"
	k, pos := makeKeyBuf(prefixInternal, keyTypeData, len(t)+8)
	pos += copy(k, t)
	binary.BigEndian.PutUint64(k[pos:], codec)
	return k
}

func makePredicateKey(p predicate, uid uint64) []byte {
	k, pos := makeKeyBuf(prefixDefault, keyTypeData, 1+8) //  predicate + uid
	k[pos] = byte(p)
	pos++
	binary.BigEndian.PutUint64(k[pos:], uid)
	return k
}

func makePredicatePrefix(p predicate) []byte {
	k, pos := makeKeyBuf(prefixDefault, keyTypeData, 1)
	k[pos] = byte(p)
	return k
}

func makeCompoundPredicateKey(p predicate, rel, obj uint64) []byte {
	k, pos := makeKeyBuf(prefixDefault, keyTypeData, 1+8+8) //  predicate + rel + obj uids
	k[pos] = byte(p)
	pos++
	binary.BigEndian.PutUint64(k[pos:], rel)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:], obj)
	return k
}

func makeCompoundPredicatePrefix(p predicate, rel uint64) []byte {
	k, pos := makeKeyBuf(prefixDefault, keyTypeData, 1+8)
	k[pos] = byte(p)
	pos++
	binary.BigEndian.PutUint64(k[pos:], rel)
	return k
}

type db struct {
	*badger.DB
	seq *badger.Sequence
}

func newDB(bdb *badger.DB) (*db, error) {
	seq, err := bdb.GetSequence(makeLastUIDKey(), 20)
	if err != nil {
		return nil, err
	}

	return &db{
		DB:  bdb,
		seq: seq,
	}, nil
}

func (db *db) uidFromCID(txn *badger.Txn, c cid.Cid, upsert bool) (uint64, error) {
	k := makeUIDKey(c)

	uid, err := db.getUint64Value(txn, k)
	if err == nil {
		return uid, nil
	}

	if err != badger.ErrKeyNotFound {
		return 0, fmt.Errorf("failed to lookup uid for cid %s: %w", c, err)
	}

	if !upsert {
		return 0, badger.ErrKeyNotFound
	}

	uid, err = db.seq.Next()
	if err != nil {
		return 0, fmt.Errorf("failed to allocate new uid: %w", err)
	}

	if err := txn.Set(k, encodeUint64(uid)); err != nil {
		return 0, fmt.Errorf("failed to store cid: %w", err)
	}

	return uid, nil
}

func (db *db) cidFromUID(txn *badger.Txn, uid uint64) (cid.Cid, error) {
	k := makePredicateKey(predicateCID, uid)
	return db.getCIDValue(txn, k)
}

func (db *db) ScanCIDs(txn *badger.Txn, codec uint64) *badger.Iterator {
	opts := badger.DefaultIteratorOptions
	opts.PrefetchValues = false
	opts.Prefix = makeUIDPrefix(codec)

	return txn.NewIterator(opts)
}

func (db *db) getCIDValue(txn *badger.Txn, k []byte) (cid.Cid, error) {
	item, err := txn.Get(k)
	if err != nil {
		return cid.Undef, err
	}

	var out cid.Cid
	if err := item.Value(func(v []byte) error {
		c, err := cid.Cast(v)
		if err != nil {
			return err
		}
		out = c
		return nil
	}); err != nil {
		return cid.Undef, err
	}

	return out, nil
}

func (db *db) getUint64Value(txn *badger.Txn, k []byte) (uint64, error) {
	item, err := txn.Get(k)
	if err != nil {
		return 0, err
	}

	var out uint64
	if err := item.Value(func(v []byte) error {
		out = binary.BigEndian.Uint64(v)
		return nil
	}); err != nil {
		return 0, err
	}

	return out, nil
}

func (db *db) Close() error {
	// The database is expected to be closed by the caller elsewhere. Here we only
	// release the resources we've started.
	return db.seq.Release()
}

func encodeUint64(i uint64) []byte {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, i)
	return b
}
