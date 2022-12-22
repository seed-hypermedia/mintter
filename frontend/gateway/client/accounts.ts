import type {Account} from './.generated/accounts/v1alpha/accounts'
import {
  AccountsClientImpl,
  GetAccountRequest,
} from './.generated/accounts/v1alpha/accounts'
import {client} from './client'
import type {GrpcClient} from './grpc-client'

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export async function getAccount(
  id: string,
  rpc: GrpcClient = client,
): Promise<Account> {
  const request = GetAccountRequest.fromPartial({
    id,
  })

  return new AccountsClientImpl(rpc).getAccount(request)
}
