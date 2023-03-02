// Package sitesql implements all the database related functions for sites.
package sitesql

import (
	"encoding/hex"
	"fmt"
	"mintter/backend/core"
	site "mintter/backend/genproto/documents/v1alpha"
	"strings"
	"time"

	"crawshaw.io/sqlite"
	"github.com/ipfs/go-cid"
)

// TokenInfo holds information about the token.
type TokenInfo struct {
	Role           site.Member_Role
	ExpirationTime time.Time
}

// SiteInfo holds information about a site.
type SiteInfo struct {
	Role      int
	Addresses []string
	AccID     cid.Cid
}

// DocInfo holds information about a document.
type DocInfo struct {
	ID      cid.Cid
	Version string
}

// PublicationRecord holds the information of a published document (record) on a site.
type PublicationRecord struct {
	Document   DocInfo
	Path       string
	References []DocInfo
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

// AddSite inserts a new site in the database. Replaces existing on conflict.
func AddSite(conn *sqlite.Conn, accountCID cid.Cid, addresses []string, hostname string, role int64) error {
	accIDHexStr := accountCID.Hash().HexString()
	accIDBytes, err := hex.DecodeString(accIDHexStr)
	if err != nil {
		return fmt.Errorf("Add member could not decode provided accountID: %w", err)
	}

	if err := addSite(conn, accIDBytes, strings.Join(addresses, " "), hostname, int64(role)); err != nil {
		return fmt.Errorf("Could not add site in the db : %w", err)
	}
	return nil
}

// RemoveSite deletes a given site from the db.
func RemoveSite(conn *sqlite.Conn, hostname string) error {
	if err := removeSite(conn, hostname); err != nil {
		return fmt.Errorf("Could not remove site from the db : %w", err)
	}
	return nil
}

// GetSite gets a specific site in the db.
func GetSite(conn *sqlite.Conn, hostname string) (SiteInfo, error) {
	site, err := getSite(conn, hostname)
	if err != nil || site.SitesHostname == "" {
		if err != nil {
			return SiteInfo{}, fmt.Errorf("Could not get site info from provided hostname [%s]: %w", hostname, err)
		}
		return SiteInfo{}, fmt.Errorf("Found a site matching provided hostname [%s], but was empty", hostname)
	}
	accountCID := cid.NewCidV1(core.CodecAccountKey, site.AccountsMultihash)
	return SiteInfo{
		Role:      int(site.SitesRole),
		Addresses: strings.Split(site.SitesAddresses, " "),
		AccID:     accountCID,
	}, nil
}

// ListSites lists all the sites we have.
func ListSites(conn *sqlite.Conn) (map[string]SiteInfo, error) {
	sites, err := listSites(conn)
	ret := map[string]SiteInfo{}
	if err != nil {
		return ret, fmt.Errorf("Could not list sites: %w", err)
	}
	for _, site := range sites {
		accountCID := cid.NewCidV1(core.CodecAccountKey, site.AccountsMultihash)
		ret[site.SitesHostname] = SiteInfo{
			Role:      int(site.SitesRole),
			Addresses: strings.Split(site.SitesAddresses, " "),
			AccID:     accountCID,
		}
	}
	return ret, nil
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
		return fmt.Errorf("Could not remove member from the db : %w", err)
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
		return site.Member_ROLE_UNSPECIFIED, fmt.Errorf("Could not get member with account hash [%s]: %w", accIDHexStr, err)
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
		return "", nil
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
		return "", nil
	}
	return description.GlobalMetaValue, nil
}

// AddWebPublicationRecord inserts a new published record in the db. Does not check if the version exists.
func AddWebPublicationRecord(conn *sqlite.Conn, docID cid.Cid, version string, path string) error {
	docIDHexStr := docID.Hash().HexString()
	docIDBytes, err := hex.DecodeString(docIDHexStr)
	if err != nil {
		return fmt.Errorf("Add member could not decode provided accountID: %w", err)
	}

	if err := addWebPublicationRecord(conn, docIDBytes, version, path); err != nil {
		return fmt.Errorf("Could not add record in the db : %w", err)
	}
	return nil
}

// RemoveWebPublicationRecord deletes a given web publication from the site. Does not remove the actual document just the publication record.
func RemoveWebPublicationRecord(conn *sqlite.Conn, docID cid.Cid, version string) error {
	docIDHexStr := docID.Hash().HexString()
	docIDBytes, err := hex.DecodeString(docIDHexStr)
	if err != nil {
		return fmt.Errorf("Remove member could not decode provided accountID: %w", err)
	}

	if err := removeWebPublicationRecord(conn, docIDBytes, version); err != nil {
		return fmt.Errorf("Could not remove web publication record from the db : %w", err)
	}
	return nil
}

// GetWebPublicationRecordByVersion gets a specific publication record by document ID + version. Error if it does not exist.
func GetWebPublicationRecordByVersion(conn *sqlite.Conn, docID cid.Cid, version string) (PublicationRecord, error) {
	docIDHexStr := docID.Hash().HexString()
	docIDBytes, err := hex.DecodeString(docIDHexStr)
	if err != nil {
		return PublicationRecord{}, fmt.Errorf("Get web Record could not decode provided docID: %w", err)
	}
	record, err := getWebPublicationRecordWithVersion(conn, docIDBytes, version)
	if err != nil || record.WebPublicationRecordsDocumentVersion == "" {
		return PublicationRecord{}, fmt.Errorf("Could not get web publication record: %w", err)
	}

	documentCID := cid.NewCidV1(uint64(record.IPFSBlocksCodec), record.IPFSBlocksMultihash)
	references, err := ListWebPublicationReferencesWithVersion(conn, documentCID, record.WebPublicationRecordsDocumentVersion)
	if err != nil {
		return PublicationRecord{}, fmt.Errorf("Could not get web publication references: %w", err)
	}
	return PublicationRecord{
		Document: DocInfo{
			ID:      documentCID,
			Version: record.WebPublicationRecordsDocumentVersion,
		},
		Path:       record.WebPublicationRecordsPath,
		References: references,
	}, nil
}

// GetWebPublicationRecordsByID gets a publication records by document ID. Error if it does not exist.
func GetWebPublicationRecordsByID(conn *sqlite.Conn, docID cid.Cid) ([]PublicationRecord, error) {
	docIDHexStr := docID.Hash().HexString()
	docIDBytes, err := hex.DecodeString(docIDHexStr)
	ret := []PublicationRecord{}
	if err != nil {
		return ret, fmt.Errorf("Get web Record could not decode provided docID: %w", err)
	}
	records, err := getWebPublicationRecordByIDOnly(conn, docIDBytes)
	if err != nil || len(records) == 0 {
		return ret, fmt.Errorf("Could not get web publication record: %w", err)
	}
	for _, record := range records {
		documentCID := cid.NewCidV1(uint64(record.IPFSBlocksCodec), record.IPFSBlocksMultihash)
		references, err := ListWebPublicationReferencesWithVersion(conn, documentCID, record.WebPublicationRecordsDocumentVersion)
		if err != nil {
			return ret, fmt.Errorf("Could not get web publication references: %w", err)
		}
		ret = append(ret, PublicationRecord{
			Document: DocInfo{
				ID:      documentCID,
				Version: record.WebPublicationRecordsDocumentVersion,
			},
			Path:       record.WebPublicationRecordsPath,
			References: references,
		})
	}
	return ret, nil
}

// GetWebPublicationRecordByPath gets a specific publication record by path. Error if it does not exist.
func GetWebPublicationRecordByPath(conn *sqlite.Conn, path string) (PublicationRecord, error) {
	record, err := getWebPublicationRecordByPath(conn, path)
	if err != nil || record.WebPublicationRecordsDocumentVersion == "" {
		return PublicationRecord{}, fmt.Errorf("Could not get web publication record: %w", err)
	}

	documentCID := cid.NewCidV1(uint64(record.IPFSBlocksCodec), record.IPFSBlocksMultihash)
	references, err := ListWebPublicationReferencesWithVersion(conn, documentCID, record.WebPublicationRecordsDocumentVersion)
	if err != nil {
		return PublicationRecord{}, fmt.Errorf("Could not get web publication references: %w", err)
	}
	return PublicationRecord{
		Document: DocInfo{
			ID:      documentCID,
			Version: record.WebPublicationRecordsDocumentVersion,
		},
		Path:       record.WebPublicationRecordsPath,
		References: references,
	}, nil
}

// ListWebPublicationRecords lists all the published records on a site.map[info]path.
func ListWebPublicationRecords(conn *sqlite.Conn) (map[DocInfo]string, error) {
	records, err := listWebPublicationRecords(conn)
	ret := map[DocInfo]string{}
	if err != nil {
		return ret, fmt.Errorf("Could not list records: %w", err)
	}
	for _, record := range records {
		docID := cid.NewCidV1(uint64(record.IPFSBlocksCodec), record.IPFSBlocksMultihash)
		docInfo := DocInfo{
			ID:      docID,
			Version: record.WebPublicationRecordsDocumentVersion,
		}
		ret[docInfo] = record.WebPublicationRecordsPath
	}
	return ret, nil
}

// ListWebPublicationReferencesByIDOnly lists all the references of any given document.
func ListWebPublicationReferencesByIDOnly(conn *sqlite.Conn, docID cid.Cid) ([]DocInfo, error) {
	docIDHexStr := docID.Hash().HexString()
	docIDBytes, err := hex.DecodeString(docIDHexStr)
	if err != nil {
		return nil, fmt.Errorf("List references could not decode provided docID: %w", err)
	}
	references, err := listWebPublicationReferencesByIDOnly(conn, docIDBytes)
	ret := []DocInfo{}
	if err != nil {
		return ret, fmt.Errorf("Could not list references: %w", err)
	}
	for _, reference := range references {
		docID := cid.NewCidV1(uint64(reference.IPFSBlocksCodec), reference.IPFSBlocksMultihash)
		docInfo := DocInfo{
			ID:      docID,
			Version: reference.ContentLinksTargetVersion,
		}
		ret = append(ret, docInfo)
	}
	return ret, nil
}

// ListWebPublicationReferencesWithVersion lists all the references of any given document + version.
func ListWebPublicationReferencesWithVersion(conn *sqlite.Conn, docID cid.Cid, version string) ([]DocInfo, error) {
	docIDHexStr := docID.Hash().HexString()
	docIDBytes, err := hex.DecodeString(docIDHexStr)
	if err != nil {
		return nil, fmt.Errorf("List references could not decode provided docID: %w", err)
	}
	references, err := listWebPublicationReferencesWithVersion(conn, docIDBytes, version)
	ret := []DocInfo{}
	if err != nil {
		return ret, fmt.Errorf("Could not list references: %w", err)
	}
	for _, reference := range references {
		docID := cid.NewCidV1(uint64(reference.IPFSBlocksCodec), reference.IPFSBlocksMultihash)
		docInfo := DocInfo{
			ID:      docID,
			Version: reference.ContentLinksTargetVersion,
		}
		ret = append(ret, docInfo)
	}
	return ret, nil
}
