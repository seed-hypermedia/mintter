import {useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {queryKeys} from './query-keys'

export function useGroups() {
  const grpcClient = useGRPCClient()
  const contacts = useQuery({
    queryKey: [queryKeys.GET_GROUPS],
    queryFn: async () => {
      return await grpcClient.groups.listGroups({})
    },
    refetchInterval: 10000,
  })
  return contacts
}
