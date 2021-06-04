import { DaemonClientImpl, GetInfoRequest, Info } from '@mintter/api/daemon/v1alpha/daemon'
import { rpc } from './rpc-client'

export async function getInfo(): Promise<Info> {
  const request = GetInfoRequest.fromPartial({})
  return new DaemonClientImpl(rpc).GetInfo(request)
}