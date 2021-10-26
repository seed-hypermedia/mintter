import {
  Account,
  Document,
  getAccount,
  getDraft,
  getInfo,
  getPublication,
  Info,
  listAccounts,
  ListAccountsResponse,
  listDrafts,
  ListDraftsResponse,
  listPeerAddrs,
  listPublications,
  ListPublicationsResponse,
  PeerInfo,
  Publication,
} from '@mintter/client'
import type {FlowContent} from '@mintter/mttast'
import {useMemo} from 'react'
import type {UseQueryResult} from 'react-query'
import {useQuery, useQueryClient} from 'react-query'
import type {HookOptions} from './types'

export * from './types'

/**
 *
 * @param accountId
 * @param options
 * @returns
 */
export function useAccount(accountId = '', options: HookOptions<Account> = {}) {
  return useQuery(['Account', accountId], () => getAccount(accountId, options.rpc), options)
}

/**
 *
 * @param options
 * @returns
 */
export function useInfo(options: HookOptions<Info> = {}) {
  return useQuery(['AccountInfo'], () => getInfo(options.rpc), options)
}

/**
 *
 * @param draftId
 * @param options
 * @returns
 */
export function useDraft(draftId: string, options: HookOptions<Document> = {}): UseQueryResult<Document> {
  if (!draftId) {
    throw new Error(`useDraft: parameter "draftId" is required`)
  }

  if (Array.isArray(draftId)) {
    throw new Error(
      `Impossible render: You are trying to access a draft passing ${draftId.length} draft Ids => ${draftId
        .map((q) => q)
        .join(', ')}`,
    )
  }

  return useQuery(
    ['Draft', draftId],
    async ({queryKey}) => {
      const [, draftId] = queryKey as [string, string]
      return await getDraft(draftId, options.rpc)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )
}

/**
 *
 * @param options
 * @returns
 */
export function useDraftList() {
  const draftsListQuery = useQuery<ListDraftsResponse>('DraftsList', () => {
    return listDrafts()
  })

  const data: Array<{document: Document}> = useMemo(
    () => draftsListQuery.data?.documents?.map((d) => ({document: d})) || [],
    [draftsListQuery],
  )

  return {
    ...draftsListQuery,
    data,
  }
}

/**
 *
 * @param peerId
 * @param options
 * @returns
 */
export function usePeerAddrs(peerId?: string, options: HookOptions<PeerInfo['addrs']> = {}) {
  const queryClient = useQueryClient()

  let requestId: string
  if (!peerId) {
    const info = queryClient.getQueryData<Info>('AccountInfo')
    requestId = info?.peerId as string
  } else {
    requestId = peerId
  }
  const peerAddrsQuery = useQuery(['PeerAddrs', requestId], () => listPeerAddrs(requestId, options.rpc as any), {
    enabled: !!requestId,
    ...options,
  })

  const data = useMemo(() => peerAddrsQuery.data, [peerAddrsQuery])

  return {
    ...peerAddrsQuery,
    data,
  }
}

/**
 *
 * @param publicationId
 * @param options
 * @returns
 */
export function usePublication(publicationId: string, options: HookOptions<Publication> = {}) {
  const publicationQuery = useQuery(
    ['Publication', publicationId],
    async ({queryKey}) => {
      const [, publicationId] = queryKey as [string, string]
      return getPublication(publicationId, options.rpc)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )

  const content: Array<FlowContent> = useMemo(
    () => (publicationQuery.data?.document?.content ? JSON.parse(publicationQuery.data?.document?.content) : null),
    [publicationQuery],
  )

  return {
    ...publicationQuery,
    data: {
      ...publicationQuery.data,
      document: {
        ...publicationQuery.data?.document,
        content,
      },
    },
  }
}

export function useOthersPublicationsList(options: HookOptions<ListPublicationsResponse> = {}) {
  const queryClient = useQueryClient()
  const info = queryClient.getQueryData<Info>('AccountInfo')
  const myPubsListQuery = useQuery(
    ['PublicationList', 'OthersPublications'],
    async () => {
      return listPublications()
    },
    options,
  )
  const data: Array<Publication> = useMemo(
    () => myPubsListQuery.data?.publications.filter((current) => current.document?.author != info?.accountId),
    [myPubsListQuery.data, info?.accountId],
  )

  return {
    ...myPubsListQuery,
    data,
  }
}

export function useMyPublicationsList(options: HookOptions<ListPublicationsResponse> = {}) {
  const queryClient = useQueryClient()
  const info = queryClient.getQueryData<Info>('AccountInfo')
  const myPubsListQuery = useQuery(
    ['PublicationList', 'MyPublications'],
    async () => {
      return listPublications()
    },
    options,
  )
  const data: Array<Publication> = useMemo(
    () => myPubsListQuery.data?.publications.filter((current) => current.document?.author == info?.accountId),
    [myPubsListQuery.data, info?.accountId],
  )

  return {
    ...myPubsListQuery,
    data,
  }
}

export function useListAccounts(options: HookOptions<ListAccountsResponse> = {}) {
  const listAccountsQuery = useQuery(['ListAccounts'], () => listAccounts(), {
    refetchInterval: 5000,
    ...options,
  })

  const data = useMemo(() => listAccountsQuery.data?.accounts || [], [listAccountsQuery])

  return {
    ...listAccountsQuery,
    data,
  }
}
