import {changesClient} from '@app/api-clients'
import {useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'

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
