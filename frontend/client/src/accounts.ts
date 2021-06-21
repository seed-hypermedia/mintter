import {AccountsClientImpl, GetAccountRequest, ListAccountsRequest} from '../.generated/accounts/v1alpha/accounts'
import type {Account, Profile} from '../.generated/accounts/v1alpha/accounts'
import {GenSeedRequest, RegisterRequest, DaemonClientImpl} from '../.generated/daemon/v1alpha/daemon'
import {MINTTER_API_URL_DEFAULT} from '.'
import {createGrpcClient, GrpcClient} from './grpc-client'

/**
 *
 * @param aezeedPassphrase
 * @param rpc
 * @returns
 */
export function generateSeed(aezeedPassphrase?: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient({host: MINTTER_API_URL_DEFAULT})

  const request = GenSeedRequest.fromPartial({})

  return new DaemonClientImpl(rpc).GenSeed(request)
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
  rpc ||= createGrpcClient({host: MINTTER_API_URL_DEFAULT})

  const request = RegisterRequest.fromPartial({
    mnemonic: mnemonicList,
    aezeedPassphrase,
  })

  return new DaemonClientImpl(rpc).Register(request)
}

/**
 *
 * @param profile
 * @param rpc
 * @returns
 */
export function updateAccount(profile: Profile, rpc?: GrpcClient) {
  rpc ||= createGrpcClient({host: MINTTER_API_URL_DEFAULT})

  return new AccountsClientImpl(rpc).UpdateProfile(profile)
}

/**
 *
 * @param pageSize
 * @param pageToken
 * @param rpc
 * @returns
 */
export function listAccounts(pageSize?: number, pageToken?: string, rpc?: GrpcClient) {
  rpc ||= createGrpcClient({host: MINTTER_API_URL_DEFAULT})

  const request = ListAccountsRequest.fromPartial({
    pageSize,
    pageToken,
  })
  return new AccountsClientImpl(rpc).ListAccounts(request)
}

/**
 *
 * @param id
 * @param rpc
 * @returns
 */
export function getAccount(id: string, rpc?: GrpcClient): Promise<Account> {
  rpc ||= createGrpcClient({host: MINTTER_API_URL_DEFAULT})

  const request = GetAccountRequest.fromPartial({
    id,
  })

  return new AccountsClientImpl(rpc).GetAccount(request)
}
