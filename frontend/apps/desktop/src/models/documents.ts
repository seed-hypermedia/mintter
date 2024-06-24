import {toPlainMessage} from '@bufbuild/protobuf'
import {useGRPCClient} from '@shm/app/app-context'
import {queryKeys} from '@shm/app/models/query-keys'
import {GRPCClient, HMDocument} from '@shm/shared'
import {useQueries, useQuery, UseQueryOptions} from '@tanstack/react-query'

export function useDocument(
  docId: string | undefined,
  version: string | undefined,
  options: UseQueryOptions<HMDocument | null> & {
    draftId?: string
  },
) {
  const grpcClient = useGRPCClient()
  return useQuery(queryDocument({docId, version, grpcClient, ...options}))
}

export function useDocuments(
  ids: string[],
  options?: UseQueryOptions<HMDocument | null>,
) {
  const grpcClient = useGRPCClient()
  return useQueries({
    queries: ids.map((docId) => queryDocument({docId, grpcClient})),
    ...(options || {}),
  })
}

export function queryDocument({
  docId,
  version,
  grpcClient,
  ...options
}: {
  docId?: string
  version?: string
  grpcClient: GRPCClient
} & UseQueryOptions<HMDocument | null>): UseQueryOptions<HMDocument | null> {
  return {
    enabled: !!docId,
    queryKey: [queryKeys.EDITOR_DRAFT, docId],
    useErrorBoundary: false,
    queryFn: async () => {
      const doc = await grpcClient.documents.getDocument({
        documentId: docId,
        version: version || '',
      })
      return toPlainMessage(doc)
    },
    ...options,
  }
}
