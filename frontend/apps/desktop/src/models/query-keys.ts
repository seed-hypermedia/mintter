// this file exists so you know what may need to be invalidated from the cache when you make changes.

import {abbreviateCid} from '@shm/shared'
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
  KEYS_LIST: 'KEYS_LIST',
  KEYS_GET: 'KEYS_GET',
  GENERATE_MNEMONIC: 'GENERATE_MNEMONIC',
  SAVED_MNEMONICS: 'SAVED_MNEMONICS',

  // networking
  GET_PEERS: 'GET_PEERS', // , filterConnected: boolean
  GET_PEER_INFO: 'GET_PEER_INFO', // , deviceId: string

  // accounts
  ALL_ACCOUNTS: 'ALL_ACCOUNTS', //
  ACCOUNT: 'ACCOUNT', // , accountId: string

  // entities
  ENTITY_TIMELINE: 'ENTITY_TIMELINE', //, entityId: string, includeDrafts: boolean

  // documents
  GET_DRAFT_LIST: 'GET_DRAFT_LIST', //
  DOCUMENT_DRAFTS: 'DOCUMENT_DRAFTS', //, docId: string
  ACCOUNT_DOCUMENTS: 'ACCOUNT_DOCUMENTS', //, accountId: string
  DOCUMENT_LIST: 'DOCUMENT_LIST', // 'trusted' | 'global'
  EDITOR_DRAFT: 'EDITOR_DRAFT', // , docId: string
  DOCUMENT: 'DOCUMENT', //, docId: string, versionId?: string

  // comments
  COMMENT: 'COMMENT', //, commentId: string
  PUBLICATION_COMMENTS: 'PUBLICATION_COMMENTS', //, docEid: string

  // content-graph
  ENTITY_CITATIONS: 'ENTITY_CITATIONS', //, entityId: string

  // web-links
  GET_URL: 'GET_URL',

  // changes
  CHANGE: 'CHANGE', //, changeId: string

  // cid
  BLOB_DATA: 'BLOB_DATA', //, cid: string

  // lightning
  LIGHTNING_ACCOUNT_CHECK: 'LIGHTNING_ACCOUNT_CHECK', //, accountId: string

  // search
  SEARCH: 'SEARCH', //, query: string

  // deleted content
  DELETED: 'deleted',
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
    case queryKeys.ALL_ACCOUNTS:
      return 'All Accounts'
    case queryKeys.ACCOUNT:
      return `Account ${abbreviateCid(arg1)}`

    // entities
    case queryKeys.ENTITY_TIMELINE:
      return 'Entity Timeline'

    // documents
    case queryKeys.GET_DRAFT_LIST:
      return 'Drafts'
    case queryKeys.ACCOUNT_DOCUMENTS:
      return 'Account Publications'
    case queryKeys.DOCUMENT_LIST:
      return 'Publications'
    case queryKeys.EDITOR_DRAFT:
      return `Editor Draft ${abbreviateCid(arg1)}`
    case queryKeys.DOCUMENT:
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
