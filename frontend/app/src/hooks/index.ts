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
import {QueryClient, useQuery, useQueryClient} from '@tanstack/react-query'
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

export function useDraftList(
  pageSize?: number,
  pageToken?: string,
  opts: QueryOptions = {},
) {
  let queryResult = useQuery({
    queryKey: [queryKeys.GET_DRAFT_LIST],
    queryFn: () => listDrafts(pageSize, pageToken, opts.rpc),
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
  return useQuery([queryKeys.GET_ACCOUNT, id], () => getAccount(id, opts.rpc))
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
  return listCitations(documentId, opts.depth, opts.rpc)
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
  })
}

export function useDiscussion(documentId?: string) {
  let client = useQueryClient()
  let queryResult = useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_DISCUSSION, documentId],
    queryFn: () => listCitations(documentId),
    enabled: !!documentId,
  })

  // let data = useMemo(() => {
  //   if (queryResult.data?.links) {
  //     let dedupeLinks = createDedupeLinks(queryResult.data.links).filter(
  //       (l) => !!l.source,
  //     )
  //     return Promise.all(
  //       dedupeLinks.map((link) =>
  //         client.fetchQuery({
  //           queryKey: [
  //             queryKeys.GET_PUBLICATION,
  //             link.source.documentId,
  //             link.source.version,
  //           ],
  //           queryFn: () =>
  //             getPublication(link.source.documentId, link.source?.version),
  //         }),
  //       ),
  //     ).then(sortPublications)
  //   } else {
  //     return []
  //   }
  // }, [queryResult.data, queryResult.data?.links])

  // return {
  //   ...queryResult,
  //   data,
  // }

  return queryResult
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
