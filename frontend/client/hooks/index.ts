import type {HookOptions} from './types'
import type {GroupingContent} from '@mintter/mttast'
import type {UseQueryResult} from 'react-query'
import type {Account, Info, Document, Publication, PeerInfo} from '../src'
import {useQuery, useQueryClient} from 'react-query'
import {useMemo} from 'react'
import {
  getAccount,
  getInfo,
  getDocument,
  getDraft,
  listPeerAddrs,
  getPublication,
  ListDraftsResponse,
  listDrafts,
  ListPublicationsResponse,
  listPublications,
  listAccounts,
} from '../src'

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
  return useQuery(
    ['AccountInfo'],
    async () => {
      const resp = await getInfo(options.rpc)
      return resp
    },
    options,
  )
}

/**
 *
 * @param documentId
 * @param options
 * @returns
 */
export function useDocument(documentId: string, options: HookOptions<Document> = {}) {
  const documentQuery = useQuery<Document>(['Document', documentId], () => getDocument(documentId, options.rpc), {
    enabled: !!documentId,
  })

  const data = useMemo(() => documentQuery.data, [documentQuery.data])

  return {
    ...documentQuery,
    data,
  }
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
      const [_key, draftId] = queryKey as [string, string]
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
export function useDraftsList(options: any = {}) {
  const draftsListQuery = useQuery<ListDraftsResponse>('DraftList', async () => {
    return listDrafts()
  })

  const data = useMemo(() => draftsListQuery.data?.documents.map((d) => ({document: d})), [draftsListQuery.data])

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

  const data = useMemo(() => peerAddrsQuery.data, [peerAddrsQuery.data])

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
      const [_key, publicationId] = queryKey as [string, string]
      return getPublication(publicationId, options.rpc)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )

  const content: [GroupingContent] = useMemo(
    () => (publicationQuery.data?.document?.content ? JSON.parse(publicationQuery.data?.document?.content) : null),
    [publicationQuery.data],
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

/**
 *
 * @deprecated
 */
export function useOthersPublicationsList(options = {}) {
  const queryClient = useQueryClient()
  const info = queryClient.getQueryData<Info>('AccountInfo')
  const myPubsListQuery = useQuery<ListPublicationsResponse>(['PublicationList', 'OthersPublications'], async () => {
    return listPublications()
  })

  const data = useMemo(
    () =>
      myPubsListQuery.data?.publications.reduce((acc, current) => {
        if (current.document?.author != info?.accountId) {
          return (acc = [...acc, current])
        }

        return acc
      }, []),
    [myPubsListQuery.data, info],
  )

  return {
    ...myPubsListQuery,
    data,
  }
}

/**
 *
 * @deprecated
 */
export function useMyPublicationsList(options = {}) {
  const queryClient = useQueryClient()
  const info = queryClient.getQueryData<Info>('AccountInfo')
  const myPubsListQuery = useQuery<ListPublicationsResponse>(['PublicationList', 'MyPublications'], async () => {
    return listPublications()
  })

  const data = useMemo(
    () =>
      myPubsListQuery.data?.publications.reduce((acc, current) => {
        if (current.document?.author == info?.accountId) {
          return (acc = [...acc, current])
        }

        return acc
      }, []),
    [myPubsListQuery.data, info],
  )

  return {
    ...myPubsListQuery,
    data,
  }
}

export type UseQuoteResult = Omit<UseQueryResult<Document>, 'data'> & {
  data?: {
    document: Document
    quote: Block
  }
}

export type UseQuoteReturn = {
  document: Document
  quote: Block
}

/**
 *
 * @param documentId (string) the document id of the current quote
 * @param quoteId (string) the block id of the current quote
 * @param options
 * @returns
 */
export function useQuote(
  documentId: string,
  quoteId?: string,
  options: HookOptions<Document> = {},
): UseQueryResult<UseQuoteReturn> {
  const pubQuery = usePublication(documentId)
  const data = useMemo(() => {
    if (pubQuery.isSuccess) {
      return {
        document: pubQuery.data?.document,
        quote: pubQuery.data?.document?.blocks[quoteId],
      }
    } else {
      return {}
    }
  }, [pubQuery.data])

  return {
    ...pubQuery,
    data,
  }
}

export function useListAccounts() {
  const listAccountsQuery = useQuery('ListAccounts', () => listAccounts())

  const data = useMemo(() => listAccountsQuery.data?.accounts, [listAccountsQuery.data])

  return {
    ...listAccountsQuery,
    data,
  }
}
