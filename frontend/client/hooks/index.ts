import {useQuery, useQueryClient, UseQueryResult} from 'react-query'
import {useMemo} from 'react'
import {Account, Info, Document, Publication, Block, Quote, Link} from '../src'
import {
  getAccount,
  getInfo,
  getDocument,
  getDraft,
  PeerInfo,
  listPeerAddrs,
  getPublication,
  ListDraftsResponse,
  listDrafts,
  ListPublicationsResponse,
  listPublications,
  listAccounts,
} from '../src'
import {mockBlock, mockDocument, mockTextInlineElement, createId} from '../mocks'
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
  console.log('enter useDraft!')
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
      console.log('🚀 ~ file: index.ts ~ line 93 ~ resp', resp)
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
    const info = queryClient.getQueryData<Info>('AccountInfo')
    console.log('🚀 ~ file: index.ts ~ line 135 ~ usePeerAddrs ~ info', info)
    requestId = info?.peerId as string
  } else {
    requestId = peerId
  }
  console.log('🚀 ~ file: index.ts ~ line 152 ~ usePeerAddrs ~ requestId', requestId)
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
  const queryClient = useQueryClient()
  const info = queryClient.getQueryData<Info>('AccountInfo')
  const myPubsListQuery = useQuery<ListPublicationsResponse>('MyPubsList', async () => {
    return listPublications()
  })

  const data = useMemo(
    () =>
      myPubsListQuery.data?.publications.reduce((acc, current) => {
        if (current.document?.author != info?.accountId) {
          return (acc = [...acc, current.document])
        }

        return acc
      }, []),
    [myPubsListQuery.data, info],
  )
  console.log('🚀 ~ file: index.ts ~ line 205 ~ useMyPublicationsList ~ data', data)

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
  const myPubsListQuery = useQuery<ListPublicationsResponse>('MyPubsList', async () => {
    return listPublications()
  })

  const data = useMemo(
    () =>
      myPubsListQuery.data?.publications.reduce((acc, current) => {
        if (current.document?.author == info?.accountId) {
          return (acc = [...acc, current.document])
        }

        return acc
      }, []),
    [myPubsListQuery.data, info],
  )
  console.log('🚀 ~ file: index.ts ~ line 205 ~ useMyPublicationsList ~ data', data)

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
        id: createId(),
        url: `mtt://${createId()}/${createId()}`,
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

export function useListAccounts() {
  const listAccountsQuery = useQuery('ListAccounts', () => listAccounts())

  const data = useMemo(() => listAccountsQuery.data?.accounts, [listAccountsQuery.data])

  return {
    ...listAccountsQuery,
    data,
  }
}
