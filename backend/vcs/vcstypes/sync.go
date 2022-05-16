package vcstypes

import (
	"context"
	"fmt"
	"mintter/backend/core"
	"mintter/backend/vcs"
	"sort"
	"time"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	exchange "github.com/ipfs/go-ipfs-exchange-interface"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"go.uber.org/multierr"
)

type Syncer struct {
	vcs   *vcs.SQLite
	index *Index

	// TODO: this shouldn't be needed. Need to implement hydrating the object from a version set of multiple peers.
	me core.Identity
}

func NewSyncer(idx *Index, me core.Identity) *Syncer {
	return &Syncer{
		index: idx,
		vcs:   idx.vcs,
		me:    me,
	}
}

func (s *Syncer) SyncFromVersion(ctx context.Context, acc, device, obj cid.Cid, sess exchange.Fetcher, remoteVer vcs.Version) error {
	bs := s.vcs.Blockstore()

	var permanode vcs.Permanode
	{
		// Important to check before using bitswap, because it would add the fetched block into out blockstore,
		// without any mintter-specific indexing.
		has, err := bs.Has(ctx, obj)
		if err != nil {
			return err
		}

		// Indicate to the bitswap session to prefer peers who have the permanode block.
		perma, err := sess.GetBlock(ctx, obj)
		if err != nil {
			return err
		}

		// CBOR decoder will complain if struct has missing fields, so we can't use BasePermanode here,
		// and instead have to use a map. It's pain in the butt.
		// TODO: fix this!
		var v interface{}
		if err := cbornode.DecodeInto(perma.RawData(), &v); err != nil {
			return err
		}

		p, err := permanodeFromMap(v)
		if err != nil {
			return err
		}

		permanode = p

		if !has {
			if err := s.vcs.StorePermanode(ctx, perma, p); err != nil {
				return err
			}
		}
	}

	remoteChanges, err := fetchMissingChanges(ctx, s.vcs, obj, sess, remoteVer)
	if err != nil {
		return fmt.Errorf("failed to fetch missing changes: %w", err)
	}

	if remoteChanges == nil {
		return nil
	}

	localVer, err := s.vcs.LoadNamedVersion(ctx, obj, s.me.AccountID(), s.me.DeviceKey().CID(), "main")
	if err != nil {
		if !vcs.IsErrNotFound(err) {
			return err
		}
	}

	switch permanode.PermanodeType() {
	case AccountType:
		acc := NewAccount(obj, permanode.PermanodeOwner())

		if err := s.vcs.IterateChanges(ctx, obj, localVer, func(rc vcs.RecordedChange) error {
			return acc.ApplyChange(rc.ID, rc.Change)
		}); err != nil {
			return err
		}

		for _, f := range remoteChanges {
			var evts []AccountEvent
			if err := cbornode.DecodeInto(f.sc.Payload.Body, &evts); err != nil {
				return err
			}

			for _, evt := range evts {
				if err := acc.Apply(evt, f.sc.Payload.CreateTime); err != nil {
					return err
				}
			}

			if err := s.index.IndexAccountChange(ctx, f.Cid(), f.sc.Payload, evts); err != nil {
				return err
			}
		}

		// TODO: Index account
		if err := s.vcs.StoreNamedVersion(ctx, obj, s.me, "main", remoteVer); err != nil {
			return err
		}
	// case DocumentType:
	// Load apply store
	default:
		return fmt.Errorf("unsupported permanode type %s", permanode.PermanodeType())
	}

	return nil
}

func permanodeFromMap(v interface{}) (p vcs.Permanode, err error) {
	defer func() {
		if stack := recover(); stack != nil {
			err = multierr.Append(err, fmt.Errorf("failed to convert map into permanode: %v", stack))
		}
	}()

	var base vcs.BasePermanode

	base.Type = vcs.ObjectType(v.(map[string]interface{})["@type"].(string))
	base.Owner = v.(map[string]interface{})["owner"].(cid.Cid)
	t := v.(map[string]interface{})["createTime"].(string)

	tt, err := time.ParseInLocation(time.RFC3339, t, time.UTC)
	if err != nil {
		return nil, fmt.Errorf("failed to parse permanode create time: %w", err)
	}

	base.CreateTime = tt

	return base, nil
}

type verifiedChange struct {
	blocks.Block
	sc vcs.SignedCBOR[vcs.Change]
}

func fetchMissingChanges(ctx context.Context, v *vcs.SQLite, obj cid.Cid, sess exchange.Fetcher, ver vcs.Version) ([]verifiedChange, error) {
	queue := ver.CIDs()

	visited := make(map[cid.Cid]struct{}, ver.TotalCount())

	fetched := make([]verifiedChange, 0, 10) // Arbitrary buffer to reduce allocations when buffer grows.

	for len(queue) > 0 {
		last := len(queue) - 1
		id := queue[last]
		queue = queue[:last]

		has, err := v.Blockstore().Has(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to check if change %s is present: %w", id, err)
		}

		// Stop if we've seen this node already or we have it stored locally.
		if _, ok := visited[id]; ok || has {
			continue
		}

		blk, err := sess.GetBlock(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch change %s: %w", id, err)
		}

		sc, err := vcs.ParseChangeBlock(blk)
		if err != nil {
			return nil, err
		}

		if !sc.Payload.Object.Equals(obj) {
			return nil, fmt.Errorf("change for unrelated object: got = %s, want = %s", sc.Payload.Object, obj)
		}

		if err := sc.Verify(); err != nil {
			return nil, fmt.Errorf("failed to verify change %s: %w", id, err)
		}

		fetched = append(fetched, verifiedChange{Block: blk, sc: sc})

		visited[id] = struct{}{}

		for _, p := range sc.Payload.Parents {
			queue = append(queue, p)
		}
	}

	sort.Slice(fetched, func(i, j int) bool {
		return fetched[i].sc.Payload.LamportTime < fetched[j].sc.Payload.LamportTime
	})

	return fetched, nil
}
