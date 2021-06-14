import {useQuery, useQueryClient, UseQueryResult} from 'react-query'
import {useMemo} from 'react'
import {
  Account,
  getAccount,
  Info,
  getInfo,
  Document,
  getDocument,
  getDraft,
  PeerInfo,
  listPeerAddrs,
  Publication,
  getPublication,
  Block,
} from '../src'
import {mockBlock, mockTextInlineElement} from '../src/mock'
import type {HookOptions} from './types'

/**
 *
 * @param accountId
 * @param options
 * @returns
 */
export function useAccount(accountId = '', options: HookOptions<Account> = {}) {
  const accountQuery = useQuery(['Account', accountId], () => getAccount(accountId, options.rpc as any), options)

  const data = useMemo(() => accountQuery.data, [accountQuery.data])

  return {
    ...accountQuery,
    data,
  }
}

/**
 *
 * @param options
 * @returns
 */
export function useInfo(options: HookOptions<Info> = {}) {
  const infoQuery = useQuery(['GetInfo'], () => getInfo(options.rpc as any), options)

  const data = useMemo(() => infoQuery.data, [infoQuery.data])

  return {
    ...infoQuery,
    data,
  }
}

/**
 *
 * @param documentId
 * @param options
 * @returns
 */
export function useDocument(documentId: string, options: HookOptions<Document> = {}) {
  const documentQuery = useQuery<Document>(
    ['Document', documentId],
    () => getDocument(documentId, options.rpc as any),
    {
      enabled: !!documentId,
    },
  )

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
    throw new Error('Impossible render')
    // throw new Error(
    //   `Impossible render: You are trying to access a draft passing ${draftId.length
    //   } draft Ids => ${draftId.map(q => q).join(', ')}`,
    // )
  }

  return useQuery(
    ['Draft', draftId],
    async ({queryKey}) => {
      const [_key, draftId] = queryKey as [string, string]
      return getDraft(draftId, options.rpc as any)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )
}

/**
 *
 * @deprecated
 */
export function useDraftsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
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
    const info = queryClient.getQueryData<Info>('GetInfo')
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
 * @param version
 * @param options
 * @returns
 */
export function usePublication(publicationId: string, version?: string, options: HookOptions<Publication> = {}) {
  const publicationQuery = useQuery(
    ['Publication', publicationId, version],
    async ({queryKey}) => {
      const [_key, publicationId, version] = queryKey as [string, string, string]
      return getPublication(publicationId, version, options.rpc as any)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )

  const data = useMemo(() => publicationQuery.data, [publicationQuery.data])

  return {
    ...publicationQuery,
    data,
  }
}

/**
 *
 * @deprecated
 */
export function useOthersPublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  }
}

/**
 *
 * @deprecated
 */
export function useMyPublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  }
}

/**
 *
 * @param url
 * @param options
 * @returns
 */
export function useQuote(url: string, options: HookOptions<Block> = {}) {
  const [, blockId] = url.split('/')

  console.warn('called mocked function "useQuote"')

  const quoteQuery = useQuery(
    ['Quote', blockId],
    async () => {
      console.warn('called mocked function "useQuote"')
      const block = mockBlock({
        id: blockId,
        elements: [
          mockTextInlineElement({
            text: `${blockId}: dummy quote text`,
            linkKey: '',
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            blockquote: false,
            code: false,
          }),
        ],
      })
      return block
    },
    {
      enabled: !!blockId,
    },
  )

  const data = useMemo(() => quoteQuery.data, [quoteQuery.data])

  return {
    ...quoteQuery,
    data,
  }
}
