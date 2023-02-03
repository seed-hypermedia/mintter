import {Transport} from '@bufbuild/connect-web'
import {Timestamp} from '@bufbuild/protobuf'
import {
  Document,
  getAccount,
  getDraft,
  getPublication,
  listCitations,
  listDrafts,
  listPublications,
  MttLink,
  Publication,
} from '@mintter/shared'
import {QueryClient, useQuery} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {useEffect, useMemo} from 'react'

export * from './types'

export const queryKeys = {
  GET_SITES: 'GET_SITES',
  GET_SITE_INFO: 'GET_SITE_INFO', // , siteId: string
  GET_SITE_MEMBERS: 'GET_SITE_MEMBERS', // , siteId: string
  GET_DOC_PUBLICATIONS: 'GET_DOC_PUBLICATIONS', // , siteId: string
  GET_DRAFT_LIST: 'GET_DRAFT_LIST',
  GET_ACCOUNT: 'GET_ACCOUNT',
  GET_CONTACTS_LIST: 'GET_CONTACTS_LIST',
  GET_ACCOUNT_INFO: 'GET_ACCOUNT_INFO',
  GET_DRAFT: 'GET_DRAFT',
  GET_PEER_ADDRS: 'GET_PEER_ADDRS',
  GET_PUBLICATION: 'GET_PUBLICATION',
  GET_PUBLICATION_LIST: 'GET_PUBLICATION_LIST',
  GET_PUBLICATION_ANNOTATIONS: 'GET_PUBLICATION_ANNOTATIONS',
  GET_PUBLICATION_DISCUSSION: 'GET_PUBLICATION_DISCUSSION',
  GET_PEER_INFO: 'GET_PEER_INFO',
  GET_SITES_LIST: 'GET_SITES_LIST',
  GET_PUBLICATION_CONVERSATIONS: 'GET_PUBLICATION_CONVERSATIONS',
  GET_WEB_PUBLICATIONS: 'GET_WEB_PUBLICATIONS',
} as const

type QueryOptions = {
  rpc?: Transport
}
export function usePublicationList({rpc}: QueryOptions = {}) {
  let queryResult = useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_LIST],
    queryFn: () => listPublications(rpc),
    onError: (err) => {
      console.log(`usePublicationList error: ${err}`)
    },
  })

  let publications = useMemo(() => {
    return (
      queryResult.data?.publications.sort((a, b) =>
        sortDocuments(a.document?.updateTime, b.document?.updateTime),
      ) || []
    )
  }, [queryResult.data])

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    listen('document_published', () => {
      queryResult.refetch()
      if (!isSubscribed) {
        return unlisten()
      }
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  return {
    ...queryResult,
    data: {
      ...queryResult.data,
      publications,
    },
  }
}

type UseDraftListParams = {
  pageSize?: number
  pageToken?: string
  options?: QueryOptions
}

export function useDraftList({
  pageSize,
  pageToken,
  options,
}: UseDraftListParams = {}) {
  let queryResult = useQuery({
    queryKey: [queryKeys.GET_DRAFT_LIST],
    queryFn: () => listDrafts(pageSize, pageToken, options?.rpc),
    onError: (err) => {
      console.log(`useDraftList error: ${err}`)
    },
  })

  let documents = useMemo(() => {
    return (
      queryResult.data?.documents.sort((a, b) =>
        sortDocuments(a.updateTime, b.updateTime),
      ) || []
    )

    function sort(a: Document, b: Document) {
      let dateA = a.updateTime ? a.updateTime.toDate() : 0
      let dateB = b.updateTime ? b.updateTime.toDate() : 1

      // @ts-ignore
      return dateB - dateA
    }
  }, [queryResult.data])

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    listen('new_draft', () => {
      queryResult.refetch()

      if (!isSubscribed) {
        return unlisten()
      }
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    listen('update_draft', () => {
      queryResult.refetch()

      if (!isSubscribed) {
        return unlisten()
      }
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  return {
    ...queryResult,
    data: {
      ...queryResult.data,
      documents,
    },
  }
}

export function useAuthor(id = '', opts: QueryOptions = {}) {
  return useQuery({
    enabled: !!id,
    queryKey: [queryKeys.GET_ACCOUNT, id],
    queryFn: () => getAccount(id, opts.rpc),
    onError: (err) => {
      console.log(`useAuthor error: ${err}`)
    },
  })
}

export function prefetchPublication(client: QueryClient, pub: Publication) {
  client.prefetchQuery({
    queryKey: [queryKeys.GET_PUBLICATION, pub.document?.id, pub.version],
    queryFn: () => getPublication(pub.document?.id, pub.version),
  })
}

export function prefetchDraft(client: QueryClient, draft: Document) {
  client.prefetchQuery({
    queryKey: [queryKeys.GET_DRAFT, draft.id],
    queryFn: () => getDraft(draft.id),
  })
}

type UseCitationsOptions = QueryOptions & {
  depth?: number
}

export function useCitations(documentId: string, opts: UseCitationsOptions) {
  return useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_DISCUSSION, documentId],
    queryFn: () => listCitations(documentId, opts.depth, opts.rpc),
    onError: (err) => {
      console.log(`useCitations error: ${err}`)
    },
  })
  return
}

export function usePublication(
  documentId: string,
  version: string,
  opts: QueryOptions,
) {
  return useQuery({
    queryKey: [queryKeys.GET_PUBLICATION, documentId, version],
    enabled: !!documentId,
    queryFn: () => getPublication(documentId, version, opts.rpc),
    onError: (err) => {
      console.log(`usePublication error: ${err}`)
    },
  })
}
type UseDiscussionParams = {
  documentId?: string
  visible?: boolean
}

export function useDiscussion({documentId, visible}: UseDiscussionParams) {
  let queryResult = useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_DISCUSSION, documentId],
    // we are using the `enabled` attr, so `documentId` _should_ set at this point
    queryFn: () => listCitations(documentId as string),
    enabled: !!documentId && visible,
    refetchOnWindowFocus: true,
  })

  let data = useMemo(() => {
    if (queryResult.data) {
      return createDedupeLinks(queryResult.data.links)
    } else []
  }, [queryResult.data])

  return {
    ...queryResult,
    data,
  }
}

function createDedupeLinks(entry: Array<MttLink>): Array<MttLink> {
  let sourceSet = new Set<string>()

  return entry.filter((link) => {
    // this will remove any link with no source. maybe this is not possible?
    if (!link.source) return false

    let currentSource = `${link.source.documentId}/${link.source.version}`
    if (sourceSet.has(currentSource)) {
      return false
    } else {
      sourceSet.add(currentSource)
      return true
    }
  })
}

function sortDocuments(a?: Timestamp, b?: Timestamp) {
  let dateA = a ? a.toDate() : 0
  let dateB = b ? b.toDate() : 1

  // @ts-ignore
  return dateB - dateA
}
