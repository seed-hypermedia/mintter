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

	fakeDoc       = "bafy2bzaceb35vgp7p7hxltutkkk5d5b6cw3z6pjllok57guq2hhvoku44omri"
	sourceDoc     = "bafy2bzacedidscwwfyegr43j5667hxgstnafpbq7skifl5xovzta5sow5dkyq"
	sourceVersion = "baeaxdiheaiqkrsii2j5t4psza7ehncb3sprvrltyqdsvdx46j5eph5d54a4iz4a"
	targetDoc     = "bafy2bzacebexnm36k6w2jxfikngjnejlqihdcwh5rnaowpwzzefoakdg36vea"
	targetVersion = "baeaxdiheaiqhzaijdgxqor4b2wo6blznh3rfwutwh5ag4ifyxu6cx5lv6kuz5my"

	path1 = "/"
	path2 = "other-path"
	path3 = ""

	hostname1 = "https://example.com"
	hostname2 = "http://127.0.0.1:56001"

	addrs1 = "/ip4/172.20.0.2/tcp/56000/p2p/12D3KooWS9vJ7sfXZ4JXKwKhaa2t9igpsuxtVwJ85ZC4rUZ6iukv,/ip4/127.0.0.1/tcp/56000/p2p/12D3KooWS9vJ7sfXZ4JXKwKhaa2t9igpsuxtVwJ85ZC4rUZ6iukv"
	addrs2 = "/ip4/52.22.139.174/tcp/4002/p2p/12D3KooWGvsbBfcbnkecNoRBM7eUTiuriDqUyzu87pobZXSdUUsJ/p2p-circuit/p2p/12D3KooWS9vJ7sfXZ4JXKwKhaa2t9igpsuxtVwJ85ZC4rUZ6iukv,/ip4/23.20.24.146/tcp/4002/p2p/12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq/p2p-circuit/p2p/12D3KooWS9vJ7sfXZ4JXKwKhaa2t9igpsuxtVwJ85ZC4rUZ6iukv"

	validAccount = "bahezrj4iaqacicabciqfnrov4niome6csw43r244roia35q6fiak75bmapk2zjudj3uffea" // leads to thos multihash in binary x'00240801122056C5D5E350E613C295B9B8EB9C8B900DF61E2A00AFF42C03D5ACA6834EE85290
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
		require.NoError(t, SetSiteTitle(conn, siteTitle))
		title, err := GetSiteTitle(conn)
		require.NoError(t, err)
		require.Equal(t, siteTitle, title)
		require.NoError(t, SetSiteTitle(conn, modifiedTitle))
		title, err = GetSiteTitle(conn)
		require.NoError(t, err)
		require.Equal(t, modifiedTitle, title)

		require.NoError(t, SetSiteDescription(conn, siteDescription))
		description, err := GetSiteDescription(conn)
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
		require.Equal(t, int(site.Member_EDITOR), localSite.role)
		require.Equal(t, accountCID, localSite.accID)
		require.Equal(t, strings.Split(addrs1, ","), localSite.addresses)

		accountCIDFake, err := cid.Decode(fakeAccount)
		require.NoError(t, err)
		require.Error(t, AddSite(conn, accountCIDFake, strings.Split(addrs1, ","), hostname1, int64(site.Member_EDITOR)))

		sites, err := ListSites(conn)
		require.NoError(t, err)
		require.Len(t, sites, 1)
		localSite, ok := sites[hostname1]
		require.True(t, ok)
		require.Equal(t, int(site.Member_EDITOR), localSite.role)
		require.Equal(t, accountCID, localSite.accID)
		require.Equal(t, strings.Split(addrs1, ","), localSite.addresses)

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
		docCID, err := cid.Decode(targetDoc)
		require.NoError(t, err)
		require.NoError(t, AddWebPublicationRecord(conn, docCID, targetVersion, path1))
		record, err := GetWebPublicationRecord(conn, docCID)
		require.NoError(t, err)
		require.Equal(t, docCID, record.Document.ID)
		require.Equal(t, targetVersion, record.Document.Version)
		require.Equal(t, path1, record.Path)
		require.Len(t, record.References, 0)
		docCIDFake, err := cid.Decode(fakeDoc)
		require.NoError(t, err)
		require.Error(t, AddWebPublicationRecord(conn, docCIDFake, targetVersion, path2))
		records, err := ListWebPublicationRecords(conn)
		require.NoError(t, err)
		require.Len(t, records, 1)
		listedPath, ok := records[DocInfo{ID: docCID, Version: targetVersion}]
		require.True(t, ok)
		require.Equal(t, path1, listedPath)

		docCID, err = cid.Decode(sourceDoc)
		require.NoError(t, err)
		require.NoError(t, AddWebPublicationRecord(conn, docCID, sourceVersion, path2))
		record, err = GetWebPublicationRecord(conn, docCID)
		require.NoError(t, err)
		require.Equal(t, docCID, record.Document.ID)
		require.Equal(t, sourceVersion, record.Document.Version)
		require.Equal(t, path2, record.Path)
		require.Len(t, record.References, 1)
		require.Equal(t, targetVersion, record.References[0].Version)
		require.Equal(t, targetDoc, record.References[0].ID.String())
		require.NoError(t, RemoveWebPublicationRecord(conn, docCIDFake))
		records, err = ListWebPublicationRecords(conn)
		require.NoError(t, err)
		require.Len(t, records, 2)

		require.NoError(t, RemoveWebPublicationRecord(conn, docCID))
		records, err = ListWebPublicationRecords(conn)
		require.NoError(t, err)
		require.Len(t, records, 1)
		require.Equal(t, targetVersion, record.References[0].Version)
		require.Equal(t, targetDoc, record.References[0].ID.String())
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
		UNIQUE(block_id, document_version),
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
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(1, x'A0E40220F617530F62384041929B28B3AD7F846A325CBFFFA7FADC849CB4D1623C7F7AE1',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(2, x'A0E4022034FABA61D8624368B4E75587C8A08E933F411696E035F745A3CF7633F5414C2D',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(3, x'A0E40220E76B56D2D3C8019B93658FB826227344F97B56A9445B02FD73956DF6108E6147',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(4, x'A0E402204976B37E57ADA4DCA8534C96912B820E3158FD8B40EB3ED9C90AE02866DFAA40',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(5, x'A0E402207C810919AF074781D59DE0AF2D3EE25B52763F406E20B8BD3C2BF575F2A99EB3',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(6, x'A0E402202287033E2CA0F1FEB6F855E1B92C50B1970C5E8E18972B10A9456CA91E42A0FF',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(8, x'A0E40220D0390AD62E0868F369EFBDF3DCD29B4057861F929055F6EEAE660EC9D6E8D588',113);
	INSERT INTO ipfs_blocks (id, multihash, codec) VALUES(9, x'A0E40220A8C908D27B3E3E5907C876883B93E358AE7880E551DF9E4F48F3F47DE0388CF0',113);
	`)
	if err != nil {
		return nil, nil, err
	}
	err = sqlitex.ExecScript(conn, `
	INSERT INTO content_links (source_document_id, source_block_id, source_version, source_change_id, target_document_id, target_block_id, target_version) 
	VALUES(8, 'aLI-Z5af', 'baeaxdiheaiqkrsii2j5t4psza7ehncb3sprvrltyqdsvdx46j5eph5d54a4iz4a', 9, 4, 'BwEEZaUa', 'baeaxdiheaiqhzaijdgxqor4b2wo6blznh3rfwutwh5ag4ifyxu6cx5lv6kuz5my');
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
