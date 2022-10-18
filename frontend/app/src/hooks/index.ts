import {
  Document,
  getAccount,
  getDraft,
  getPublication,
  GrpcClient,
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
  })

  let publications = useMemo(() => {
    return queryResult.data?.publications.sort(sort) || []

    function sort(a: Publication, b: Publication) {
      let dateA = a.document?.updateTime ? new Date(a.document?.updateTime) : 0
      let dateB = b.document?.updateTime ? new Date(b.document?.updateTime) : 1

      // @ts-ignore
      return dateB - dateA
    }
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

export function useAuthor(id?: string, opts: QueryOptions = {}) {
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
