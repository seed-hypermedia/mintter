// this file exists so you know what may need to be invalidated from the cache when you make changes.

import {abbreviateCid} from '@mintter/shared'
import {QueryKey} from '@tanstack/react-query'

export const queryKeys = {
  // Organized by the model file that is responsible for querying + mutating the keys

  // NOTE: Arguments to query keys documented in comments

  // feed
  FEED: 'FEED', // trustedOnly: boolean
  FEED_LATEST_EVENT: 'FEED_LATEST_EVENT', // trustedOnly: boolean
  RESOURCE_FEED: 'RESOURCE_FEED', //, resourceId: string
  RESOURCE_FEED_LATEST_EVENT: 'RESOURCE_FEED_LATEST_EVENT', //, resourceId: string

  // daemon
  GET_DAEMON_INFO: 'GET_DAEMON_INFO',

  // networking
  GET_PEERS: 'GET_PEERS', // , filterConnected: boolean
  GET_PEER_INFO: 'GET_PEER_INFO', // , deviceId: string

  // accounts
  GET_ALL_ACCOUNTS: 'GET_ALL_ACCOUNTS', // , filterSites: boolean
  GET_ACCOUNT: 'GET_ACCOUNT', // , accountId: string

  // groups
  GET_GROUPS: 'GET_GROUPS',
  GET_GROUP: 'GET_GROUP', // , groupId: string, version: string
  GET_GROUP_CONTENT: 'GET_GROUP_CONTENT', // , groupId: string, version: string
  GET_GROUP_MEMBERS: 'GET_GROUP_MEMBERS', // , groupId: string, version: string
  GET_GROUPS_FOR_DOCUMENT: 'GET_GROUPS_FOR_DOCUMENT', // , documentId: string
  GET_GROUPS_FOR_ACCOUNT: 'GET_GROUPS_FOR_ACCOUNT', // , accountId: string
  GET_HOST_GROUP: 'GET_HOST_GROUP', // , hostname: string

  // entities
  ENTITY_TIMELINE: 'ENTITY_TIMELINE', //, entityId: string

  // documents
  GET_DRAFT_LIST: 'GET_DRAFT_LIST', //
  GET_ACCOUNT_PUBLICATIONS: 'GET_ACCOUNT_PUBLICATIONS', //, accountId: string
  GET_PUBLICATION_LIST: 'GET_PUBLICATION_LIST', // 'trusted' | 'global'
  EDITOR_DRAFT: 'EDITOR_DRAFT', // , docId: string
  GET_PUBLICATION: 'GET_PUBLICATION', //, docId: string, versionId?: string

  // comments
  COMMENT: 'COMMENT', //, commentId: string
  PUBLICATION_COMMENTS: 'PUBLICATION_COMMENTS', //, docEid: string

  // content-graph
  ENTITY_CITATIONS: 'ENTITY_CITATIONS', //, entityId: string

  // web-links
  GET_URL: 'GET_URL',

  // changes
  CHANGE: 'CHANGE', //, changeId: string
  ALL_ENTITY_CHANGES: 'ALL_ENTITY_CHANGES', //, entityId: string

  // cid
  BLOB_DATA: 'BLOB_DATA', //, cid: string

  // lightning
  LIGHTNING_ACCOUNT_CHECK: 'LIGHTNING_ACCOUNT_CHECK', //, accountId: string

  // search
  SEARCH: 'SEARCH', //, query: string
  SEARCH_MENTIONS: 'SEARCH_MENTIONS', //, query: string
} as const

export function labelOfQueryKey(key: QueryKey) {
  const discriminator = key[0]
  const arg1 = key[1] as string | undefined
  switch (discriminator) {
    // feed
    case queryKeys.FEED:
      return 'Activity Feed'
    case queryKeys.FEED_LATEST_EVENT:
      return 'Activity Feed Latest Event'

    // daemon
    case queryKeys.GET_DAEMON_INFO:
      return 'Daemon Info'

    // networking
    case queryKeys.GET_PEERS:
      return 'Peers'
    case queryKeys.GET_PEER_INFO:
      return `Peer ${abbreviateCid(arg1)}`

    // accounts
    case queryKeys.GET_ALL_ACCOUNTS:
      return 'All Accounts'
    case queryKeys.GET_ACCOUNT:
      return `Account ${abbreviateCid(arg1)}`

    // groups
    case queryKeys.GET_GROUPS:
      return 'Groups'
    case queryKeys.GET_GROUP:
      return 'Group'
    case queryKeys.GET_GROUP_CONTENT:
      return 'GET_GROUP_CONTENT'
    case queryKeys.GET_GROUP_MEMBERS:
      return 'GET_GROUP_MEMBERS'
    case queryKeys.GET_GROUPS_FOR_DOCUMENT:
      return 'GET_GROUPS_FOR_DOCUMENT'
    case queryKeys.GET_GROUPS_FOR_ACCOUNT:
      return 'GET_GROUPS_FOR_ACCOUNT'
    case queryKeys.GET_HOST_GROUP:
      return 'GET_HOST_GROUP'

    // entities
    case queryKeys.ENTITY_TIMELINE:
      return 'Entity Timeline'

    // documents
    case queryKeys.GET_DRAFT_LIST:
      return 'Drafts'
    case queryKeys.GET_ACCOUNT_PUBLICATIONS:
      return 'Account Publications'
    case queryKeys.GET_PUBLICATION_LIST:
      return 'Publications'
    case queryKeys.EDITOR_DRAFT:
      return `Editor Draft ${abbreviateCid(arg1)}`
    case queryKeys.GET_PUBLICATION:
      return `Publication ${abbreviateCid(arg1)}`

    // comments
    case queryKeys.COMMENT:
      return 'Comment'
    case queryKeys.PUBLICATION_COMMENTS:
      return 'Publication Comments'

    // content-graph
    case queryKeys.ENTITY_CITATIONS:
      return `Citations of ${abbreviateCid(arg1)}`

    // web-links
    case queryKeys.GET_URL:
      return `URL ${arg1}`

    // changes
    case queryKeys.CHANGE:
      return 'Change'
    case queryKeys.ALL_ENTITY_CHANGES:
      return 'Entity Changes'

    // cid
    case queryKeys.BLOB_DATA:
      return 'Blab Data'

    // lightning
    case queryKeys.LIGHTNING_ACCOUNT_CHECK:
      return 'Lightning Account'

    // search
    case queryKeys.SEARCH:
      return `Search "${arg1}"`

    default:
      // return 'unknown'
      return discriminator
  }
}

export function fullInvalidate(invalidate: (key: QueryKey) => void) {
  Object.keys(queryKeys).forEach((key) => {
    if (key === 'FEED') return // the feed does not need to be invalidated, because GEED_LATEST_EVENT is invalidated and the user will be prompted for new items
    invalidate([key])
  })
}
