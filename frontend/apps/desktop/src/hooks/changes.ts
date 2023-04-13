import {changesClient} from '@app/api-clients'
import {useQueries, useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'
import {usePublicationList} from './documents'
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
