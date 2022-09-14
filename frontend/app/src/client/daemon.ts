import {
  DaemonClientImpl,
  ForceSyncRequest,
  GetInfoRequest,
} from './.generated/daemon/v1alpha/daemon'
import {client} from './client'
import type {GrpcClient} from './grpc-client'

/**
 *
 * @param rpc
 * @returns
 */
export function getInfo(rpc: GrpcClient = client) {
  const request = GetInfoRequest.fromPartial({})
  return new DaemonClientImpl(rpc).getInfo(request)
}

/**
 *
 * @param rpc
 * @returns
 */
export function forceSync(rpc: GrpcClient = client) {
  const request = ForceSyncRequest.fromPartial({})
  return new DaemonClientImpl(rpc).forceSync(request)
}
