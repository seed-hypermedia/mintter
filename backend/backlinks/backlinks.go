// Package backlinks should not exist. It will be removed in Build 11.
//
// TODO(burdiyan): build11: remove this.
package backlinks

import (
	"fmt"
	"regexp"

	documents "mintter/backend/genproto/documents/v1alpha"
	"mintter/backend/ipfs"
	"mintter/backend/vcs"
	"mintter/backend/vcs/mttdoc"
	vcsdb "mintter/backend/vcs/sqlitevcs"
	"mintter/backend/vcs/vcssql"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
	"google.golang.org/protobuf/proto"
)

// IndexDatom is a callback function for indexing backlinks from datoms.
// It should not exist, and it's here only for compatibility wth the old code.
// It will be removed in Build 11 when we implement proper granular block CRDT.
//
// TODO(burdiyan): remove this. Search for other places with build11.
func IndexDatom(conn *vcsdb.Conn, obj, change vcsdb.LocalID, d vcsdb.Datom) error {
	if d.Attr != mttdoc.AttrBlockSnapshot {
		return nil
	}

	blk := &documents.Block{}
	if err := proto.Unmarshal(d.Value.([]byte), blk); err != nil {
		return fmt.Errorf("failed to unmarshal content block: %w", err)
	}

	return indexBacklinks(conn, obj, change, blk)
}

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

var linkRegex = regexp.MustCompile(`^(?:mtt|mintter):\/\/([a-z0-9]+)\/([a-z0-9]+)\/?([^\/]+)?$`)

func parseLink(s string) (link, error) {
	match := linkRegex.FindStringSubmatch(s)
	if l := len(match); l < 3 || l > 4 {
		return link{}, fmt.Errorf("malformed mintter link %s", s)
	}

	var out link
	for i, part := range match {
		switch i {
		case 0:
			// Skip the original full match.
			continue
		case 1:
			docid, err := cid.Decode(part)
			if err != nil {
				return link{}, fmt.Errorf("failed to parse document id from link %s", s)
			}
			out.TargetDocument = docid
		case 2:
			_, err := vcs.ParseVersion(part)
			if err != nil {
				return link{}, fmt.Errorf("failed to parse version from link %s", s)
			}
			out.TargetVersion = part
		case 3:
			out.TargetBlock = part
		default:
			return link{}, fmt.Errorf("unexpected link segment in link %s", s)
		}
	}

	return out, nil
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
