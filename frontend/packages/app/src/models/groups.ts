import {Role, unpackDocId} from '@mintter/shared'
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import {
  ListDocumentGroupsResponse,
  ListGroupsResponse,
} from 'frontend/packages/shared/src/client/.generated/groups/v1alpha/groups_pb'
import {useGRPCClient, useQueryInvalidator} from '../app-context'
import {useMyAccount} from './accounts'
import {queryKeys} from './query-keys'

export function useGroups(opts: UseQueryOptions<ListGroupsResponse>) {
  const grpcClient = useGRPCClient()
  return useQuery({
    ...opts,
    queryKey: [queryKeys.GET_GROUPS],
    queryFn: async () => {
      return await grpcClient.groups.listGroups({})
    },
  })
}

export function useGroup(groupId: string | undefined) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_GROUP, groupId],
    queryFn: async () => {
      const group = await grpcClient.groups.getGroup({id: groupId})
      return group
    },
    enabled: !!groupId,
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

type UpdateGroupMutationInput = {
  id: string
  title: string
  description: string
}

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

type PublishGroupToSiteMutationInput = {groupId: string; setupUrl: string}

export function usePublishGroupToSite(
  opts?: UseMutationOptions<void, unknown, PublishGroupToSiteMutationInput>,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({
      groupId,
      setupUrl,
    }: PublishGroupToSiteMutationInput) => {
      await grpcClient.groups.convertToSite({
        link: setupUrl,
        groupId,
      })
    },
    onSuccess: (result, input, context) => {
      opts?.onSuccess?.(result, input, context)
      invalidate([queryKeys.GET_GROUPS])
      invalidate([queryKeys.GET_GROUP, input.groupId])
    },
  })
}

type PublishDocToGroupMutationInput = {
  groupId: string
  docId: string
  version: string
  pathName: string
}
export function usePublishDocToGroup(
  opts?: UseMutationOptions<void, unknown, PublishDocToGroupMutationInput>,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({
      groupId,
      pathName,
      docId,
      version,
    }: PublishDocToGroupMutationInput) => {
      await grpcClient.groups.updateGroup({
        id: groupId,
        updatedContent: {
          [pathName]: `${docId}?v=${version}`,
        },
      })
    },
    onSuccess: (result, input, context) => {
      opts?.onSuccess?.(result, input, context)
      invalidate([queryKeys.GET_GROUP_CONTENT, input.groupId])
      invalidate([queryKeys.GET_GROUPS_FOR_DOCUMENT, input.docId])
    },
  })
}

type RemoveDocFromGroupMutationInput = {
  groupId: string
  pathName: string
}

export function useRemoveDocFromGroup(
  opts?: UseMutationOptions<void, unknown, RemoveDocFromGroupMutationInput>,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({
      groupId,
      pathName,
    }: RemoveDocFromGroupMutationInput) => {
      await grpcClient.groups.updateGroup({
        id: groupId,
        updatedContent: {[pathName]: ''},
      })
    },
    onSuccess: (result, input, context) => {
      opts?.onSuccess?.(result, input, context)
      invalidate([queryKeys.GET_GROUP_CONTENT, input.groupId])
    },
  })
}

type RenameGroupDocMutationInput = {
  groupId: string
  pathName: string
  newPathName: string
}

export function useRenameGroupDoc(
  opts?: UseMutationOptions<string, unknown, RenameGroupDocMutationInput>,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({
      groupId,
      pathName,
      newPathName,
    }: RenameGroupDocMutationInput) => {
      const listed = await grpcClient.groups.listContent({
        id: groupId,
      })
      const prevPathValue = listed.content[pathName]
      if (!prevPathValue)
        throw new Error('Could not find previous path at ' + pathName)
      await grpcClient.groups.updateGroup({
        id: groupId,
        updatedContent: {[pathName]: '', [newPathName]: prevPathValue},
      })
      return prevPathValue
    },
    onSuccess: (result, input, context) => {
      const docId = unpackDocId(result)
      opts?.onSuccess?.(result, input, context)
      invalidate([queryKeys.GET_GROUP_CONTENT, input.groupId])
      invalidate([queryKeys.GET_GROUPS_FOR_DOCUMENT, docId?.docId])
    },
  })
}

export function useGroupContent(
  groupId?: string | undefined,
  version?: string,
) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_GROUP_CONTENT, groupId, version],
    queryFn: async () => {
      return await grpcClient.groups.listContent({id: groupId, version})
    },
    enabled: !!groupId,
  })
}

export function useGroupMembers(groupId: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_GROUP_MEMBERS, groupId],
    queryFn: async () => {
      return await grpcClient.groups.listMembers({id: groupId})
    },
  })
}

export function useDocumentGroups(documentId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    enabled: !!documentId,
    queryKey: [queryKeys.GET_GROUPS_FOR_DOCUMENT, documentId],
    queryFn: async () => {
      const result = await grpcClient.groups.listDocumentGroups({
        documentId,
      })
      const resultMap = new Map<
        string,
        ListDocumentGroupsResponse['items'][number]
      >()
      for (const item of result.items) {
        if (item.changeTime?.seconds === undefined) continue
        if (resultMap.has(`${item.groupId}-${item.path}`)) {
          const prevItem = resultMap.get(item.groupId)
          if (!prevItem?.changeTime?.seconds) continue
          if (prevItem?.changeTime?.seconds > item.changeTime?.seconds) continue
        }
        resultMap.set(`${item.groupId}-${item.path}`, item)
      }
      return Array.from(resultMap.values())
    },
  })
}

export function useAccountGroups(accountId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    enabled: !!accountId,
    queryKey: [queryKeys.GET_GROUPS_FOR_ACCOUNT, accountId],
    queryFn: () => {
      return grpcClient.groups.listAccountGroups({
        accountId,
      })
    },
  })
}
export function useMyGroups() {
  const account = useMyAccount()
  const groups = useAccountGroups(account.data?.id)
  return groups
}

export function useHostGroup(hostname: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_HOST_GROUP, hostname],
    queryFn: async () => {
      return await grpcClient.groups.getSiteInfo({
        hostname,
      })
    },
  })
}

type AddGroupMemberMutationInput = {
  groupId: string
  newMemberAccount: string
}

export function useAddGroupMember(
  opts?: UseMutationOptions<void, unknown, AddGroupMemberMutationInput>,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({
      groupId,
      newMemberAccount,
    }: AddGroupMemberMutationInput) => {
      await grpcClient.groups.updateGroup({
        id: groupId,
        updatedMembers: {[newMemberAccount]: Role.EDITOR},
      })
    },
    onSuccess: (result, input, context) => {
      opts?.onSuccess?.(result, input, context)
      invalidate([queryKeys.GET_GROUP_MEMBERS, input.groupId])
    },
  })
}

type RemoveGroupMemberMutationInput = {
  groupId: string
  newMemberAccount: string
}

export function useRemoveGroupMember(
  opts?: UseMutationOptions<void, unknown, RemoveGroupMemberMutationInput>,
) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async ({
      groupId,
      newMemberAccount,
    }: RemoveGroupMemberMutationInput) => {
      await grpcClient.groups.updateGroup({
        id: groupId,
        updatedMembers: {[newMemberAccount]: Role.ROLE_UNSPECIFIED},
      })
    },
    onSuccess: (result, input, context) => {
      opts?.onSuccess?.(result, input, context)
      invalidate([queryKeys.GET_GROUP_MEMBERS, input.groupId])
    },
  })
}
