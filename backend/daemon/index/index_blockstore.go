package index

import (
	"context"
	"seed/backend/ipfs"

	"crawshaw.io/sqlite/sqlitex"
	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	"github.com/multiformats/go-multicodec"
)

func (idx *Index) Put(ctx context.Context, blk blocks.Block) error {
	conn, release, err := idx.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		codec, hash := ipfs.DecodeCID(blk.Cid())
		id, exists, err := idx.bs.putBlock(conn, 0, codec, hash, blk.RawData())
		if err != nil {
			return err
		}

		if exists || !isIndexable(multicodec.Code(codec)) {
			return nil
		}

		hb, err := DecodeBlob(blk.Cid(), blk.RawData())
		if err != nil {
			return err
		}
		return idx.indexBlob(conn, id, hb.CID, hb.Decoded)
	})
}

func (idx *Index) PutMany(ctx context.Context, blks []blocks.Block) error {
	conn, release, err := idx.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer release()

	return sqlitex.WithTx(conn, func() error {
		for _, blk := range blks {
			codec, hash := ipfs.DecodeCID(blk.Cid())
			id, exists, err := idx.bs.putBlock(conn, 0, codec, hash, blk.RawData())
			if err != nil {
				return err
			}

			if exists || !isIndexable(multicodec.Code(codec)) {
				continue
			}

			hb, err := DecodeBlob(blk.Cid(), blk.RawData())
			if err != nil {
				return err
			}

			if err := idx.indexBlob(conn, id, hb.CID, hb.Decoded); err != nil {
				return err
			}
		}

		return nil
	})
}

func (idx *Index) DeleteBlock(ctx context.Context, c cid.Cid) error {
	return idx.bs.DeleteBlock(ctx, c)
}

func (idx *Index) Has(ctx context.Context, c cid.Cid) (bool, error) {
	return idx.bs.Has(ctx, c)
}

func (idx *Index) Get(ctx context.Context, c cid.Cid) (blocks.Block, error) {
	return idx.bs.Get(ctx, c)
}

func (idx *Index) GetSize(ctx context.Context, c cid.Cid) (int, error) {
	return idx.bs.GetSize(ctx, c)
}

func (idx *Index) AllKeysChan(ctx context.Context) (<-chan cid.Cid, error) {
	return idx.bs.AllKeysChan(ctx)
}

func (idx *Index) HashOnRead(enabled bool) {
	panic("BUG: DO NOT USE THIS!")
}
