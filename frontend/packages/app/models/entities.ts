import {unpackHmId} from '@mintter/shared'
import {UseMutationOptions, useMutation} from '@tanstack/react-query'
import {useGRPCClient, useQueryInvalidator} from '../app-context'
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
