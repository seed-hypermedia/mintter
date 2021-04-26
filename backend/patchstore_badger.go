package backend

import (
	"bytes"
	"encoding/binary"

	"github.com/dgraph-io/badger/v3"
	"github.com/ipfs/go-cid"
)

// Constants for building badger keys. This is somewhat inspired from github.com/dgraph-io/dgraph/x/keys.go
const (
	DefaultPrefix byte = 0x00

	// ByteData indicates the key stores data.
	ByteData byte = 0x00
	// ByteIndex indicates the key stores an index.
	ByteIndex byte = 0x02
	// ByteReverse indicates the key stores a reverse index.
	ByteReverse byte = 0x04
	// ByteCount indicates the key stores a count index.
	ByteCount byte = 0x08
	// ByteCountRev indicates the key stores a reverse count index.
	ByteCountRev = ByteCount | ByteReverse
)

var keyNamespace = "mtt"

// add peer

type uidGenerator struct {
	seq *badger.Sequence
}

func newUIDGenerator(db *badger.DB) *uidGenerator {
	key := []byte{
		keyNamespace[0],
		keyNamespace[1],
		keyNamespace[2],
		DefaultPrefix,
		0x01, // UID sequence value
	}
	_ = key

	return nil
}

/*
object_id = ? mintter object id ?;
peer_id = ? cid-encoded peer id ?;

mintter_namespace = "mtt";
default_prefix = 0x00;

patch_index_key_type = 0x01;

patch_index_key_seq = mintter_namespace, default_prefix, patch_index_key_type, object_id, "p", peer_id, <seq>-<lamport>;
patch_index_key_clock = mintter_namespace, default_prefix, patch_index_key_type, object_id, "c";

objects/<object-id>/byPeer/<peer-id>/patches/<seq>-<lamport> => cid of the patch
objects/<object-id>/byPeer/<peer-id>/lastSeq => last sequence for this peer
objects/<object-id>/clock => last maximal lamport time
objects/<object-id>/deps/<cid> => nil
*/

/*
New keys structure

getUIDForPeer
getPeerByUID


*/

const (
	byteUIDBase    byte = 0x00
	byteUIDLast    byte = 0x00
	byteUIDPeers   byte = 0x01
	byteUIDObjects byte = 0x03

	byteRevUIDBase byte = 0x01

	byteObjectsBase     byte = 0x02
	byteObjectsLastSeq  byte = 0x00
	byteObjectsMaxClock byte = 0x01
	byteObjectsPatches  byte = 0x02
	byteObjectsDeps     byte = 0x03
)

// makeKeyBuffer prepares a buffer for badger key, with specified base byte prefix
// and of the given size. Returns the buffer and next available position to write the rest of the key.
func makeKeyBuffer(base byte, size int) ([]byte, int) {
	k := make([]byte, len(keyNamespace)+1+1+size)
	var pos int
	pos += copy(k, keyNamespace)
	k[pos] = DefaultPrefix
	pos++
	k[pos] = base
	pos++
	return k, pos
}

// mtt/uid/last => last allocated uid
func makeKeyUIDLast() []byte {
	k, pos := makeKeyBuffer(byteUIDBase, 1)
	k[pos] = byteUIDLast
	return k
}

// mtt/uid/peers/<peer-id> => uid of this peer
func makeKeyUIDForPeer(pid cid.Cid) []byte {
	k, pos := makeKeyBuffer(byteUIDBase, 1+pid.ByteLen())
	k[pos] = byteUIDPeers
	pos++
	copy(k[pos:], pid.Bytes())
	return k
}

// mtt/uid/objects/<object-id> => uid of this object
func makeKeyUIDForObject(obj cid.Cid) []byte {
	k, pos := makeKeyBuffer(byteUIDBase, 1+obj.ByteLen())
	k[pos] = byteUIDObjects
	pos++
	copy(k[pos:], obj.Bytes())
	return k
}

// mtt/objects/<object-uid>/lastSeq/<peer-uid> => last seq known for this peer.
func makeKeyLastSeqForPeer(obj, peer uint64) []byte {
	k, pos := makeKeyBuffer(byteObjectsBase, 8+1+8)
	binary.BigEndian.PutUint64(k[pos:pos+8], obj)
	pos += 8
	k[pos] = byteObjectsLastSeq
	pos++
	binary.BigEndian.PutUint64(k[pos:pos+8], peer)
	return k
}

func makePrefixLastSeq(obj uint64) []byte {
	k, pos := makeKeyBuffer(byteObjectsBase, 8+1)
	binary.BigEndian.PutUint64(k[pos:pos+8], obj)
	pos += 8
	k[pos] = byteObjectsLastSeq
	return k
}

// mtt/objects/<object-uid>/maxClock => last maximal lamport time.
func makeKeyMaxClock(obj uint64) []byte {
	k, pos := makeKeyBuffer(byteObjectsBase, 8+1)
	binary.BigEndian.PutUint64(k[pos:pos+8], obj)
	pos += 8
	k[pos] = byteObjectsMaxClock
	return k
}

// mtt/objects/<object-uid>/patches/<peer-uid>/<seq>-<lamport> => cid of the patch.
func makeKeyPeerPatch(obj, peer, seq, lamport uint64) []byte {
	k, pos := makeKeyBuffer(byteObjectsBase, 8+1+8+8+8)
	binary.BigEndian.PutUint64(k[pos:pos+8], obj)
	pos += 8
	k[pos] = byteObjectsPatches
	pos++
	binary.BigEndian.PutUint64(k[pos:pos+8], peer)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:pos+8], seq)
	pos += 8
	binary.BigEndian.PutUint64(k[pos:pos+8], lamport)
	pos += 8
	return k
}

// mtt/objects/<object-uid>/deps/<cid> => nil value
func makeKeyDeps(obj uint64, dep cid.Cid) []byte {
	k, pos := makeKeyBuffer(byteObjectsBase, 8+1+dep.ByteLen())
	binary.BigEndian.PutUint64(k[pos:pos+8], obj)
	pos += 8
	k[pos] = byteObjectsDeps
	pos++
	copy(k[pos:], dep.Bytes())
	return k
}

// mtt/objects/<object-uid>
func makePrefixForObject(obj uint64) []byte {
	k, pos := makeKeyBuffer(byteObjectsBase, 8)
	binary.BigEndian.PutUint64(k[pos:pos+8], obj)
	return k
}

// ========================

func makeSeqPrefix(obj cid.Cid) []byte {
	var b bytes.Buffer

	b.WriteString(keyNamespace)
	b.WriteByte(DefaultPrefix)
	b.WriteByte(0x01) // objects
	b.Write(obj.Bytes())
	b.WriteByte(0x01) // byPeer

	return b.Bytes()
}

func makeSeqKey(obj, peer cid.Cid, seq, lamport uint64) []byte {
	var b bytes.Buffer

	b.WriteString(keyNamespace)
	b.WriteByte(DefaultPrefix)
	b.WriteByte(0x01) // objects
	b.Write(obj.Bytes())
	b.WriteByte(0x01) // byPeer
	b.Write(peer.Bytes())
	b.WriteByte(0x01) // patches
	b.Write(encodeUint64(seq))
	b.Write(encodeUint64(lamport))

	return b.Bytes()
}

func makeLastSeqKey(obj, peer cid.Cid) []byte {
	var b bytes.Buffer

	b.WriteString(keyNamespace)
	b.WriteByte(DefaultPrefix)
	b.WriteByte(0x01) // objects
	b.Write(obj.Bytes())
	b.WriteByte(0x01) // byPeer
	b.Write(peer.Bytes())
	b.WriteByte(0x02) // lastSeq

	return b.Bytes()
}

func makeClockKey(obj cid.Cid) []byte {
	var b bytes.Buffer

	b.WriteString(keyNamespace)
	b.WriteByte(DefaultPrefix)
	b.WriteByte(0x01) // objects
	b.Write(obj.Bytes())
	b.WriteByte(0x02) // clock

	return b.Bytes()
}

func makeDepKey(obj, dep cid.Cid) []byte {
	var b bytes.Buffer

	b.WriteString(keyNamespace)
	b.WriteByte(DefaultPrefix)
	b.WriteByte(0x01) // objects
	b.Write(obj.Bytes())
	b.WriteByte(0x03) // deps
	b.Write(dep.Bytes())

	return b.Bytes()
}

func encodeUint64(i uint64) []byte {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, i)
	return b
}
