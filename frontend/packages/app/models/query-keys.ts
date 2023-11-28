// this file exists so you know what may need to be invalidated from the cache when you make changes.

import {abbreviateCid} from '@mintter/shared'
import {QueryKey} from '@tanstack/react-query'

export const queryKeys = {
  // Organized by the model file that is responsible for querying + mutating the keys

  // NOTE: Arguments to query keys documented in comments

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
  GET_PUBLICATION_LIST: 'GET_PUBLICATION_LIST', // 'trusted' | 'global'
  EDITOR_DRAFT: 'EDITOR_DRAFT', // , docId: string
  EDITOR_DRAFT_CONTENT: 'EDITOR_DRAFT_CONTENT',
  GET_DRAFT: 'GET_DRAFT', // , docId: string
  GET_PUBLICATION: 'GET_PUBLICATION', //, docId: string, versionId?: string

  // comments
  GET_PUBLICATION_CONVERSATIONS: 'GET_PUBLICATION_CONVERSATIONS', //, docId: string

  // changes
  PUBLICATION_CHANGES: 'PUBLICATION_CHANGES', //, docId: string

  // content-graph
  PUBLICATION_CITATIONS: 'PUBLICATION_CITATIONS', //, docId: string

  // web-links
  GET_URL: 'GET_URL',

  // changes
  CHANGE: 'CHANGE', //, changeId: string
  ALL_ENTITY_CHANGES: 'ALL_ENTITY_CHANGES', //, entityId: string
  DOCUMENT_TEXT_CONTENT: 'DOCUMENT_TEXT_CONTENT',

  LIGHTNING_ACCOUNT_CHECK: 'LIGHTNING_ACCOUNT_CHECK', //, accountId: string
} as const

export function labelOfQueryKey(key: QueryKey) {
  const discriminator = key[0]
  const arg1 = key[1] as string | undefined
  switch (discriminator) {
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

    // documents
    case queryKeys.GET_DRAFT_LIST:
      return 'Drafts'
    case queryKeys.GET_PUBLICATION_LIST:
      return 'Publications'
    case queryKeys.EDITOR_DRAFT:
      return `Editor Draft ${abbreviateCid(arg1)}`
    case queryKeys.GET_PUBLICATION:
      return `Publication ${abbreviateCid(arg1)}`

    // comments
    case queryKeys.GET_PUBLICATION_CONVERSATIONS:
      return `Conversations in Doc ${abbreviateCid(arg1)}`

    // changes
    case queryKeys.PUBLICATION_CHANGES:
      return `Changes of Doc ${abbreviateCid(arg1)}`

    // content-graph
    case queryKeys.PUBLICATION_CITATIONS:
      return `Citations of Doc ${abbreviateCid(arg1)}`

    // web-links
    case queryKeys.GET_URL:
      return `URL ${arg1}`

    case queryKeys.ENTITY_TIMELINE:
      return 'Entity Timeline'

    case queryKeys.GET_GROUPS_FOR_DOCUMENT:
      return `Groups for this Document`

    default:
      // return 'unknown'
      return discriminator
  }
}
