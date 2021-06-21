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
  mock,
  Quote,
  Link,
} from '../src'
import {mockBlock, mockDocument, mockTextInlineElement} from '../src/mock'
import type {HookOptions} from './types'

/**
 *
 * @param accountId
 * @param options
 * @returns
 */
export function useAccount(accountId = '', options: HookOptions<Account> = {}) {
  const accountQuery = useQuery(['Account', accountId], () => getAccount(accountId, options.rpc), options)

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
  const infoQuery = useQuery(['GetInfo'], () => getInfo(options.rpc), options)

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
      return getDraft(draftId, options.rpc)
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
      return getPublication(publicationId, version, options.rpc)
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

export type UseQuoteResult = Omit<UseQueryResult<Document>, 'data'> & {
  data?: {
    document: Document
    quote: Block
  }
}

/**
 *
 * @param documentId (string) the document id of the current quote
 * @param quoteId (string) the block id of the current quote
 * @param options
 * @returns
 */
export function useQuote(documentId: string, quoteId?: string, options: HookOptions<Document> = {}): any {
  console.warn('called mocked function "useQuote"')

  const quoteQuery = useQuery(
    ['Document', documentId],
    async () => {
      console.warn('called mocked function "useQuote"')

      const innerQuote = {
        id: mock.createId(),
        url: `mtt://${mock.createId()}/${mock.createId()}`,
      }

      const doc = quoteId
        ? mockDocument({
            blocks: [
              mockBlock(),
              Block.fromPartial({
                id: quoteId,
                elements:
                  Math.random() * 1 > 0.5
                    ? [
                        mockTextInlineElement(),
                        {
                          quote: Quote.fromPartial({
                            linkKey: innerQuote.id,
                          }),
                        },
                      ]
                    : undefined,
              }),
            ],
            links: {
              [innerQuote.id]: Link.fromPartial({
                uri: innerQuote.url,
              }),
            },
          })
        : mockDocument({title: 'this is a title'})

      const block = quoteId ? doc.blocks[quoteId] : undefined

      return {
        document: doc,
        quote: block,
      }
    },
    // {
    //   enabled: !!quoteId,
    // },
  )

  const data = useMemo(() => quoteQuery.data, [quoteQuery.data])

  return {
    ...quoteQuery,
    data,
  }
}
