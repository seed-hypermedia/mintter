import type {UseQueryOptions} from 'react-query'
import type {grpc} from '@improbable-eng/grpc-web'

export interface HookOptions<T> extends UseQueryOptions<T, unknown, T> {
  rpc?: GrpcWebImpl
}

interface GrpcWebImplOptions {
  transport?: grpc.TransportFactory
  debug?: boolean
  metadata?: grpc.Metadata
}

interface GrpcWebImpl {
  new (host: string, options: GrpcWebImplOptions): this
  unary<T>(methodDesc: T, _request: any, metadata?: grpc.Metadata): Promise<any>
}
