import type {GrpcClient} from '@mintter/shared'
import type {UseQueryOptions} from '@tanstack/react-query'

export interface HookOptions<T>
  extends UseQueryOptions<T, unknown, T, string[]> {
  rpc?: GrpcClient
}
