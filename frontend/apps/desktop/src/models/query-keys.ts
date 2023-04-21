// this file exists so you know what may need to be invalidated from the cache when you make changes.

// organized by the model file that is responsible for querying + mutating the keys

// note the arguments to query keys that are mentioned in comments

export const queryKeys = {
  // daemon
  GET_DAEMON_INFO: 'GET_DAEMON_INFO',

  // networking
  GET_PEERS: 'GET_PEERS',
  GET_PEER_INFO: 'GET_PEER_INFO', // , deviceId: string

  // accounts
  GET_ALL_ACCOUNTS: 'GET_ALL_ACCOUNTS',
  GET_ACCOUNT: 'GET_ACCOUNT', // , accountId: string

  // sites
  GET_SITES: 'GET_SITES',
  GET_SITE_INFO: 'GET_SITE_INFO', // , hostname: string
  GET_SITE_MEMBERS: 'GET_SITE_MEMBERS', // , hostname: string
  GET_SITE_PUBLICATIONS: 'GET_SITE_PUBLICATIONS', //, hostname: string
  GET_DOC_SITE_PUBLICATIONS: 'GET_DOC_SITE_PUBLICATIONS', // , docId: string

  // documents
  GET_DRAFT_LIST: 'GET_DRAFT_LIST', //
  GET_PUBLICATION_LIST: 'GET_PUBLICATION_LIST', //
  GET_DRAFT: 'GET_DRAFT', // , docId: string
  GET_EDITOR_DRAFT: 'GET_EDITOR_DRAFT', // , docId: string
  GET_PUBLICATION: 'GET_PUBLICATION', //, docId: string, versionId?: string

  // comments
  GET_PUBLICATION_CONVERSATIONS: 'GET_PUBLICATION_CONVERSATIONS', //, docId: string

  // changes
  PUBLICATION_CHANGES: 'PUBLICATION_CHANGES', //, docId: string

  // content-graph
  PUBLICATION_CITATIONS: 'PUBLICATION_CITATIONS', //, docId: string

  // web-links
  GET_URL: 'GET_URL',
} as const
