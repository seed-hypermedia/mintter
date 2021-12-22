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
import {useAccountInfo} from '../auth-context'
import type {HookOptions} from './types'

export * from './types'

export const queryKeys = {
  GET_DRAFT_LIST: 'GET_DRAFT_LIST',
  GET_ACCOUNT: 'GET_ACCOUNT',
  GET_ACCOUNT_LIST: 'GET_ACCOUNT_LIST',
  GET_ACCOUNT_INFO: 'GET_ACCOUNT_INFO',
  GET_DRAFT: 'GET_DRAFT',
  GET_PEER_ADDRS: 'GET_PEER_ADDRS',
  GET_PUBLICATION: 'GET_PUBLICATION',
  GET_PUBLICATION_LIST: 'GET_PUBLICATION_LIST',
  OTHERS_PUBLICATION_LIST: 'OTHERS_PUBLICATION_LIST',
  MY_PUBLICATION_LIST: 'MY_PUBLICATION_LIST',
}

/**
 *
 * @param accountId
 * @param options
 * @returns
 */
export function useAccount(accountId = '', options: HookOptions<Account> = {}) {
  return useQuery(
    [queryKeys.GET_ACCOUNT, accountId],
    async () => {
      let result = await getAccount(accountId, options.rpc)
      return result
    },
    options,
  )
}

/**
 *
 * @param options
 * @returns
 */
export function useInfo(options: HookOptions<Info> = {}) {
  return useQuery([queryKeys.GET_ACCOUNT_INFO], () => getInfo(options.rpc), {
    ...options,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
    retryOnMount: false,
  })
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
    [queryKeys.GET_DRAFT, draftId],
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
  const draftsListQuery = useQuery<ListDraftsResponse>(queryKeys.GET_DRAFT_LIST, () => {
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
    const info = useAccountInfo()

    requestId = info?.peerId as string
  } else {
    requestId = peerId
  }

  const peerAddrsQuery = useQuery(
    [queryKeys.GET_PEER_ADDRS, requestId],
    () => listPeerAddrs(requestId, options.rpc as any),
    {
      enabled: !!requestId,
      ...options,
    },
  )

  console.log('peerAddrsQuery: ', peerAddrsQuery)

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
    [queryKeys.GET_PUBLICATION, publicationId],
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

export function useFiles(options: HookOptions<ListPublicationsResponse> = {}) {
  const fileListQuery = useQuery(
    [queryKeys.GET_PUBLICATION_LIST, queryKeys.OTHERS_PUBLICATION_LIST],
    async () => {
      return listPublications()
    },
    options,
  )
  const data = useMemo(() => fileListQuery.data?.publications, [fileListQuery.data])

  return {
    ...fileListQuery,
    data,
  }
}

export function useOthersPublicationsList(options: HookOptions<ListPublicationsResponse> = {}) {
  const info = useAccountInfo()
  const myPubsListQuery = useQuery(
    [queryKeys.GET_PUBLICATION_LIST, queryKeys.OTHERS_PUBLICATION_LIST],
    async () => {
      return listPublications()
    },
    options,
  )
  const data: Array<Publication> = useMemo(
    () =>
      myPubsListQuery.data?.publications.filter((current) => {
        if (!info) return false
        return current.document?.author != info.accountId
      }) || [],
    [myPubsListQuery.data, info?.accountId],
  )

  console.log('useOthersPublicationsList', data)

  return {
    ...myPubsListQuery,
    data,
  }
}

export function useMyPublicationsList(options: HookOptions<ListPublicationsResponse> = {}) {
  const info = useAccountInfo()
  const myPubsListQuery = useQuery(
    [queryKeys.GET_PUBLICATION_LIST, queryKeys.MY_PUBLICATION_LIST],
    async () => {
      return listPublications()
    },
    options,
  )
  const data: Array<Publication> = useMemo(
    () =>
      myPubsListQuery.data?.publications.filter((current) => {
        if (!info) return false
        return current.document?.author == info.accountId
      }) || [],
    [myPubsListQuery.data, info],
  )

  console.log('useMyPublicationsList', data)

  return {
    ...myPubsListQuery,
    data,
  }
}

export function useListAccounts(options: HookOptions<ListAccountsResponse> = {}) {
  const listAccountsQuery = useQuery([queryKeys.GET_ACCOUNT_LIST], () => listAccounts(), {
    refetchInterval: 5000,
    ...options,
  })

  const data = useMemo(() => listAccountsQuery.data?.accounts || [], [listAccountsQuery])

  return {
    ...listAccountsQuery,
    data,
  }
}
