import {UseMutationOptions, useMutation, useQuery} from '@tanstack/react-query'
import {useGRPCClient, useQueryInvalidator} from '../app-context'
import {queryKeys} from './query-keys'

export function useGroups() {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_GROUPS],
    queryFn: async () => {
      return await grpcClient.groups.listGroups({})
    },
  })
}

export function useGroup(groupId: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_GROUP, groupId],
    queryFn: async () => {
      return await grpcClient.groups.getGroup({id: groupId})
    },
  })
}

export function useCreateGroup(
  opts?: UseMutationOptions<
    string,
    unknown,
    {
      description: string
      title: string
    }
  >,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({
      description,
      title,
    }: {
      description: string
      title: string
    }) => {
      const group = await grpcClient.groups.createGroup({description, title})
      return group.id
    },
    onSuccess: (result, input, context) => {
      opts?.onSuccess?.(result, input, context)
      invalidate([queryKeys.GET_GROUPS])
    },
  })
}

type UpdateGroupMutationInput = {id: string; title: string; description: string}

export function useUpdateGroup(
  opts?: UseMutationOptions<void, unknown, UpdateGroupMutationInput>,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({description, title, id}: UpdateGroupMutationInput) => {
      await grpcClient.groups.updateGroup({id, description, title})
    },
    onSuccess: (result, input, context) => {
      opts?.onSuccess?.(result, input, context)
      invalidate([queryKeys.GET_GROUPS])
      invalidate([queryKeys.GET_GROUP, input.id])
    },
  })
}
