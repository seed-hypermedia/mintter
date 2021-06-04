import { UseQueryOptions, useQuery, useQueryClient } from 'react-query'
import { useMemo } from 'react'
import { Account, getAccount, Info, getInfo, Document, getDocument, getDraft, PeerInfo, listPeerAddrs, Publication, getPublication, Block } from '../src'
import { mockBlock, mockTextInlineElement } from '../src/mock'

export type UseAccountOptions = UseQueryOptions<Account, unknown, Account>

/**
 * 
 * @param accountId 
 * @param options 
 * @returns 
 */
export function useAccount(accountId: string = '', options: UseAccountOptions = {}) {
  const accountQuery = useQuery(
    ['Account', accountId],
    () => getAccount(accountId),
    options
  )

  const data = useMemo(() => accountQuery.data, [accountQuery.data])

  return {
    ...accountQuery,
    data
  }
}

export type UseInfoOptions = UseQueryOptions<Info, unknown, Info>

/**
 * 
 * @param options 
 * @returns 
 */
export function useInfo(options: UseInfoOptions = {}) {
  const infoQuery = useQuery(['GetInfo'], getInfo, options)

  const data = useMemo(() => infoQuery.data, [infoQuery.data])

  return {
    ...infoQuery,
    data
  }
}

export type UseDocumentOptions = UseQueryOptions<Document, unknown, Document>

/**
 * 
 * @param documentId 
 * @param options 
 * @returns 
 */
export function useDocument(documentId: string, options: UseDocumentOptions = {}) {
  const documentQuery = useQuery<Document>(
    ['Document', documentId],
    () => getDocument(documentId),
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

export type UseDraftOptions = UseQueryOptions<Document, unknown, Document>

/**
 * 
 * @param draftId 
 * @param options 
 * @returns 
 */
export function useDraft(draftId: string, options: UseDraftOptions = {}) {
  const draftQuery = useQuery(
    ['Draft', draftId],
    async ({ queryKey }) => {
      const [_key, draftId] = queryKey as [string, string]
      return getDraft(draftId)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )

  const data = useMemo(() => draftQuery.data, [draftQuery.data])

  return {
    ...draftQuery,
    data
  }
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
  };
}

export type UsePeerAddrsOptions = UseQueryOptions<PeerInfo['addrs'], unknown, PeerInfo['addrs']>

/**
 * 
 * @param peerId 
 * @param options 
 * @returns 
 */
export function usePeerAddrs(peerId?: string, options: UsePeerAddrsOptions = {}) {
  const queryClient = useQueryClient()

  let requestId: string
  if (!peerId) {
    const info = queryClient.getQueryData<Info>('GetInfo')
    requestId = info?.peerId as string
  } else {
    requestId = peerId
  }

  const peerAddrsQuery = useQuery(
    ['PeerAddrs', requestId],
    () => listPeerAddrs(requestId),
    {
      enabled: !!requestId,
      ...options,
    },
  )

  const data = useMemo(() => peerAddrsQuery.data, [peerAddrsQuery.data])

  return {
    ...peerAddrsQuery,
    data,
  }
}

/**
 *
 * @deprecated
 */
export function useSuggestedConnections({ page } = { page: 0 }, options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  };
}

export type UsePublicationOptions = UseQueryOptions<Publication, unknown, Publication>

/**
 * 
 * @param publicationId 
 * @param version 
 * @param options 
 * @returns 
 */
export function usePublication(publicationId: string, version?: string, options: UsePublicationOptions = {}) {
  const publicationQuery = useQuery(
    ['Publication', publicationId, version],
    async ({ queryKey }) => {
      const [_key, publicationId, version] = queryKey as [string, string, string]
      return getPublication(publicationId, version)
    },
    {
      refetchOnWindowFocus: false,
      ...options,
    },
  )

  const data = useMemo(() => publicationQuery.data, [publicationQuery.data])

  return {
    ...publicationQuery,
    data
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
  };
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
  };
}

export type UseQuoteOptions = UseQueryOptions<Block, unknown, Block>

/**
 * 
 * @param url 
 * @param options 
 * @returns 
 */
export function useQuote(url: string, options: UseQuoteOptions = {}) {
  const [, blockId] = url.split('/')

  console.warn('called mocked function "useQuote"');

  const quoteQuery = useQuery(
    ['Quote', blockId],
    async () => {
      console.warn('called mocked function "useQuote"');
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
            code: false
          })
        ]
      })
      return block
    },
    {
      enabled: !!blockId
    }
  )

  const data = useMemo(() => quoteQuery.data, [quoteQuery.data])

  return {
    ...quoteQuery,
    data
  }
}