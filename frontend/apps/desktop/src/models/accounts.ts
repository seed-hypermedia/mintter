import {useGRPCClient} from '@/app-context'
import appError from '@/errors'
import {useAccountKeys} from '@/models/daemon'
import {queryKeys} from '@/models/query-keys'
import {client, trpc} from '@/trpc'
import {PlainMessage} from '@bufbuild/protobuf'
import {Code, ConnectError} from '@connectrpc/connect'
import {
  Document,
  GRPCClient,
  HMAccount,
  HMDocument,
  HMDraft,
  unpackHmId,
} from '@shm/shared'
import {useQueries, useQuery, UseQueryOptions} from '@tanstack/react-query'
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
  return useQuery(
    queryProfile({
      accountId,
      version,
      grpcClient,
      ...options,
    }),
  )
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
  const profile = useProfile(accountId)
  const draft = useDraft(accountId)
  return {profile: profile.data, draft: draft.data}
}

export function useProfilesWithDrafts(accountIds: string[]) {
  const profiles = useProfiles(accountIds)
  const drafts = useDrafts(accountIds)
  return accountIds.map((accountId, index) => {
    const profile = profiles[index]
    const draft = drafts[index]
    return {accountId, profile: profile.data, draft: draft.data}
  })
}

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
      if (!accountId) return null
      const unpacked = unpackHmId(accountId)
      let profile: PlainMessage<Document> | null = null
      try {
        const profileReq = await grpcClient.documents.getProfileDocument({
          accountId: unpacked ? unpacked.eid : accountId,
          version,
        })
        profile = profileReq
      } catch (error) {
        const connectErr = ConnectError.from(error)
        if ([Code.Unknown, Code.NotFound].includes(connectErr.code)) {
          // either the entity is unknown (no changes) or 404
        } else {
          console.log('queryProfile ERROR', connectErr)
          throw Error(
            `GetProfileDocument Error: ${connectErr.code} ${JSON.stringify(
              connectErr,
              null,
            )}`,
          )
        }
      }

      return profile
    },
    ...options,
  }
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
