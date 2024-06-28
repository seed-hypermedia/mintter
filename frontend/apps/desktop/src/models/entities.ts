import {toPlainMessage} from '@bufbuild/protobuf'
import {HMEntityContent, UnpackedHypermediaId, unpackHmId} from '@shm/shared'
import {UseMutationOptions, useMutation, useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'
import {useGRPCClient, useQueryInvalidator} from '../app-context'
import {
  BaseAccountRoute,
  BaseDocumentRoute,
  BaseDraftRoute,
  BaseEntityRoute,
  NavRoute,
} from '../utils/routes'
import {useAccounts} from './accounts'
import {
  useDocument,
  useDocuments,
  useDrafts,
  useProfile,
  useProfiles,
} from './documents'
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
        invalidate([queryKeys.ALL_ACCOUNTS])
        invalidate([queryKeys.ACCOUNT, hmId.eid])
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

export function useDeletedContent() {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryFn: async () => {
      const deleted = (
        await grpcClient.entities.listDeletedEntities({})
      ).deletedEntities.map((d) => toPlainMessage(d))
      return deleted
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
        invalidate([queryKeys.ALL_ACCOUNTS])
        invalidate([queryKeys.ACCOUNT, hmId.eid])
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
  const {qid, eid, version, type} = id
  const document = useDocument(
    type === 'd' ? qid : undefined,
    version || undefined,
  )
  const profileDoc = useProfile(eid)
  if (type === 'a' && profileDoc.data) {
    return {
      type: 'a',
      document: profileDoc.data,
    }
  } else if (type === 'd' && document.data) {
    return {
      type: 'd',
      document: document.data,
    }
  }
  return null
}

export function useEntitiesContent(
  routes: BaseEntityRoute[],
): {route: BaseEntityRoute; entity?: HMEntityContent}[] {
  const {accounts, documents, drafts} = useMemo(() => {
    const accounts: BaseAccountRoute[] = routes.filter(
      (r) => r.key === 'account',
    ) as BaseAccountRoute[]
    const documents: BaseDocumentRoute[] = routes.filter(
      (r) => r.key === 'document',
    ) as BaseDocumentRoute[]
    const drafts: BaseDraftRoute[] = routes.filter(
      (r) => r.key === 'draft',
    ) as BaseDraftRoute[]
    return {
      accounts,
      documents,
      drafts,
    }
  }, [routes])
  const docQueries = useDocuments(
    documents.map((r) => ({id: r.documentId, version: r.versionId})),
  )
  const accountQueries = useAccounts(accounts.map((r) => r.accountId))
  const profileQueries = useProfiles(
    accounts.map((accountRoute) => {
      return accountRoute.accountId
    }),
  )
  const draftQueries = useDrafts(
    drafts
      .map((draftRoute) => {
        return draftRoute.draftId
      })
      .filter(Boolean) as string[],
  )
  const output = routes
    .map((route) => {
      const accountRouteIndex = accounts.findIndex((r) => r === route)
      if (accountRouteIndex >= 0) {
        const account = accountQueries[accountRouteIndex].data
        const document = profileQueries[accountRouteIndex].data
        return {route, entity: {type: 'a', account, document}} as const
      }
      const documentRouteIndex = documents.findIndex((r) => r === route)
      if (documentRouteIndex >= 0) {
        const document = docQueries[documentRouteIndex].data
        if (document) {
          return {route, entity: {type: 'd', document}} as const
        }
      }
      const draftRouteIndex = drafts.findIndex((r) => r === route)
      if (draftRouteIndex >= 0) {
        // const draft = draftQueries[draftRouteIndex]?.data
        const draft = null
        if (draft) {
          return {route, entity: {type: 'd-draft', document: draft}} as const
        }
      }
      return false
    })
    .filter((result) => !!result)

  return output
}
