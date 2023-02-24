// Package sitesql implements all the database related functions for sites.
package sitesql

import (
	"encoding/hex"
	"fmt"
	"mintter/backend/core"
	site "mintter/backend/genproto/documents/v1alpha"
	"time"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
)

// TokenInfo holds information about the token.
type TokenInfo struct {
	Role           site.Member_Role
	ExpirationTime time.Time
}

// AddToken inserts a token in the database to be redeemed.
func AddToken(conn *sqlite.Conn, token string, expirationTime time.Time, role site.Member_Role) error {
	err := addToken(conn, token, expirationTime.Unix(), int64(role))
	if err != nil {
		return fmt.Errorf("Could not insert token in the db : %w", err)
	}
	return nil
}

// GetToken gets a token from the database.
func GetToken(conn *sqlite.Conn, token string) (TokenInfo, error) {
	tokenInfo, err := getToken(conn, token)
	if err != nil {
		return TokenInfo{}, fmt.Errorf("Could not get token: %w", err)
	}
	return TokenInfo{
		Role:           site.Member_Role(tokenInfo.InviteTokensRole),
		ExpirationTime: time.Unix(tokenInfo.InviteTokensExpirationTime, 0),
	}, nil
}

// ListTokens lists all available tokens.
func ListTokens(conn *sqlite.Conn) (map[string]TokenInfo, error) {
	var ret = map[string]TokenInfo{}
	tokensInfo, err := listTokens(conn)
	if err != nil {
		return ret, fmt.Errorf("Could not get list of tokens: %w", err)
	}
	for _, tokenInfo := range tokensInfo {
		ret[tokenInfo.InviteTokensToken] = TokenInfo{
			Role:           site.Member_Role(tokenInfo.InviteTokensRole),
			ExpirationTime: time.Unix(tokenInfo.InviteTokensExpirationTime, 0),
		}
	}
	return ret, nil
}

// RemoveToken deletes a token in the database to be redeemed.
func RemoveToken(conn *sqlite.Conn, token string) error {
	err := removeToken(conn, token)
	if err != nil {
		return fmt.Errorf("Could not remove token from the db : %w", err)
	}
	return nil
}

// CleanExpiredTokens removes all expired tokens.
func CleanExpiredTokens(conn *sqlite.Conn) error {
	err := removeExpiredTokens(conn)
	if err != nil {
		return fmt.Errorf("Could not clean expired tokens fromm the db : %w", err)
	}
	return nil
}

// AddMember inserts a new member in the site with provided role.
func AddMember(conn *sqlite.Conn, accountCID cid.Cid, role int64) error {
	accIDHexStr := accountCID.Hash().HexString()
	accIDBytes, err := hex.DecodeString(accIDHexStr)
	if err != nil {
		return fmt.Errorf("Add member could not decode provided accountID: %w", err)
	}
	//accountIDHex := hex.EncodeToString([]byte(accountID))
	if _, err := addMember(conn, accIDBytes, int64(role)); err != nil {
		return fmt.Errorf("Could not add member in the db : %w", err)
	}
	return nil
}

// RemoveMember deletes a given member from the site in the site with provided role.
func RemoveMember(conn *sqlite.Conn, accountCID cid.Cid) error {
	accIDHexStr := accountCID.Hash().HexString()
	accIDBytes, err := hex.DecodeString(accIDHexStr)
	if err != nil {
		return fmt.Errorf("Remove member could not decode provided accountID: %w", err)
	}

	if err := removeMember(conn, accIDBytes); err != nil {
		return fmt.Errorf("Could not remove member in the db : %w", err)
	}
	return nil
}

// GetMemberRole gets a member role. Error if it does not exist.
func GetMemberRole(conn *sqlite.Conn, accountCID cid.Cid) (site.Member_Role, error) {
	accIDHexStr := accountCID.Hash().HexString()
	accIDBytes, err := hex.DecodeString(accIDHexStr)
	if err != nil {
		return site.Member_ROLE_UNSPECIFIED, fmt.Errorf("Get member could not decode provided accountID: %w", err)
	}
	member, err := getMember(conn, accIDBytes)
	if err != nil || member.SiteMembersRole == int64(site.Member_ROLE_UNSPECIFIED) {
		return site.Member_ROLE_UNSPECIFIED, fmt.Errorf("Could not get member: %w", err)
	}
	return site.Member_Role(member.SiteMembersRole), nil
}

// ListMembers lists all the members on a site.
func ListMembers(conn *sqlite.Conn) (map[cid.Cid]site.Member_Role, error) {
	members, err := listMembers(conn)
	ret := map[cid.Cid]site.Member_Role{}
	if err != nil {
		return ret, fmt.Errorf("Could not list members: %w", err)
	}
	for _, member := range members {
		accountCID := cid.NewCidV1(core.CodecAccountKey, member.AccountsMultihash)
		ret[accountCID] = site.Member_Role(member.SiteMembersRole)
	}
	return ret, nil
}

// SetSiteTitle updates the site title.
func SetSiteTitle(conn *sqlite.Conn, newTitle string) error {
	return setSiteTitle(conn, newTitle)
}

// GetSiteTitle gets the site title.
func GetSiteTitle(conn *sqlite.Conn) (string, error) {
	title, err := getSiteTitle(conn)
	if err != nil {
		return "", fmt.Errorf("Could not get site Title: %w", err)
	}
	return title.GlobalMetaValue, nil
}

// SetSiteDescription updates the site description.
func SetSiteDescription(conn *sqlite.Conn, newDescription string) error {
	return setSiteDescription(conn, newDescription)
}

// GetSiteDescription gets the site title.
func GetSiteDescription(conn *sqlite.Conn) (string, error) {
	description, err := getSiteDescription(conn)
	if err != nil {
		return "", fmt.Errorf("Could not get site Description: %w", err)
	}
	return description.GlobalMetaValue, nil
}
