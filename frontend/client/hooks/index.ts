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
  Quote,
  Link,
  ListDraftsResponse,
  listDrafts,
} from '../src'
import {mockBlock, mockDocument, mockTextInlineElement} from '../mocks'
import type {HookOptions} from './types'

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
  return useQuery(['GetInfo'], () => getInfo(options.rpc), options)
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
      const resp = await getDraft(draftId, options.rpc)
      return resp
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
export function useDraftsList(options: any = {}) {
  const draftsListQuery = useQuery<ListDraftsResponse>('DraftList', async () => {
    return listDrafts()
  })

  const data = useMemo(() => draftsListQuery.data?.documents, [draftsListQuery.data])

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
