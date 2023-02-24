package sitesql

import (
	"io/ioutil"
	site "mintter/backend/genproto/documents/v1alpha"
	"os"
	"path/filepath"
	"testing"
	"time"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
	"github.com/ipfs/go-cid"
	"github.com/stretchr/testify/require"
	"go.uber.org/multierr"
)

const (
	token1 = "ASDFG123"
	token2 = "QWERT987"
)

var (
	futureTime = time.Now().Add(time.Minute)
	pastTime   = time.Now().Add(-time.Minute)
)

func TestMembers(t *testing.T) {
	conn, closer, err := makeConn()
	require.NoError(t, err)
	defer func() { require.NoError(t, closer()) }()

	{
		const validAccount = "bahezrj4iaqacicabciqfnrov4niome6csw43r244roia35q6fiak75bmapk2zjudj3uffea" // leads to thos multihash in binary x'00240801122056C5D5E350E613C295B9B8EB9C8B900DF61E2A00AFF42C03D5ACA6834EE85290
		const fakeAccount = "bahezrj4iaqacicabciqhpkuxan2hm6vfh6rek3mvvs54wj5utodglwdrcatmif7jpmllyui"
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
