import {
  accountsClient,
  changesClient,
  draftsClient,
  publicationsClient,
} from '@app/api-clients'
import {appInvalidateQueries} from '@app/query-client'
import {Transport} from '@bufbuild/connect-web'
import {Timestamp} from '@bufbuild/protobuf'
import {Document, Publication} from '@mintter/shared'
import {
  MutationOptions,
  QueryClient,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import {listen} from '@tauri-apps/api/event'
import {useEffect, useMemo} from 'react'
import {contentGraphClient} from './../api-clients'

export * from './types'

export const queryKeys = {
  GET_SITES: 'GET_SITES',
  SITES_LIST: 'SITES_LIST',
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
  PUBLICATION_CHANGES: 'PUBLICATION_CHANGES',
  PUBLICATION_CITATIONS: 'PUBLICATION_CITATIONS',
} as const

type QueryOptions = {
  rpc?: Transport
}

export function usePublication(documentId: string, versionId?: string) {
  return useQuery({
    queryKey: [queryKeys.GET_PUBLICATION, documentId, versionId],
    enabled: !!documentId,
    queryFn: () =>
      publicationsClient.getPublication({
        documentId: documentId,
        version: versionId,
      }),
  })
}
export function usePublicationList() {
  return useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_LIST],
    queryFn: async () => {
      const result = await publicationsClient.listPublications({})
      const publications =
        result.publications.sort((a, b) =>
          sortDocuments(a.document?.updateTime, b.document?.updateTime),
        ) || []
      return {
        ...result,
        publications,
      }
    },
  })
}

export function useDraftList() {
  return useQuery({
    queryKey: [queryKeys.GET_DRAFT_LIST],
    queryFn: async () => {
      const result = await draftsClient.listDrafts({
        pageSize: undefined,
        pageToken: undefined,
      })
      const documents =
        result.documents.sort((a, b) =>
          sortDocuments(a.updateTime, b.updateTime),
        ) || []
      return {
        ...result,
        documents,
      }
    },
    onError: (err) => {
      console.log(`useDraftList error: ${err}`)
    },
  })
}

export function useDeleteDraft(opts: MutationOptions<void, unknown, string>) {
  return useMutation({
    ...opts,
    mutationFn: async (documentId) => {
      await draftsClient.deleteDraft({documentId})
    },
    onSuccess: (...args) => {
      appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
      opts?.onSuccess?.(...args)
    },
  })
}

export function useDeletePublication(
  opts: MutationOptions<void, unknown, string>,
) {
  return useMutation({
    ...opts,
    mutationFn: async (documentId) => {
      await publicationsClient.deletePublication({documentId})
    },
    onSuccess: (...args) => {
      appInvalidateQueries([queryKeys.GET_PUBLICATION_LIST])
      opts?.onSuccess?.(...args)
    },
  })
}

export function useDraft(documentId?: string) {
  return useQuery({
    queryKey: [queryKeys.GET_DRAFT, documentId],
    enabled: !!documentId,
    queryFn: () => {
      return draftsClient.getDraft({documentId: documentId})
    },
  })
}

export function useAuthor(id = '', opts: QueryOptions = {}) {
  return useQuery({
    enabled: !!id,
    queryKey: [queryKeys.GET_ACCOUNT, id],
    queryFn: () => accountsClient.getAccount({id}),
    onError: (err) => {
      console.log(`useAuthor error: ${err}`)
    },
  })
}

export function prefetchPublication(client: QueryClient, pub: Publication) {
  if (pub.document?.id) {
    client.prefetchQuery({
      queryKey: [queryKeys.GET_PUBLICATION, pub.document.id, pub.version],
      queryFn: () =>
        publicationsClient.getPublication({
          documentId: pub.document?.id,
          version: pub.version,
        }),
    })
  }
}

export function prefetchDraft(client: QueryClient, draft: Document) {
  client.prefetchQuery({
    queryKey: [queryKeys.GET_DRAFT, draft.id],
    queryFn: () => draftsClient.getDraft({documentId: draft.id}),
  })
}

export function useDocChanges(docId?: string) {
  return useQuery({
    queryFn: () =>
      changesClient.listChanges({
        objectId: docId,
      }),
    queryKey: [queryKeys.PUBLICATION_CHANGES, docId],
    enabled: !!docId,
  })
}

export type CitationLink = Awaited<
  ReturnType<typeof contentGraphClient.listCitations>
>['links'][number]

export function useDocCitations(docId?: string) {
  return useQuery({
    queryFn: () => contentGraphClient.listCitations({documentId: docId}),
    queryKey: [queryKeys.PUBLICATION_CITATIONS, docId],
    enabled: !!docId,
  })
}

function sortDocuments(a?: Timestamp, b?: Timestamp) {
  let dateA = a ? a.toDate() : 0
  let dateB = b ? b.toDate() : 1

  // @ts-ignore
  return dateB - dateA
}
