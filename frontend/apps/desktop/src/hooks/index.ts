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
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import {useMemo} from 'react'
import {contentGraphClient} from './../api-clients'
import {queryKeys} from './query-keys'

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

export function useAllPublicationChanges() {
  const allPublications = usePublicationList()
  const pubs = allPublications?.data?.publications || []
  const queries = pubs.map((pub) => {
    return createDocChangesQuery(pub.document?.id)
  })
  const resultQueries = useQueries({
    queries,
  })
  return {
    isLoading:
      allPublications.isLoading || resultQueries.some((q) => q.isLoading),
    error: allPublications.error || resultQueries.find((q) => q.error)?.error,
    data: pubs.map((pub, pubIndex) => ({
      publication: pub,
      changes: resultQueries[pubIndex]?.data?.changes,
    })),
  }
}

export function useAccountPublicationList(accountId: string) {
  const allPubs = useAllPublicationChanges()
  return {
    ...allPubs,
    data: useMemo(() => {
      const accountPubs = allPubs.data
        .filter((pub) => {
          return pub.changes?.find((change) => change.author === accountId)
        })
        .map((pub) => pub.publication)
      return accountPubs
    }, [allPubs.data, accountId]),
  }
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

export function useAccount(id = '', opts: QueryOptions = {}) {
  return useQuery({
    enabled: !!id,
    queryKey: [queryKeys.GET_ACCOUNT, id],
    queryFn: () => accountsClient.getAccount({id}),
    onError: (err) => {
      console.log(`useAccount error: ${err}`)
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
function createDocChangesQuery(docId: string | undefined) {
  return {
    queryFn: () =>
      changesClient.listChanges({
        objectId: docId,
      }),
    queryKey: [queryKeys.PUBLICATION_CHANGES, docId],
    enabled: !!docId,
  } as const
}
export function useDocChanges(docId?: string) {
  return useQuery(createDocChangesQuery(docId))
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
