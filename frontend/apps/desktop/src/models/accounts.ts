import {useGRPCClient} from '@/app-context'
import appError from '@/errors'
import {useAccountKeys} from '@/models/daemon'
import {queryKeys} from '@/models/query-keys'
import {trpc} from '@/trpc'
import {Code, ConnectError} from '@connectrpc/connect'
import {GRPCClient, HMAccount, HMDocument, unpackHmId} from '@shm/shared'
import {useQueries, useQuery, UseQueryOptions} from '@tanstack/react-query'
import {useMemo} from 'react'
import {useConnectedPeers} from './networking'

export function useAccount_deprecated(accountId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery<HMAccount | null, ConnectError>(
    getAccountQuery(grpcClient, accountId),
  )
}

export function useAccounts(accountIds: string[]) {
  const grpcClient = useGRPCClient()
  return useQueries({
    queries: accountIds.map((id) => getAccountQuery(grpcClient, id)),
  })
}

function getAccountQuery(grpcClient: GRPCClient, accountId?: string) {
  return {
    enabled: !!accountId,
    queryKey: [queryKeys.ACCOUNT, accountId],
    queryFn: async () => {
      return null
    },
    useErrorBoundary: () => false,
  }
}

export function useAllAccounts() {
  const grpcClient = useGRPCClient()
  const contacts = useQuery<{accounts: Array<HMAccount>}, ConnectError>({
    // enabled: !!isDaemonReady,
    queryKey: [queryKeys.ALL_ACCOUNTS],
    queryFn: async () => {
      const listed = await grpcClient.accounts.listAccounts({})
      return listed
    },
    onError: (err) => {
      appError(`useAllAccounts Error ${err.code}: ${err.message}`, err.metadata)
    },
  })
  return contacts
}

export function useAllAccountProfiles() {
  const allAccounts = useAllAccounts()
  const allProfiles = useProfiles(
    allAccounts.data?.accounts.map((a) => a.id) || [],
    {enabled: !!allAccounts.data},
  )
  return allProfiles.map((query) => {
    return query.data
  })
}

export function useAccountIsConnected(account: HMAccount) {
  const peers = useConnectedPeers()
  return !!peers.data?.find((peer) => peer.accountId == account.id)
}

export function useMyAccount_deprecated() {
  const accountKeys = useAccountKeys()
  if (!accountKeys.data) return null
  if (!accountKeys.data.length) return null
  if (accountKeys.data.length > 1)
    throw new Error('Not supporting multiple accounts yet.')
  return accountKeys.data[0].accountId
}

export function useMyAccountIds() {
  const accountKeys = useAccountKeys()
  return accountKeys.data?.map((key) => key.accountId) || []
}

export function useSetProfile_deprecated() {
  throw new Error('useSetProfile_deprecated not supported anymore')
}

export function useProfile(
  accountId: string | undefined,
  version?: string | undefined,
  options?: UseQueryOptions<HMDocument | null> & {
    draftId?: string
  },
) {
  const grpcClient = useGRPCClient()
  const unpacked = unpackHmId(accountId)

  console.log(`== ~ userProfile unpacked:`, accountId, unpacked)
  const {data: profile, status: profileStatus} = useQuery(
    queryProfile({accountId: unpacked?.eid, version, grpcClient, ...options}),
  )
  const {data: draft, status: profileDraftStatus} = trpc.drafts.get.useQuery(
    accountId!,
  )

  return useMemo(
    () => ({
      profile,
      draft,
    }),
    [profileStatus, profileDraftStatus, accountId],
  )
}

/**
 *
 * @deprecated
 */
export function useProfiles(
  ids: string[],
  options?: UseQueryOptions<HMDocument | null>,
) {
  const grpcClient = useGRPCClient()
  return useQueries({
    queries: ids.map((accountId) => queryProfile({accountId, grpcClient})),
    ...(options || {}),
  })
}

export function queryProfile({
  accountId,
  version,
  grpcClient,
  ...options
}: {
  accountId?: string
  version?: string
  grpcClient: GRPCClient
} & UseQueryOptions<HMDocument | null>): UseQueryOptions<HMDocument | null> {
  return {
    enabled: !!accountId,
    queryKey: [queryKeys.PROFILE_DOCUMENT, accountId],
    useErrorBoundary: false,
    queryFn: async () => {
      try {
        console.log('=== GETPROFILEDOCUMENT', accountId)
        return grpcClient.documents.getProfileDocument({
          accountId,
          version,
        })
      } catch (error) {
        const connectErr = ConnectError.from(error)
        if (connectErr.code == Code.NotFound) {
          console.log(`Profile for ${accountId} not found`)
          return null
        }
        throw Error(
          `GetProfileDocument Error: ${connectErr.code} ${JSON.stringify(
            connectErr,
            null,
          )}`,
        )
      }
    },
    ...options,
  }
}
