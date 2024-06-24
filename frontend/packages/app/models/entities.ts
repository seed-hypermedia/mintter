import {
  HMDeletedEntity,
  HMEntityContent,
  UnpackedHypermediaId,
  hmDeletedEntity,
  unpackHmId,
} from '@shm/shared'
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import {useMemo} from 'react'
import {useGRPCClient, useQueryInvalidator} from '../app-context'
import {
  BaseAccountRoute,
  BaseDocumentRoute,
  BaseDraftRoute,
  BaseEntityRoute,
  NavRoute,
} from '../utils/routes'
import {useAccount, useAccounts} from './accounts'
import {useDrafts, usePublication, usePublications} from './documents'
import {usePublicationVariant} from './publication'
import {queryKeys} from './query-keys'
import {useDeleteRecent} from './recents'

export function useDeleteEntity(
  opts: UseMutationOptions<void, unknown, {id: string; reason: string}>,
) {
  const deleteRecent = useDeleteRecent()
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  return useMutation({
    ...opts,
    mutationFn: async ({id, reason}: {id: string; reason: string}) => {
      await deleteRecent.mutateAsync(id)
      await grpcClient.entities.deleteEntity({id, reason})
    },
    onSuccess: (
      result: void,
      variables: {id: string; reason: string},
      context,
    ) => {
      const hmId = unpackHmId(variables.id)
      if (hmId?.type === 'd') {
        invalidate([queryKeys.DOCUMENT, variables.id])
        invalidate([queryKeys.ACCOUNT_DOCUMENTS])
        invalidate([queryKeys.DOCUMENT_LIST])
      } else if (hmId?.type === 'a') {
        invalidate([queryKeys.GET_ALL_ACCOUNTS])
        invalidate([queryKeys.GET_ACCOUNT, hmId.eid])
      } else if (hmId?.type === 'c') {
        invalidate([queryKeys.COMMENT, variables.id])
        invalidate([queryKeys.PUBLICATION_COMMENTS])
      }
      invalidate([queryKeys.FEED])
      invalidate([queryKeys.FEED_LATEST_EVENT])
      invalidate([queryKeys.RESOURCE_FEED])
      invalidate([queryKeys.RESOURCE_FEED_LATEST_EVENT])
      invalidate([queryKeys.ENTITY_CITATIONS])
      invalidate([queryKeys.SEARCH])
      opts?.onSuccess?.(result, variables, context)
    },
  })
}

export function useDeletedContent(
  opts?: UseQueryOptions<unknown, unknown, HMDeletedEntity[]>,
) {
  const grpcClient = useGRPCClient()
  return useQuery({
    ...opts,
    queryFn: async () => {
      const deleted = await grpcClient.entities.listDeletedEntities({})
      return deleted.deletedEntities.map((d) => hmDeletedEntity(d))
    },
    queryKey: [queryKeys.DELETED],
  })
}

export function useUndeleteEntity(
  opts?: UseMutationOptions<void, unknown, {id: string}>,
) {
  const deleteRecent = useDeleteRecent()
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  return useMutation({
    ...opts,
    mutationFn: async ({id}: {id: string}) => {
      await deleteRecent.mutateAsync(id)
      await grpcClient.entities.undeleteEntity({id})
    },
    onSuccess: (result: void, variables: {id: string}, context) => {
      const hmId = unpackHmId(variables.id)
      if (hmId?.type === 'd') {
        invalidate([queryKeys.DOCUMENT, variables.id])
        invalidate([queryKeys.ACCOUNT_DOCUMENTS])
        invalidate([queryKeys.DOCUMENT_LIST])
      } else if (hmId?.type === 'a') {
        invalidate([queryKeys.GET_ALL_ACCOUNTS])
        invalidate([queryKeys.GET_ACCOUNT, hmId.eid])
      } else if (hmId?.type === 'c') {
        invalidate([queryKeys.COMMENT, variables.id])
        invalidate([queryKeys.PUBLICATION_COMMENTS])
      }
      invalidate([queryKeys.FEED])
      invalidate([queryKeys.FEED_LATEST_EVENT])
      invalidate([queryKeys.RESOURCE_FEED])
      invalidate([queryKeys.RESOURCE_FEED_LATEST_EVENT])
      invalidate([queryKeys.ENTITY_CITATIONS])
      invalidate([queryKeys.SEARCH])
      invalidate([queryKeys.DELETED])
      opts?.onSuccess?.(result, variables, context)
    },
  })
}

export function getEntityRoutes(route: NavRoute): BaseEntityRoute[] {
  if (route.key === 'document') {
    const {context, ...baseRoute} = route
    if (context) return [...context, baseRoute]
    return [baseRoute]
  }
  if (route.key === 'account') {
    const {context, tab, ...baseRoute} = route
    if (context) return [...context, baseRoute]
    return [baseRoute]
  }
  if (route.key === 'draft') {
    const {contextRoute, ...draftRoute} = route
    const entityRoutes = contextRoute
      ? getEntityRoutes(contextRoute).slice(1)
      : []
    return [...entityRoutes, draftRoute]
  }
  return []
}

export function useEntityRoutes(route: NavRoute): BaseEntityRoute[] {
  return useMemo(() => {
    return getEntityRoutes(route)
  }, [route])
}

export function useEntityContent(
  id: UnpackedHypermediaId,
): HMEntityContent | null | undefined {
  const {qid, eid, version, type, latest} = id
  const account = useAccount(type === 'a' ? eid : undefined)
  const publication = usePublicationVariant({
    documentId: type === 'd' ? qid : undefined,
    versionId: version || undefined,
    variants: id.variants || undefined,
    latest: latest || false,
  })
  const profileDoc = usePublication({
    id: account.data?.profile?.rootDocument,
  })
  if (type === 'a' && account.data) {
    return {
      type: 'a',
      account: account.data,
      document: profileDoc.data?.document,
    }
  } else if (type === 'd' && publication.data?.publication) {
    return {
      type: 'd',
      publication: publication.data.publication,
      document: publication.data?.publication?.document,
    }
  }
  if (type === 'a' && (account.isLoading || profileDoc.isLoading))
    return undefined
  if (type === 'd' && publication.isLoading) return undefined
  return null
}

export function useEntitiesContent(
  routes: BaseEntityRoute[],
): {route: BaseEntityRoute; entity?: HMEntityContent}[] {
  const {accounts, publications, drafts} = useMemo(() => {
    const accounts: BaseAccountRoute[] = routes.filter(
      (r) => r.key === 'account',
    ) as BaseAccountRoute[]
    const publications: BaseDocumentRoute[] = routes.filter(
      (r) => r.key === 'document',
    ) as BaseDocumentRoute[]
    const drafts: BaseDraftRoute[] = routes.filter(
      (r) => r.key === 'draft',
    ) as BaseDraftRoute[]
    return {
      accounts,
      publications,
      drafts,
    }
  }, [routes])

  // TODO, BUG HERE! We should be using the publication variant query but there is no plural getPublicationVariants
  const pubQueries = usePublications(
    publications.map((r) => ({id: r.documentId, version: r.versionId})),
  )
  const accountQueries = useAccounts(accounts.map((r) => r.accountId))
  const profileDocQueries = usePublications(
    accounts.map((accountRoute, routeIndex) => {
      const profileDocId =
        accountQueries[routeIndex].data?.profile?.rootDocument
      return {id: profileDocId}
    }),
  )

  const draftQueries = useDrafts(
    drafts
      .map((draftRoute, draftIndex) => {
        return draftRoute.draftId
      })
      .filter(Boolean) as string[],
  )
  return routes.map((route) => {
    const accountRouteIndex = accounts.findIndex((r) => r === route)
    if (accountRouteIndex >= 0) {
      const account = accountQueries[accountRouteIndex].data
      const document = profileDocQueries[accountRouteIndex].data?.document
      if (account) {
        return {route, entity: {type: 'a', account, document}}
      }
    }
    const DocumentRouteIndex = publications.findIndex((r) => r === route)
    if (DocumentRouteIndex >= 0) {
      const publication = pubQueries[DocumentRouteIndex].data
      const document = publication?.document
      if (publication) {
        return {route, entity: {type: 'd', publication, document}}
      }
    }
    const draftRouteIndex = drafts.findIndex((r) => r === route)
    if (draftRouteIndex >= 0) {
      const draft = draftQueries[draftRouteIndex]?.data
      if (draft) {
        return {route, entity: {type: 'd-draft', document: draft}}
      }
    }
    return {route, entity: undefined}
  })
}
