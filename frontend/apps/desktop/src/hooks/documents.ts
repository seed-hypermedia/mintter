import {draftsClient, publicationsClient} from '@app/api-clients'
import {appInvalidateQueries, appQueryClient} from '@app/query-client'
import {Timestamp} from '@bufbuild/protobuf'
import {Document, Publication} from '@mintter/shared'
import {
  FetchQueryOptions,
  MutationOptions,
  QueryClient,
  useMutation,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

export function usePublicationList() {
  return useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_LIST],
    refetchOnMount: true,
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
    refetchOnMount: true,
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

function queryPublication(
  documentId: string,
  versionId?: string,
): UseQueryOptions<Publication> | FetchQueryOptions<Publication> {
  return {
    queryKey: [queryKeys.GET_PUBLICATION, documentId, versionId],
    queryFn: () =>
      publicationsClient.getPublication({
        documentId,
        version: versionId,
      }),
  }
}
export function usePublication(documentId: string, versionId?: string) {
  return useQuery(queryPublication(documentId, versionId))
}

export function prefetchPublication(documentId: string, versionId?: string) {
  appQueryClient.prefetchQuery(queryPublication(documentId, versionId))
}

export function fetchPublication(documentId: string, versionId?: string) {
  return appQueryClient.fetchQuery(queryPublication(documentId, versionId))
}

export function prefetchDraft(client: QueryClient, draft: Document) {
  client.prefetchQuery({
    queryKey: [queryKeys.GET_DRAFT, draft.id],
    queryFn: () => draftsClient.getDraft({documentId: draft.id}),
  })
}

function sortDocuments(a?: Timestamp, b?: Timestamp) {
  let dateA = a ? a.toDate() : 0
  let dateB = b ? b.toDate() : 1

  // @ts-ignore
  return dateB - dateA
}
