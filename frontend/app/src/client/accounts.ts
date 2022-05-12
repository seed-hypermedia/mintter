import type {Account, Profile} from './.generated/accounts/v1alpha/accounts'
import {
  AccountsClientImpl,
  GetAccountRequest,
  ListAccountsRequest,
} from './.generated/accounts/v1alpha/accounts'
import {
  DaemonClientImpl,
  GenSeedRequest,
  RegisterRequest,
} from './.generated/daemon/v1alpha/daemon'
import type {GrpcClient} from './grpc-client'
import {createGrpcClient} from './grpc-client'
/**
 *
 * @param aezeedPassphrase
 * @param rpc
 * @returns
 */
export function generateSeed(rpc?: GrpcClient) {
  rpc ||= createGrpcClient()

  const request = GenSeedRequest.fromPartial({})
  const response = new DaemonClientImpl(rpc).genSeed(request)
  return response
}

/**
 *
 * @param mnemonicList
 * @param aezeedPassphrase
 * @param walletPassword
 * @param rpc
 * @returns
 */
export function registerAccount(
  mnemonicList: string[],
  aezeedPassphrase?: string,
  walletPassword?: any,
  rpc?: GrpcClient,
) {
  rpc ||= createGrpcClient()

  const request = RegisterRequest.fromPartial({
    mnemonic: mnemonicList,
    aezeedPassphrase,
  })

  return new DaemonClientImpl(rpc).register(request)
}

/**
 *
 * @param profile
 * @param rpc
 * @returns
 */
export function updateAccount(profile: Profile, rpc?: GrpcClient) {
  rpc ||= createGrpcClient()

  return new AccountsClientImpl(rpc).updateProfile(profile)
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param rpc
 * @returns
 */
export function listAccounts(
  pageSize?: number,
  pageToken?: string,
  rpc?: GrpcClient,
) {
  rpc ||= createGrpcClient()

  const request = ListAccountsRequest.fromPartial({
    pageSize,
    pageToken,
  })
  return new AccountsClientImpl(rpc).listAccounts(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export function getAccount(id: string, rpc?: GrpcClient): Promise<Account> {
  rpc ||= createGrpcClient()
  const request = GetAccountRequest.fromPartial({
    id,
  })
  return new AccountsClientImpl(rpc).getAccount(request)
}
