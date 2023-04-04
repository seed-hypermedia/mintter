package documents

import (
	"fmt"
	"net/url"

	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/vcs"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"mintter/backend/vcs/vcssql"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
)

func indexBacklinks(conn *vcsdb.Conn, obj, change vcsdb.LocalID, blk *documents.Block) error {
	ver := conn.LocalVersionToPublic(vcsdb.LocalVersion{change})

	if conn.Err() != nil {
		return conn.Err()
	}

	for _, a := range blk.Annotations {
		if a.Type != "link" && a.Type != "embed" {
			continue
		}

		// Malformed link. Must have url attribute.
		if a.Attributes == nil {
			continue
		}

		url := a.Attributes["url"]

		// Malformed URL.
		if url == "" {
			continue
		}

		link, err := parseLink(url)
		if err != nil {
			continue
		}

		tdocid, err := ensureIPFSBlock(conn.InternalConn(), link.TargetDocument)
		if err != nil {
			return err
		}

		if err := vcssql.ContentLinksInsert(conn.InternalConn(),
			int64(obj),
			blk.Id,
			int64(change),
			ver.String(),
			int64(tdocid),
			link.TargetBlock,
			link.TargetVersion,
		); err != nil {
			return fmt.Errorf("failed to insert link: %w", err)
		}
	}

	return conn.Err()
}

type link struct {
	TargetDocument cid.Cid
	TargetVersion  string
	TargetBlock    string
}

func parseLink(s string) (l link, err error) {
	u, err := url.Parse(s)
	if err != nil {
		return l, err
	}

	if u.Scheme != "mintter" {
		return l, fmt.Errorf("not a mintter link")
	}

	l.TargetDocument, err = cid.Decode(u.Hostname())
	if err != nil {
		return l, fmt.Errorf("failed to parse document id from link %s: %w", s, err)
	}

	if v := u.Query().Get("v"); v != "" {
		if _, err = vcs.ParseVersion(v); err != nil {
			return l, fmt.Errorf("failed to parse version from link %s: %w", s, err)
		}
		l.TargetVersion = v
	}

	if blk := u.Fragment; blk != "" {
		l.TargetBlock = blk
	}

	return l, nil
}

func ensureIPFSBlock(conn *sqlite.Conn, c cid.Cid) (int64, error) {
	codec, hash := ipfs.DecodeCID(c)
	res, err := vcssql.IPFSBlocksLookupPK(conn, hash)
	if err != nil {
		return 0, err
	}

	if res.IPFSBlocksID != 0 {
		return res.IPFSBlocksID, nil
	}

	upsert, err := vcssql.IPFSBlocksUpsert(conn, hash, int64(codec), nil, -1)
	if err != nil {
		return 0, err
	}

	if upsert.IPFSBlocksID == 0 {
		panic("BUG: didn't insert pending IPFS block")
	}

	return upsert.IPFSBlocksID, nil
}
