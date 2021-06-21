import type {UseQueryOptions} from 'react-query'
import type {GrpcClient} from '../src/grpc-client'

export interface HookOptions<T> extends UseQueryOptions<T, unknown, T> {
  rpc?: GrpcClient
}
