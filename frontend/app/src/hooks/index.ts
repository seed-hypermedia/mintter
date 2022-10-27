import {
  Document,
  getAccount,
  getDraft,
  getPublication,
  GrpcClient,
  Link,
  listCitations,
  listDrafts,
  listPublications,
  Publication,
} from '@app/client'
import {QueryClient, useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'

export * from './types'

export const queryKeys = {
  GET_DRAFT_LIST: 'GET_DRAFT_LIST',
  GET_ACCOUNT: 'GET_ACCOUNT',
  GET_CONTACTS_LIST: 'GET_CONTACTS_LIST',
  GET_ACCOUNT_INFO: 'GET_ACCOUNT_INFO',
  GET_DRAFT: 'GET_DRAFT',
  GET_PEER_ADDRS: 'GET_PEER_ADDRS',
  GET_PUBLICATION: 'GET_PUBLICATION',
  GET_PUBLICATION_LIST: 'GET_PUBLICATION_LIST',
  OTHERS_PUBLICATION_LIST: 'OTHERS_PUBLICATION_LIST',
  MY_PUBLICATION_LIST: 'MY_PUBLICATION_LIST',
  GET_PUBLICATION_ANNOTATIONS: 'GET_PUBLICATION_ANNOTATIONS',
  GET_PUBLICATION_DISCUSSION: 'GET_PUBLICATION_DISCUSSION',
  GET_PEER_INFO: 'GET_PEER_INFO',
}

type QueryOptions = {
  rpc?: GrpcClient
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
    return queryResult.data?.publications.sort(sortPublications) || []
  }, [queryResult.data])

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
    return queryResult.data?.documents.sort(sort) || []

    function sort(a: Document, b: Document) {
      let dateA = a.updateTime ? new Date(a.updateTime) : 0
      let dateB = b.updateTime ? new Date(b.updateTime) : 1

      // @ts-ignore
      return dateB - dateA
    }
  }, [queryResult.data])

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
    enabled: !!documentId && !!version,
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
    queryFn: () => listCitations(documentId),
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

function createDedupeLinks(entry: Array<Link>): Array<Link> {
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

function sortPublications(a: Publication, b: Publication) {
  let dateA = a.document?.updateTime ? new Date(a.document?.updateTime) : 0
  let dateB = b.document?.updateTime ? new Date(b.document?.updateTime) : 1

  // @ts-ignore
  return dateB - dateA
}
