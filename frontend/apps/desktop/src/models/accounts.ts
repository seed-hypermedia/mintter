import {useGRPCClient} from '@/app-context'
import appError from '@/errors'
import {useMyAccountIds} from '@/models/daemon'
import {queryKeys} from '@/models/query-keys'
import {client, trpc} from '@/trpc'
import {toPlainMessage} from '@bufbuild/protobuf'
import {Code, ConnectError} from '@connectrpc/connect'
import {createHmId, GRPCClient, HMAccount, HMDraft, hmId} from '@shm/shared'
import {useQueries, useQuery, UseQueryOptions} from '@tanstack/react-query'
import {useEntities, useEntity} from './entities'
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
    queryKey: [queryKeys.LIST_ACCOUNTS],
    queryFn: async () => {
      try {
        const listed = toPlainMessage(
          await grpcClient.accounts.listAccounts({}),
        )
        return listed
      } catch (e) {
        return {accounts: []}
      }
    },
    onError: (err) => {
      appError(`useAllAccounts Error ${err.code}: ${err.message}`, err.metadata)
    },
  })
  return contacts
}

export function useAllAccountProfiles() {
  const allAccounts = useAllAccounts()
  const allProfiles = useEntities(
    allAccounts.data?.accounts.map((a) => hmId('a', a.id)) || [],
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

/*
 * @deprecated use useMyAccountIds for multi-account support
 */
export function useMyAccount_deprecated() {
  const accountKeys = useMyAccountIds()
  if (!accountKeys.data) return null
  if (!accountKeys.data.length) return null
  if (accountKeys.data.length > 1)
    throw new Error('Not supporting multiple accounts yet.')
  const accountId = accountKeys.data[0]
  if (!accountId) return null
  return accountId
}

export function useSetProfile_deprecated() {
  throw new Error('useSetProfile_deprecated not supported anymore')
}

export function useDraft(draftId?: string) {
  return trpc.drafts.get.useQuery(draftId, {
    enabled: !!draftId,
  })
}
export function useDrafts(draftIds: string[]) {
  const grpcClient = useGRPCClient()
  return useQueries({
    queries: draftIds.map((draftId) => queryDraft({grpcClient, draftId})),
  })
}

export function useProfileWithDraft(accountId?: string) {
  const profile = useEntity(accountId ? hmId('a', accountId) : undefined)
  const draft = useDraft(accountId ? createHmId('a', accountId) : undefined)
  return {profile: profile.data?.document, draft: draft?.data}
}

export function useProfilesWithDrafts(accountIds: string[]) {
  const profiles = useEntities(accountIds.map((uid) => hmId('a', uid)))
  const drafts = useDrafts(accountIds)
  return accountIds.map((accountId, index) => {
    const profile = profiles[index]
    const draft = drafts[index]
    if (profile.data?.type !== 'a') return null
    return {
      accountId,
      account: profile.data?.account,
      document: profile.data?.document,
      draft: draft.data,
    }
  })
}

export function queryDraft({
  draftId,
  grpcClient,
  ...options
}: {
  draftId?: string
  grpcClient: GRPCClient
} & UseQueryOptions<HMDraft | null>): UseQueryOptions<HMDraft | null> {
  return {
    enabled: !!draftId,
    queryKey: [queryKeys.DRAFT, draftId],
    useErrorBoundary: false,
    queryFn: async () => {
      let draft: HMDraft | null = null
      if (!draftId) return null
      try {
        const draftReq = await client.drafts.get.query(draftId)

        console.log(`== ~ queryFn: ~ draft:`, draftReq)

        draft = draftReq
      } catch (error) {
        const connectErr = ConnectError.from(error)
        if ([Code.Unknown, Code.NotFound].includes(connectErr.code)) {
          // either the entity is unknown (no changes) or 404
        } else {
          console.log('queryProfile draft ERROR', connectErr)
          throw Error(
            `DRAFT get Error: ${connectErr.code} ${JSON.stringify(
              connectErr,
              null,
            )}`,
          )
        }
      }

      return draft
    },
    ...options,
  }
}
