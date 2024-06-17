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
  BaseDraftRoute,
  BaseEntityRoute,
  BaseGroupRoute,
  BasePublicationRoute,
  NavRoute,
} from '../utils/routes'
import {useAccount, useAccounts} from './accounts'
import {useDrafts, usePublication, usePublications} from './documents'
import {useGroup, useGroupContent, useGroups, useGroupsContent} from './groups'
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
        invalidate([queryKeys.GET_PUBLICATION, variables.id])
        invalidate([queryKeys.GET_ACCOUNT_PUBLICATIONS])
        invalidate([queryKeys.GET_PUBLICATION_LIST])
      } else if (hmId?.type === 'a') {
        invalidate([queryKeys.GET_ALL_ACCOUNTS])
        invalidate([queryKeys.GET_ACCOUNT, hmId.eid])
      } else if (hmId?.type === 'c') {
        invalidate([queryKeys.COMMENT, variables.id])
        invalidate([queryKeys.PUBLICATION_COMMENTS])
      } else if (hmId?.type === 'g') {
        invalidate([queryKeys.GET_GROUP, variables.id])
        invalidate([queryKeys.GET_GROUPS])
        invalidate([queryKeys.GET_GROUPS_FOR_DOCUMENT])
        invalidate([queryKeys.GET_GROUPS_FOR_ACCOUNT])
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
        invalidate([queryKeys.GET_PUBLICATION, variables.id])
        invalidate([queryKeys.GET_ACCOUNT_PUBLICATIONS])
        invalidate([queryKeys.GET_PUBLICATION_LIST])
      } else if (hmId?.type === 'a') {
        invalidate([queryKeys.GET_ALL_ACCOUNTS])
        invalidate([queryKeys.GET_ACCOUNT, hmId.eid])
      } else if (hmId?.type === 'c') {
        invalidate([queryKeys.COMMENT, variables.id])
        invalidate([queryKeys.PUBLICATION_COMMENTS])
      } else if (hmId?.type === 'g') {
        invalidate([queryKeys.GET_GROUP, variables.id])
        invalidate([queryKeys.GET_GROUPS])
        invalidate([queryKeys.GET_GROUPS_FOR_DOCUMENT])
        invalidate([queryKeys.GET_GROUPS_FOR_ACCOUNT])
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
  if (route.key === 'publication') {
    const {context, ...baseRoute} = route
    if (context) return [...context, baseRoute]
    const firstVariant = route.variants?.[0]
    if (firstVariant?.key === 'group') {
      return [
        {
          key: 'group',
          groupId: firstVariant.groupId,
        },
        baseRoute,
      ]
    }
    return [baseRoute]
  }
  if (route.key === 'group') {
    const {context, tab, ...baseRoute} = route
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
  const group = useGroup(type === 'g' ? qid : undefined, version || undefined)
  const groupContent = useGroupContent(
    type === 'g' ? qid : undefined,
    version || undefined,
  )
  const publication = usePublicationVariant({
    documentId: type === 'd' ? qid : undefined,
    versionId: version || undefined,
    variants: id.variants || undefined,
    latest: latest || false,
  })
  const groupFrontUrl = groupContent.data?.content['/']
  const groupFrontId = groupFrontUrl ? unpackHmId(groupFrontUrl) : null
  const groupFront = usePublication({
    id: groupFrontId?.qid,
    version: groupFrontId?.version || undefined,
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
  } else if (type === 'g' && group.data) {
    return {type: 'g', group: group.data, document: groupFront.data?.document}
  } else if (type === 'd' && publication.data?.publication) {
    return {
      type: 'd',
      publication: publication.data.publication,
      document: publication.data?.publication?.document,
    }
  }
  if (type === 'a' && (account.isLoading || profileDoc.isLoading))
    return undefined
  if (
    type === 'g' &&
    (group.isLoading || groupContent.isLoading || groupFront.isLoading)
  )
    return undefined
  if (type === 'd' && publication.isLoading) return undefined
  return null
}

export function useEntitiesContent(
  routes: BaseEntityRoute[],
): {route: BaseEntityRoute; entity?: HMEntityContent}[] {
  const {groups, accounts, publications, drafts, draftGroups} = useMemo(() => {
    const groups: BaseGroupRoute[] = routes.filter(
      (r) => r.key === 'group',
    ) as BaseGroupRoute[]
    const accounts: BaseAccountRoute[] = routes.filter(
      (r) => r.key === 'account',
    ) as BaseAccountRoute[]
    const publications: BasePublicationRoute[] = routes.filter(
      (r) => r.key === 'publication',
    ) as BasePublicationRoute[]
    const drafts: BaseDraftRoute[] = routes.filter(
      (r) => r.key === 'draft',
    ) as BaseDraftRoute[]
    const draftGroups = drafts.map((r) =>
      r.key === 'draft' ? r.variant?.groupId : undefined,
    )
    return {
      groups,
      accounts,
      publications,
      drafts,
      draftGroups,
    }
  }, [routes])
  const groupQueries = useGroups(
    groups.map((r) => ({id: r.groupId, version: r.version})),
  )
  const groupContentQueries = useGroupsContent(
    groups.map((r) => ({id: r.groupId, version: r.version})),
  )
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
  const groupFrontQueries = usePublications(
    groups.map((groupRoute, groupIndex) => {
      const contentQuery = groupContentQueries[groupIndex]
      const frontDocId = contentQuery.data?.content['/']
      const id = frontDocId ? unpackHmId(frontDocId) : undefined
      return {id: id?.qid, version: id?.version}
    }),
  )
  const draftQueries = useDrafts(
    drafts
      .map((draftRoute, draftIndex) => {
        return draftRoute.draftId
      })
      .filter(Boolean) as string[],
  )
  const draftGroupQueries = useGroups(
    draftGroups.filter(Boolean).map((id) => ({id})) as {
      id: string
    }[],
  )
  return routes.map((route) => {
    const groupRouteIndex = groups.findIndex((r) => r === route)
    if (groupRouteIndex >= 0) {
      const group = groupQueries[groupRouteIndex].data
      if (group) {
        const frontPub = groupFrontQueries[groupRouteIndex].data
        const document = frontPub?.document
        return {
          route,
          entity: {type: 'g', group, document},
        }
      }
    }
    const accountRouteIndex = accounts.findIndex((r) => r === route)
    if (accountRouteIndex >= 0) {
      const account = accountQueries[accountRouteIndex].data
      const document = profileDocQueries[accountRouteIndex].data?.document
      if (account) {
        return {route, entity: {type: 'a', account, document}}
      }
    }
    const publicationRouteIndex = publications.findIndex((r) => r === route)
    if (publicationRouteIndex >= 0) {
      const publication = pubQueries[publicationRouteIndex].data
      const document = publication?.document
      if (publication) {
        return {route, entity: {type: 'd', publication, document}}
      }
    }
    const draftRouteIndex = drafts.findIndex((r) => r === route)
    if (draftRouteIndex >= 0) {
      const draftRoute = drafts[draftRouteIndex]
      const draft = draftQueries[draftRouteIndex]?.data
      const homeGroup = draftRoute.variant?.groupId
        ? draftGroupQueries.find(
            (g) => g.data?.id === draftRoute.variant?.groupId,
          )?.data
        : undefined
      if (draft) {
        return {route, entity: {type: 'd-draft', document: draft, homeGroup}}
      }
    }
    return {route, entity: undefined}
  })
}
