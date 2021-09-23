// +build cgo

package mtast

import (
	"bytes"
	"compress/zlib"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"path/filepath"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/DataDog/zstd"
	"github.com/alexeyco/simpletable"
	"github.com/fxamacker/cbor/v2"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"mintter/backend/blockdoc"
	"mintter/backend/blockdoc/mtast"
	"mintter/backend/crdt"
)

type op interface{ isOp() }

type ID = crdt.ID

type blockMove struct {
	ID     ID
	Node   string
	Parent string
	Left   ID
}

func (blockMove) isOp() {}

type setKey struct {
	ID    ID
	Node  string
	Key   string
	Value interface{}
}

func (setKey) isOp() {}

func init() {
	gob.Register([]op{})
	gob.Register(setKey{})
	gob.Register(blockMove{})
}

type result struct {
	Input     string
	Codec     string
	SizeBytes int
	SizeKB    int
	Duration  time.Duration
}

type test func(*testing.T, io.Writer, []op)

func TestEncoding(t *testing.T) {
	t.Skip("Will run manually") // Comment this line for running the test manually.

	inputs := []string{
		"lorem-150-flat.json",
		"simple-nested.json",
		"lorem-150-nested.json",
	}

	codecs := map[string]test{
		"json":      encodeJSON,
		"gob":       encodeGOB,
		"cbor":      encodeCBOR,
		"pb-short":  encodeProtoShortened,
		"pb-full":   encodeProtoFull,
		"pb-packed": encodeProtoPacked,
	}

	var wg sync.WaitGroup

	res := make([]result, len(inputs)*len(codecs)*3)

	var idx int
	for _, input := range inputs {
		ops := walkTestdata(t, input)

		for codec, fn := range codecs {
			wg.Add(3)
			go runSimple(t, &wg, res, idx, input, codec, fn, ops)
			idx++
			go runZlib(t, &wg, res, idx, input, codec, fn, ops)
			idx++
			go runZstd(t, &wg, res, idx, input, codec, fn, ops)
			idx++
		}
	}

	wg.Wait()

	table := simpletable.New()
	for _, r := range res {
		row := []*simpletable.Cell{
			{Text: filepath.Base(r.Input)},
			{Text: r.Codec},
			{Text: strconv.Itoa(r.SizeBytes)},
			{Text: strconv.Itoa(r.SizeKB)},
			{Text: r.Duration.String()},
		}
		table.Body.Cells = append(table.Body.Cells, row)
	}

	fmt.Println(table.String())
}

func runSimple(t *testing.T, wg *sync.WaitGroup, res []result, idx int, input, codec string, fn test, ops []op) {
	defer wg.Done()

	start := time.Now()

	var b bytes.Buffer
	fn(t, &b, ops)

	res[idx] = result{
		Input:     input,
		Codec:     codec + "     ",
		SizeBytes: b.Len(),
		SizeKB:    b.Len() / 1024,
		Duration:  time.Since(start),
	}
}

func runZlib(t *testing.T, wg *sync.WaitGroup, res []result, idx int, input, codec string, fn test, ops []op) {
	defer wg.Done()

	start := time.Now()

	b := &bytes.Buffer{}

	w, err := zlib.NewWriterLevel(b, zlib.DefaultCompression)
	require.NoError(t, err)

	fn(t, w, ops)

	require.NoError(t, w.Close())

	res[idx] = result{
		Input:     input,
		Codec:     codec + ".zlib",
		SizeBytes: b.Len(),
		SizeKB:    b.Len() / 1024,
		Duration:  time.Since(start),
	}
}

func runZstd(t *testing.T, wg *sync.WaitGroup, res []result, idx int, input, codec string, fn test, ops []op) {
	defer wg.Done()

	start := time.Now()

	b := &bytes.Buffer{}

	w := zstd.NewWriterLevel(b, zstd.DefaultCompression)

	fn(t, w, ops)

	require.NoError(t, w.Close())

	res[idx] = result{
		Input:     input,
		Codec:     codec + ".zstd",
		SizeBytes: b.Len(),
		SizeKB:    b.Len() / 1024,
		Duration:  time.Since(start),
	}
}

func encodeGOB(t *testing.T, w io.Writer, ops []op) {
	enc := gob.NewEncoder(w)
	require.NoError(t, enc.Encode(ops))
}

func encodeJSON(t *testing.T, w io.Writer, ops []op) {
	enc := json.NewEncoder(w)
	require.NoError(t, enc.Encode(ops))
}

func encodeCBOR(t *testing.T, w io.Writer, ops []op) {
	enc := cbor.NewEncoder(w)
	require.NoError(t, enc.Encode(ops))
}

func encodeProtoPacked(t *testing.T, w io.Writer, ops []op) {
	var (
		nodes lookup
		sites lookup
		keys  lookup
	)

	change := &PackedChange{
		Lookup: &PackedLookup{},
		Moves:  &PackedMove{},
		Attrs:  &PackedKeys{},
	}

	for _, o := range ops {
		switch item := o.(type) {
		case blockMove:
			site := sites.Shorten(item.ID.Site)
			clock := item.ID.Clock
			node := nodes.Shorten(item.Node)
			parent := nodes.Shorten(item.Parent)
			leftSite := sites.Shorten(item.Left.Site)
			leftClock := item.Left.Clock

			change.Moves.Site = append(change.Moves.Site, int64(site))
			change.Moves.Clock = append(change.Moves.Clock, int64(clock))
			change.Moves.Node = append(change.Moves.Node, int64(node))
			change.Moves.Parent = append(change.Moves.Parent, int64(parent))
			change.Moves.LeftSite = append(change.Moves.LeftSite, int64(leftSite))
			change.Moves.LeftClock = append(change.Moves.LeftClock, int64(leftClock))
		case setKey:
			site := sites.Shorten(item.ID.Site)
			clock := item.ID.Clock
			node := nodes.Shorten(item.Node)
			key := keys.Shorten(item.Key)

			change.Attrs.Site = append(change.Attrs.Site, int64(site))
			change.Attrs.Clock = append(change.Attrs.Clock, int64(clock))
			change.Attrs.Node = append(change.Attrs.Node, int64(node))
			change.Attrs.Key = append(change.Attrs.Key, int64(key))
			change.Attrs.Value = append(change.Attrs.Value, []byte(item.Value.(string)))
		}
	}

	change.Lookup.Nodes = nodes.Slice()
	change.Lookup.Sites = sites.Slice()
	change.Lookup.Keys = keys.Slice()

	data, err := proto.Marshal(change)
	require.NoError(t, err)

	_, err = w.Write(data)
	require.NoError(t, err)
}

func encodeProtoShortened(t *testing.T, w io.Writer, ops []op) {
	var (
		nodes lookup
		sites lookup
		keys  lookup
	)

	change := &ChangePB{}

	for _, o := range ops {
		switch item := o.(type) {
		case blockMove:
			site := sites.Shorten(item.ID.Site)
			clock := item.ID.Clock
			node := nodes.Shorten(item.Node)
			parent := nodes.Shorten(item.Parent)
			leftSite := sites.Shorten(item.Left.Site)
			leftClock := item.Left.Clock

			change.Ops = append(change.Ops, &OpPB{
				Site:      int64(site),
				Clock:     int64(clock),
				Node:      int64(node),
				Parent:    int64(parent),
				LeftSite:  int64(leftSite),
				LeftClock: int64(leftClock),
			})
		case setKey:
			site := sites.Shorten(item.ID.Site)
			clock := item.ID.Clock
			node := nodes.Shorten(item.Node)
			key := keys.Shorten(item.Key)
			var value isOpPB_Value
			if item.Key == "content" {
				value = &OpPB_Json{
					Json: item.Value.(string),
				}
			} else {
				value = &OpPB_String_{
					String_: item.Value.(string),
				}
			}

			change.Ops = append(change.Ops, &OpPB{
				Site:  int64(site),
				Clock: int64(clock),
				Node:  int64(node),
				Key:   int64(key),
				Value: value,
			})
		}
	}

	change.Nodes = nodes.Slice()
	change.Sites = sites.Slice()
	change.Keys = keys.Slice()

	data, err := proto.Marshal(change)
	require.NoError(t, err)

	_, err = w.Write(data)
	require.NoError(t, err)
}

func encodeProtoFull(t *testing.T, w io.Writer, ops []op) {
	change := &FullChange{
		Ops: make([]*FullOp, len(ops)),
	}

	for i, o := range ops {
		switch item := o.(type) {
		case blockMove:
			change.Ops[i] = &FullOp{
				Site:      item.ID.Site,
				Clock:     int64(item.ID.Clock),
				Node:      item.Node,
				Parent:    item.Parent,
				LeftSite:  item.Left.Site,
				LeftClock: int64(item.Left.Clock),
			}
		case setKey:
			change.Ops[i] = &FullOp{
				Site:  item.ID.Site,
				Clock: int64(item.ID.Clock),
				Node:  item.Node,
				Key:   item.Key,
				Value: item.Value.(string),
			}
		}
	}

	data, err := proto.Marshal(change)
	require.NoError(t, err)

	_, err = w.Write(data)
	require.NoError(t, err)
}

func walkTestdata(t *testing.T, filename string) []op {
	wlk := blockdoc.NewWalkHandlers()
	front := crdt.NewVectorClock()

	newID := func(site string) crdt.ID {
		id := front.NewID(site)
		require.NoError(t, front.Track(id))
		return id
	}

	var ops []op

	var (
		leftSibling ID
	)
	wlk.HandleListStart = func(id string) error {
		leftSibling = ID{}
		return nil
	}
	wlk.HandleListAttribute = func(id, key string, value interface{}) error {
		ops = append(ops, setKey{
			ID:    newID("alice"),
			Node:  id,
			Key:   key,
			Value: value,
		})

		return nil
	}
	wlk.HandleBlockStart = func(id, parent string, depth int) error {
		if parent == "" {
			parent = crdt.RootNodeID
		}

		move := blockMove{
			ID:     newID("alice"),
			Node:   id,
			Parent: parent,
			Left:   leftSibling,
		}

		ops = append(ops, move)

		leftSibling = move.ID
		return nil
	}
	wlk.HandleBlockAttribute = func(id, key string, value interface{}) error {
		ops = append(ops, setKey{
			ID:    newID("alice"),
			Node:  id,
			Key:   key,
			Value: value,
		})
		return nil
	}
	wlk.HandleBlockContent = func(id, content string) error {
		ops = append(ops, setKey{
			ID:    newID("alice"),
			Node:  id,
			Key:   "content",
			Value: content,
		})
		return nil
	}

	data, err := ioutil.ReadFile(mtast.TestFilePath(filename))
	require.NoError(t, err)

	require.NoError(t, mtast.Walk(string(data), wlk))

	return ops
}

type lookup struct {
	m    map[string]int
	next int
}

func (l *lookup) Shorten(v string) int {
	if l.m == nil {
		l.m = map[string]int{}
	}

	n, ok := l.m[v]
	if ok {
		return n
	}

	n = l.next
	l.next++
	l.m[v] = n

	return n
}

func (l *lookup) Slice() []string {
	out := make([]string, len(l.m))

	for k, v := range l.m {
		out[v] = k
	}

	return out
}
