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

	doc1     = "bafy2bzacedgns6q7bthk63wwqp6gcgldebcl76mvycx5jpjxrghmffhaqwb5k" //leads to A0E40220ADC7505E9901B8EDA87828FC7E50F86F79D604FFA5C0D9F94C2A2518C30D8282 or A0E40220CCD97A1F0CCEAF6ED683FC6119632044BFF995C0AFD4BD37898EC294E08583D5 codec 113
	version1 = "baeaxdiheaiqk3r2ql2mqdohnvb4cr7d6kd4g66owat72lqgz7fgcujiyymgyfaq"
	version2 = "QWERT987"

	path1 = "/"
	path2 = ""

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

/*
	func TestRecords(t *testing.T) {
		conn, closer, err := makeConn()
		require.NoError(t, err)
		defer func() { require.NoError(t, closer()) }()
		{
			docCID, err := cid.Decode(validDocument)
			require.NoError(t, err)
			require.NoError(t, AddWebPublicationRecord(conn, docCID, version1, path1))
			record, err := GetWebPublicationRecord(conn, docCID)
			require.NoError(t, err)
			require.Equal(t, docCID, record.Document.ID)
			require.Equal(t, version1, record.Document.Version)
			require.Equal(t, path1, record.Path)
			//require.Equal(t, path1, record.References) //TODO: Check references

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
*/
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
		account_id INTEGER REFERENCES accounts ON DELETE CASCADE NOT NULL PRIMARY KEY,
		-- The role the account holds ROLE_UNSPECIFIED = 0 | OWNER = 1 | EDITOR = 2
		role INTEGER NOT NULL
	) WITHOUT ROWID;
	CREATE TABLE sites (
		-- Site unique identification. The hostname of the site with protocol https://example.com
		hostname TEXT PRIMARY KEY,
		-- The role we play in the site ROLE_UNSPECIFIED = 0 | OWNER = 1 | EDITOR = 2
		role INTEGER NOT NULL DEFAULT 0,
		-- P2P addresses to connect to that site in the format of multiaddresses. Space separated.
		addresses TEXT NOT NULL,
		-- The account ID of the site. We need a previous connection to the site so the 
		-- actual account is inserted in the accounts table when handshake.
		account_id INTEGER REFERENCES accounts ON DELETE CASCADE NOT NULL
	) WITHOUT ROWID;
	`)
	err = sqlitex.ExecScript(conn, `
	INSERT INTO accounts (multihash) VALUES(x'00240801122056C5D5E350E613C295B9B8EB9C8B900DF61E2A00AFF42C03D5ACA6834EE85290');
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
