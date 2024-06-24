import {useGRPCClient} from '@shm/app/app-context'
import {queryKeys} from '@shm/app/models/query-keys'
import {useQuery} from '@tanstack/react-query'

export function useAccountKeys() {
  const client = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.KEYS_LIST],
    queryFn: async () => {
      try {
        const q = await client.daemon.listKeys({})
        return q?.keys
      } catch (e) {
        return []
      }
    },
  })
}
