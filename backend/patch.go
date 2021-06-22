package backend

import (
	"bytes"
	"context"
	"fmt"
	"time"

	p2p "mintter/api/go/p2p/v1alpha"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"golang.org/x/sync/errgroup"
)

func init() {
	cbornode.RegisterCborType(Patch{})
}

type PatchKind string

type Patch struct {
	// CID-encoded ID of the author of the patch.
	Author cid.Cid

	// CID-encoded object ID.
	ObjectID cid.Cid

	// A list of CIDs of patches that are required to apply this patch.
	// The dependent patches must refer to the same Object IDs.
	// Only direct dependencies must be specified, and only one
	// for each peer, e.g. for a sequence of patches A ← B ← C,
	// patch C must only specify B as its dependency.
	// The first item in the list must be the previous patch of this peer and object.
	Deps []cid.Cid

	// A monotonically increasing counter that must have no gaps
	// within the same device and ObjectID.
	Seq uint64

	// A Lamport timestamp. Each peer keeps a logical clock
	// per object, and when creating a new patch the
	// author must assign a timestamp which is an increment of
	// the maximal timestamp among all other peers' timestamps
	// the author knows about.
	LamportTime uint64

	// Log timestamps as defined in the Chronofold paper.
	LogTime uint64

	// An arbitrary string that lets the client know
	// about what's inside the body of the patch.
	// This is important to make the system evolvable and future-proof.
	Kind PatchKind

	// An arbitrary byte buffer.
	// Could be serialized list of discrete operations,
	// or anything else that is relevant to the application.
	Body []byte

	// An optional human-readable message.
	Message string

	// A physical timestamp of creation of this patch, for convenience.
	CreateTime time.Time
}

func (p Patch) Less(pp Patch) bool {
	if p.LamportTime == pp.LamportTime {
		return bytes.Compare(p.Author.Bytes(), pp.Author.Bytes()) == -1
	}

	return p.LamportTime < pp.LamportTime
}

type blockGetter interface {
	GetBlock(context.Context, cid.Cid) (blocks.Block, error)
}

type blockstoreGetter struct {
	blockstore.Blockstore
}

func (bg *blockstoreGetter) GetBlock(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	return bg.Get(c)
}

func resolvePatches(ctx context.Context, obj cid.Cid, ver *p2p.Version, bgetter blockGetter) (*state, error) {
	heads := ver.VersionVector
	if heads == nil {
		return newState(obj, nil), nil
	}

	g, ctx := errgroup.WithContext(ctx)

	out := make([][]signedPatch, len(heads))

	for i, h := range heads {
		i := i
		h := h
		out[i] = make([]signedPatch, h.Seq) // Allocate enough space to store all the known patches.
		g.Go(func() error {
			next, err := cid.Decode(h.Head)
			if err != nil {
				return fmt.Errorf("bad head CID: %w", err)
			}

			idx := h.Seq - 1

			// TODO: check if object and peer are the same between iterations.
			for next.Defined() {
				select {
				case <-ctx.Done():
					return ctx.Err()
				default:
					blk, err := bgetter.GetBlock(ctx, next)
					if err != nil {
						return err
					}

					sp, err := decodePatchBlock(blk)
					if err != nil {
						return err
					}

					out[i][idx] = sp
					idx--

					if len(sp.Deps) > 1 {
						panic("BUG: multiple deps are not implemented yet")
					}

					if len(sp.Deps) == 0 {
						next = cid.Undef
					} else {
						next = sp.Deps[0]
					}
				}
			}

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return newState(obj, out), nil
}

func mergeVersions(vers ...*p2p.Version) *p2p.Version {
	merged := make(map[string]*p2p.PeerVersion)

	var obj string
	for _, v := range vers {
		if v.ObjectId == "" {
			panic("BUG: version without object id")
		}

		if obj == "" {
			obj = v.ObjectId
		}

		if obj != v.ObjectId {
			panic("BUG: merging versions of unrelated objects")
		}

		for _, pv := range v.VersionVector {
			m := merged[pv.Peer]
			if m == nil || pv.Seq > m.Seq {
				merged[pv.Peer] = pv
			}
		}
	}

	out := &p2p.Version{
		ObjectId:      obj,
		VersionVector: make([]*p2p.PeerVersion, len(merged)),
	}

	var i int
	for _, pv := range merged {
		out.VersionVector[i] = pv
		i++
	}

	return out
}
