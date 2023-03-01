package sitesql

import (
	"io/ioutil"
	site "mintter/backend/genproto/documents/v1alpha"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
	"go.uber.org/multierr"
)

const (
	siteTitle           = " My Site"
	modifiedTitle       = "@nother title"
	siteDescription     = " This is a nice description of the site"
	modifiedDescription = "Short description"

	token1 = "ASDFG123"
	token2 = "QWERT987"

	fakeDoc        = "bafy2bzaceb35vgp7p7hxltutkkk5d5b6cw3z6pjllok57guq2hhvoku44omri"
	invalidVersion = "this is an invalid version"

	//S1_V1->T1_V1.
	sourceDoc1ID = "bafy2bzacedgsqq7lw6jmbsixcjhg5wjv42mbjotmarttyqlburrpsyspskayi"
	sourceDoc1V1 = "baeaxdiheaiqo3pqxy3lvkdrntpnaogz4da73ws22yxp2alabviu3xm5s3tjde3y"

	//S1_V2->(T1_V1,T1_V2).
	sourceDoc1V2 = "baeaxdiheaiqjzvdicuiypxelczqdh353o63rg7dptvhki6umtbu254hkqaiqojq"

	//S2_V1->(T1_V1,T1_V2).
	sourceDoc2ID = "bafy2bzaceartk32v37q5nmq6gjgbfsoruwykgv6vwndkavtpab5lioi7mewge"
	sourceDoc2V1 = "baeaxdiheaiqacjh7uzuktklks4eipimgxxlvzkk2ubdc3fjyzu3xtxoyb67k4uq"

	targetDoc1ID = "bafy2bzaceadbhipjlori7wbwzqx6wec4lfxqhbo75be63flm5bwppnjjm6rv4"
	targetDoc1V1 = "baeaxdiheaiqgskjzhzft4i4v26vmiptjngnyo7nkhzzmgktgb655jlkpllqrdli"
	targetDoc1V2 = "baeaxdiheaiqaijuq5faa46npfcv3isrhakmbtsnmxv42dgv5hcxswsxismbmisi"

	path1     = "/"
	path2     = "other-path"
	path3     = "another-path"
	blankPath = ""

	hostname1 = "https://example.com"
	hostname2 = "http://127.0.0.1:56001"

	addrs1 = "/ip4/172.20.0.2/tcp/56000/p2p/12D3KooWS9vJ7sfXZ4JXKwKhaa2t9igpsuxtVwJ85ZC4rUZ6iukv,/ip4/127.0.0.1/tcp/56000/p2p/12D3KooWS9vJ7sfXZ4JXKwKhaa2t9igpsuxtVwJ85ZC4rUZ6iukv"
	addrs2 = "/ip4/52.22.139.174/tcp/4002/p2p/12D3KooWGvsbBfcbnkecNoRBM7eUTiuriDqUyzu87pobZXSdUUsJ/p2p-circuit/p2p/12D3KooWS9vJ7sfXZ4JXKwKhaa2t9igpsuxtVwJ85ZC4rUZ6iukv,/ip4/23.20.24.146/tcp/4002/p2p/12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq/p2p-circuit/p2p/12D3KooWS9vJ7sfXZ4JXKwKhaa2t9igpsuxtVwJ85ZC4rUZ6iukv"

	validAccount = "bahezrj4iaqacicabciqfnrov4niome6csw43r244roia35q6fiak75bmapk2zjudj3uffea" // leads to this multihash in binary x'00240801122056C5D5E350E613C295B9B8EB9C8B900DF61E2A00AFF42C03D5ACA6834EE85290
	fakeAccount  = "bahezrj4iaqacicabciqhpkuxan2hm6vfh6rek3mvvs54wj5utodglwdrcatmif7jpmllyui"
)

var (
	futureTime = time.Now().Add(time.Minute)
	pastTime   = time.Now().Add(-time.Minute)
)

func TestSiteOptions(t *testing.T) {
	conn, closer, err := makeConn()
	require.NoError(t, err)
	defer func() { require.NoError(t, closer()) }()

	{
		title, err := GetSiteTitle(conn)
		require.NoError(t, err)
		require.Equal(t, "", title)
		description, err := GetSiteDescription(conn)
		require.NoError(t, err)
		require.Equal(t, "", description)

		require.NoError(t, SetSiteTitle(conn, siteTitle))
		title, err = GetSiteTitle(conn)
		require.NoError(t, err)
		require.Equal(t, siteTitle, title)
		require.NoError(t, SetSiteTitle(conn, modifiedTitle))
		title, err = GetSiteTitle(conn)
		require.NoError(t, err)
		require.Equal(t, modifiedTitle, title)

		require.NoError(t, SetSiteDescription(conn, siteDescription))
		description, err = GetSiteDescription(conn)
		require.NoError(t, err)
		require.Equal(t, siteDescription, description)
		require.NoError(t, SetSiteDescription(conn, modifiedDescription))
		description, err = GetSiteDescription(conn)
		require.NoError(t, err)
		require.Equal(t, modifiedDescription, description)
	}
}

func TestSites(t *testing.T) {
	conn, closer, err := makeConn()
	require.NoError(t, err)
	defer func() { require.NoError(t, closer()) }()
	{
		accountCID, err := cid.Decode(validAccount)
		require.NoError(t, err)
		require.NoError(t, AddSite(conn, accountCID, strings.Split(addrs1, ","), hostname1, int64(site.Member_EDITOR)))
		localSite, err := GetSite(conn, hostname1)
		require.NoError(t, err)
		require.Equal(t, int(site.Member_EDITOR), localSite.Role)
		require.Equal(t, accountCID, localSite.AccID)
		require.Equal(t, strings.Split(addrs1, ","), localSite.Addresses)
		require.NoError(t, AddSite(conn, accountCID, strings.Split(addrs1, ","), hostname1, int64(site.Member_EDITOR)))

		accountCIDFake, err := cid.Decode(fakeAccount)
		require.NoError(t, err)
		require.Error(t, AddSite(conn, accountCIDFake, strings.Split(addrs1, ","), hostname1, int64(site.Member_EDITOR)))

		sites, err := ListSites(conn)
		require.NoError(t, err)
		require.Len(t, sites, 1)
		localSite, ok := sites[hostname1]
		require.True(t, ok)
		require.Equal(t, int(site.Member_EDITOR), localSite.Role)
		require.Equal(t, accountCID, localSite.AccID)
		require.Equal(t, strings.Split(addrs1, ","), localSite.Addresses)

		require.NoError(t, RemoveSite(conn, hostname2))
		require.NoError(t, RemoveSite(conn, hostname1))
		sites, err = ListSites(conn)
		require.NoError(t, err)
		require.Len(t, sites, 0)
	}
}

func TestRecords(t *testing.T) {
	conn, closer, err := makeConn()
	require.NoError(t, err)
	defer func() { require.NoError(t, closer()) }()
	{
		targetCID, err := cid.Decode(targetDoc1ID)
		require.NoError(t, err)
		source1CID, err := cid.Decode(sourceDoc1ID)
		require.NoError(t, err)
		source2CID, err := cid.Decode(sourceDoc2ID)
		require.NoError(t, err)

		require.NoError(t, AddWebPublicationRecord(conn, targetCID, targetDoc1V1, path1))
		record, err := GetWebPublicationRecordByVersion(conn, targetCID, targetDoc1V1)
		require.NoError(t, err)
		require.Equal(t, targetCID, record.Document.ID)
		require.Equal(t, targetDoc1V1, record.Document.Version)
		require.Equal(t, path1, record.Path)
		require.Len(t, record.References, 0)
		docCIDFake, err := cid.Decode(fakeDoc)
		require.NoError(t, err)
		require.Error(t, AddWebPublicationRecord(conn, docCIDFake, targetDoc1V1, path2))
		//Same document different version in other path
		require.Error(t, AddWebPublicationRecord(conn, targetCID, targetDoc1V2, path2))
		//Same document different version in same path
		require.Error(t, AddWebPublicationRecord(conn, targetCID, targetDoc1V2, path1))
		require.Error(t, AddWebPublicationRecord(conn, source1CID, sourceDoc1V1, path1))
		require.NoError(t, RemoveWebPublicationRecord(conn, targetCID, targetDoc1V1))
		require.NoError(t, AddWebPublicationRecord(conn, targetCID, targetDoc1V2, path1))
		record, err = GetWebPublicationRecordByVersion(conn, targetCID, targetDoc1V2)
		require.NoError(t, err)
		require.Equal(t, targetCID, record.Document.ID)
		require.Equal(t, targetDoc1V2, record.Document.Version)
		require.Equal(t, path1, record.Path)
		require.Len(t, record.References, 0)

		records, err := ListWebPublicationRecords(conn)
		require.NoError(t, err)
		require.Len(t, records, 1)
		listedPath, ok := records[DocInfo{ID: targetCID, Version: targetDoc1V2}]
		require.True(t, ok)
		require.Equal(t, path1, listedPath)

		//require.Error(t, AddWebPublicationRecord(conn, docCID, sourceVersion, blankPath))
		require.NoError(t, AddWebPublicationRecord(conn, source1CID, sourceDoc1V1, path2))
		require.Error(t, AddWebPublicationRecord(conn, source1CID, sourceDoc1V2, path3))

		record, err = GetWebPublicationRecordByVersion(conn, source1CID, sourceDoc1V1)
		require.NoError(t, err)
		require.Equal(t, source1CID, record.Document.ID)
		require.Equal(t, sourceDoc1V1, record.Document.Version)
		require.Equal(t, path2, record.Path)
		require.Len(t, record.References, 1)
		require.Equal(t, targetDoc1V1, record.References[0].Version)
		require.Equal(t, targetCID, record.References[0].ID)
		require.NoError(t, RemoveWebPublicationRecord(conn, docCIDFake, sourceDoc1V1))
		records, err = ListWebPublicationRecords(conn)
		require.NoError(t, err)
		require.Len(t, records, 2)

		docByPath, err := GetWebPublicationRecordByPath(conn, path2)
		require.NoError(t, err)
		require.Equal(t, source1CID, docByPath.Document.ID)
		require.Equal(t, sourceDoc1V1, docByPath.Document.Version)

		require.NoError(t, AddWebPublicationRecord(conn, source2CID, sourceDoc2V1, path3))
		records, err = ListWebPublicationRecords(conn)
		require.NoError(t, err)
		require.Len(t, records, 3)
		record, err = GetWebPublicationRecordByVersion(conn, source2CID, sourceDoc2V1)
		require.NoError(t, err)

		require.Equal(t, source2CID, record.Document.ID)
		require.Equal(t, sourceDoc2V1, record.Document.Version)
		require.Equal(t, path3, record.Path)
		require.Len(t, record.References, 2)
		require.Equal(t, targetDoc1V1, record.References[0].Version)
		require.Equal(t, targetCID, record.References[0].ID)
		require.Equal(t, targetDoc1V2, record.References[1].Version)
		require.Equal(t, targetCID, record.References[1].ID)
	}
}

func TestMembers(t *testing.T) {
	conn, closer, err := makeConn()
	require.NoError(t, err)
	defer func() { require.NoError(t, closer()) }()
	{
		accountCID, err := cid.Decode(validAccount)
		require.NoError(t, err)
		require.NoError(t, AddMember(conn, accountCID, int64(site.Member_EDITOR)))
		role, err := GetMemberRole(conn, accountCID)
		require.NoError(t, err)
		require.Equal(t, site.Member_EDITOR, role)
		accountCIDFake, err := cid.Decode(fakeAccount)
		require.NoError(t, err)
		_, err = GetMemberRole(conn, accountCIDFake)
		require.Error(t, err)
		require.NoError(t, AddMember(conn, accountCID, int64(site.Member_EDITOR)))
		members, err := ListMembers(conn)
		require.NoError(t, err)
		require.Len(t, members, 1)
		account, ok := members[accountCID]
		require.True(t, ok)
		require.Equal(t, site.Member_EDITOR, account)
		require.NoError(t, RemoveMember(conn, accountCIDFake))
		members, err = ListMembers(conn)
		require.NoError(t, err)
		require.Len(t, members, 1)
		require.NoError(t, RemoveMember(conn, accountCID))
		members, err = ListMembers(conn)
		require.NoError(t, err)
		require.Len(t, members, 0)
	}
}

func TestTokens(t *testing.T) {
	conn, closer, err := makeConn()
	require.NoError(t, err)
	defer func() { require.NoError(t, closer()) }()

	{
		require.NoError(t, AddToken(conn, token1, futureTime, site.Member_EDITOR))
		token, err := GetToken(conn, token1)
		require.NoError(t, err)
		require.Equal(t, futureTime.Unix(), token.ExpirationTime.Unix())
		require.Equal(t, site.Member_EDITOR, token.Role)

		require.NoError(t, AddToken(conn, token2, pastTime, site.Member_OWNER))
		token, err = GetToken(conn, token2)
		require.NoError(t, err)
		require.Equal(t, pastTime.Unix(), token.ExpirationTime.Unix())
		require.Equal(t, site.Member_OWNER, token.Role)

		tokenList, err := ListTokens(conn)
		require.NoError(t, err)
		require.Len(t, tokenList, 2)

		require.NoError(t, CleanExpiredTokens(conn))
		tokenList, err = ListTokens(conn)
		require.NoError(t, err)
		require.Len(t, tokenList, 1)
		token, ok := tokenList[token1]
		require.True(t, ok)
		require.Equal(t, futureTime.Unix(), token.ExpirationTime.Unix())
	}
}

func makeConn() (conn *sqlite.Conn, closer func() error, err error) {
	dir, err := ioutil.TempDir("", "sqlitegen-")
	if err != nil {
		return nil, nil, err
	}
	defer func() {
		if err != nil {
			os.RemoveAll(dir)
		}
	}()

	conn, err = sqlite.OpenConn(filepath.Join(dir, "db.sqlite"))
	if err != nil {
		return nil, nil, err
	}
	defer func() {
		if err != nil {
			conn.Close()
		}
	}()

	err = sqlitex.ExecScript(conn, `
	CREATE TABLE invite_tokens (
		-- Unique token identification. Random 8 char words
		token TEXT PRIMARY KEY,
		-- The role the token will allow ROLE_UNSPECIFIED = 0 OWNER = 1 EDITOR = 2
		role INTEGER NOT NULL DEFAULT 2,
		-- Timestamp since the token will no longer be eligible to be redeemed. Seconds since  Jan 1, 1970
		expiration_time INTEGER NOT NULL CHECK (expiration_time > 0)
	) WITHOUT ROWID;

	-- Stores global metadata/configuration about any other table
	CREATE TABLE global_meta (
		key TEXT PRIMARY KEY,
		value TEXT
	) WITHOUT ROWID;

	CREATE TABLE accounts (
		-- Short numerical ID to be used internally.
		id INTEGER PRIMARY KEY,
		-- Multihash part of the Account ID.
		multihash BLOB UNIQUE NOT NULL,
		-- Bytes of the public key.
		-- Mostly NULL because Ed25519 keys can be extracted from the CID.
		public_key BLOB DEFAULT NULL,
		-- Subjective (locally perceived) time when the item was created.
		create_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
	);
	CREATE TABLE site_members (
		-- The account id that has been linked to a role on this site
		account_id INTEGER NOT NULL,
		-- The role the account holds ROLE_UNSPECIFIED = 0 | OWNER = 1 | EDITOR = 2
		role INTEGER NOT NULL,
		UNIQUE(account_id),
		FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
	);
	CREATE TABLE sites (
		-- Site unique identification. The hostname of the site with protocol https://example.com
		hostname TEXT PRIMARY KEY,
		-- The role we play in the site ROLE_UNSPECIFIED = 0 | OWNER = 1 | EDITOR = 2
		role INTEGER NOT NULL DEFAULT 0,
		-- P2P addresses to connect to that site in the format of multiaddresses. Space separated.
		addresses TEXT NOT NULL,
		-- The account ID of the site. We need a previous connection to the site so the 
		-- actual account is inserted in the accounts table when handshake.
		account_id INTEGER NOT NULL,
		FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
	) WITHOUT ROWID;
	CREATE TABLE ipfs_blocks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		multihash BLOB UNIQUE NOT NULL,
		-- Multicodec describing the data stored in the block.
		codec INTEGER NOT NULL,
		-- Actual content of the block. Compressed with zstd.
		data BLOB,
		-- Byte size of the original uncompressed data.
		-- Size 0 indicates that data is stored inline in the CID.
		-- Size -1 indicates that we somehow know about this hash, but don't have the data yet.
		size INTEGER DEFAULT (-1) NOT NULL,
		-- Subjective (locally perceived) time when this block was inserted into the table for the first time.
		insert_time INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
	);
	CREATE TABLE web_publication_records (
		-- Ipfs block where the base document is stored.
		block_id INTEGER NOT NULL CHECK (block_id != 0),
		-- doc version of the base document published. Not its references.
		document_version TEXT NOT NULL,
		-- Path this publication is published to. If NULL then its not pinned. If / is root document.
		path TEXT UNIQUE,
		UNIQUE(block_id),
		FOREIGN KEY(block_id) REFERENCES ipfs_blocks(id) ON DELETE CASCADE
	);
	CREATE TABLE content_links (
		source_document_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		source_block_id TEXT NOT NULL,
		-- In theory this is not needed, because source_change_id will always be the correct version.
		-- but to simplify the queries we store it here too.
		source_version TEXT NOT NULL,
		source_change_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		target_document_id INTEGER REFERENCES ipfs_blocks ON DELETE CASCADE NOT NULL,
		target_block_id TEXT NOT NULL,
		target_version TEXT NOT NULL,
		PRIMARY KEY (target_document_id, target_block_id, target_version, source_document_id, source_block_id, source_change_id)
	) WITHOUT ROWID;
	
	CREATE INDEX content_links_by_source ON content_links (source_document_id, source_block_id);
	`)

	if err != nil {
		return nil, nil, err
	}
	err = sqlitex.ExecTransient(conn, `PRAGMA foreign_keys = ON;`, nil)
	if err != nil {
		return nil, nil, err
	}
	err = sqlitex.ExecScript(conn, `
	INSERT INTO accounts (multihash) VALUES(x'00240801122056C5D5E350E613C295B9B8EB9C8B900DF61E2A00AFF42C03D5ACA6834EE85290');
	`)
	if err != nil {
		return nil, nil, err
	}

	err = sqlitex.ExecScript(conn, `
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(1, x'A0E4022064AA6DD32CD0114F0F1E4E59A917F6D8EF914D554CE9B104FEF886D513DFE229',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(2, x'A0E40220EC738CACAD9C5A7186B422F0F54947AC5C022047249F5F58ADB3865C5A4E3839',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(3, x'A0E40220079C3AFCE82118B273BD4E3FFEF58EC76DFF81201F3E430DAD58425CC7710E40',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(4, x'A0E4022008B69E42C52332E2A7B673FAA3EF65E0DBD410DE7E8812DF47F8C3D81C89E6ED',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(5, x'A0E402200613A1E95BA28FD836CC2FEB105C596F0385DFE849ED956CE86CF7B52967A35E',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(6, x'A0E402206929393E4B3E2395D7AAC43E69699B877DAA3E72C32A660FBBD4AD4F5AE111AD',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(7, x'A0E40220042690E9400E79AF28ABB44A27029819C9ACBD79A19ABD38AF2B4AE89302C449',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(8, x'A0E40220CD2843EBB792C0C917124E6ED935E69814BA6C04673C4161A462F9624F928184',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(9, x'A0E40220EDBE17C6D7550E2D9BDA071B3C183FBB4B5AC5DFA02C01AA29BBB3B2DCD2326F',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(10, x'A0E402209CD468151187DC8B166033EFBB77B7137C6F9D4EA47A8C9869AEF0EA80110726',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(11, x'A0E40220669A3532F2B5A971CCADA609153559C6C3FDA4DB17CC11B6FDD6556D6ABF25BB',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(13, x'A0E4022023356F55DFE1D6B21E324C12C9D1A5B0A357D5B346A0566F007AB4391F612C62',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(14, x'A0E402200124FFA668A9A96A970887A186BDD75CA95AA0462D9538CD3779DDD80FBEAE52',113);
	`)
	if err != nil {
		return nil, nil, err
	}
	err = sqlitex.ExecScript(conn, `
	INSERT INTO content_links (source_document_id, source_block_id, source_version, source_change_id, target_document_id, target_block_id, target_version) 
	VALUES(8, '_on31lSO', 'baeaxdiheaiqjzvdicuiypxelczqdh353o63rg7dptvhki6umtbu254hkqaiqojq', 10, 5, 'QA6qsKk9', 'baeaxdiheaiqaijuq5faa46npfcv3isrhakmbtsnmxv42dgv5hcxswsxismbmisi'),
	(8, 'oywt1KOF', 'baeaxdiheaiqo3pqxy3lvkdrntpnaogz4da73ws22yxp2alabviu3xm5s3tjde3y', 9, 5, 'QA6qsKk9', 'baeaxdiheaiqgskjzhzft4i4v26vmiptjngnyo7nkhzzmgktgb655jlkpllqrdli'),
	(8, 'oywt1KOF', 'baeaxdiheaiqjzvdicuiypxelczqdh353o63rg7dptvhki6umtbu254hkqaiqojq', 10, 5, 'QA6qsKk9', 'baeaxdiheaiqgskjzhzft4i4v26vmiptjngnyo7nkhzzmgktgb655jlkpllqrdli'),
	(13, 'jy_8nMRi', 'baeaxdiheaiqacjh7uzuktklks4eipimgxxlvzkk2ubdc3fjyzu3xtxoyb67k4uq', 14, 5, 'QA6qsKk9', 'baeaxdiheaiqaijuq5faa46npfcv3isrhakmbtsnmxv42dgv5hcxswsxismbmisi'),
	(13, 'Qcvl0rgE', 'baeaxdiheaiqacjh7uzuktklks4eipimgxxlvzkk2ubdc3fjyzu3xtxoyb67k4uq', 14, 5, 'QA6qsKk9', 'baeaxdiheaiqgskjzhzft4i4v26vmiptjngnyo7nkhzzmgktgb655jlkpllqrdli');
	`)
	if err != nil {
		return nil, nil, err
	}
	return conn, func() error {
		return multierr.Combine(
			os.RemoveAll(dir),
			conn.Close(),
		)
	}, nil
}
