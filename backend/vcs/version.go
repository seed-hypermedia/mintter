package vcs

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"

	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multibase"
)

// Version defines a version of a Mintter Object.
// It's a set of leaf nodes of the Time DAG.
type Version struct {
	totalCount uint64
	cids       []cid.Cid
}

func NewVersion(totalCount uint64, cc ...cid.Cid) Version {
	// TODO: sort and maybe copy the slice?

	return Version{
		totalCount: totalCount,
		cids:       cc,
	}
}

func ParseVersion(s string) (Version, error) {
	if s == "" {
		return Version{}, nil
	}

	_, data, err := multibase.Decode(s)
	if err != nil {
		return Version{}, fmt.Errorf("failed to decode version string: %w", err)
	}

	r := bytes.NewReader(data)

	count, err := binary.ReadUvarint(r)
	if err != nil {
		return Version{}, err
	}

	var cids []cid.Cid
	for {
		_, c, err := cid.CidFromReader(r)
		if err != nil && errors.Is(err, io.EOF) {
			return Version{}, err
		}

		if errors.Is(err, io.EOF) {
			break
		}

		cids = append(cids, c)
	}

	// TODO: check that sort is canonical

	return Version{
		totalCount: count,
		cids:       cids,
	}, nil
}

func (v Version) TotalCount() uint64 { return v.totalCount }

func (v Version) CIDs() []cid.Cid {
	out := make([]cid.Cid, len(v.cids))
	copy(out, v.cids)
	return out
}

func (v Version) String() string {
	if v.cids == nil {
		return ""
	}

	if v.totalCount == 0 {
		panic("BUG: invalid version")
	}

	buf := make([]byte, binary.MaxVarintLen64)
	n := binary.PutUvarint(buf, v.totalCount)

	var b bytes.Buffer

	if _, err := b.Write(buf[:n]); err != nil {
		panic(err)
	}

	for _, c := range v.cids {
		_, err := c.WriteBytes(&b)
		if err != nil {
			panic(err)
		}
	}

	out, err := multibase.Encode(multibase.Base32, b.Bytes())
	if err != nil {
		panic(err)
	}

	return out
}

// IsZero checks if version is empty.
func (v Version) IsZero() bool {
	return v.cids == nil
}
