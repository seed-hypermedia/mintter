import {Account, getAccount, getPublication, listBookmarks, updateListBookmarks} from '@app/client'
import {queryKeys} from '@app/hooks'
import {ClientPublication} from '@app/pages/publication'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {FlowContent, GroupingContent} from '@mintter/mttast'
import {QueryClient} from 'react-query'
import {visit} from 'unist-util-visit'
import {ActorRefFrom, InterpreterFrom, sendParent, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'

export type Bookmark = {url: string; ref: ActorRefFrom<ReturnType<typeof createBookmarkMachine>>}

export const bookmarksModel = createModel(
  {
    bookmarks: [] as Array<Bookmark>,
    errorMessage: '',
  },
  {
    events: {
      'REPORT.BOOKMARKS.SUCCESS': (bookmarks: Array<string>) => ({bookmarks}),
      'REPORT.BOOKMARKS.ERROR': (errorMessage: Error['message']) => ({errorMessage}),
      'BOOKMARK.ADD': (url: string) => ({url}),
      'BOOKMARK.REMOVE': (url: string) => ({url}),
      'BOOKMARK.CLEARALL': () => ({}),
      'BOOKMARK.RESET': () => ({}),
    },
  },
)

export function createBookmarksMachine(client: QueryClient) {
  return bookmarksModel.createMachine(
    {
      initial: 'loading',
      context: bookmarksModel.initialContext,
      on: {
        'BOOKMARK.CLEARALL': {
          actions: [
            bookmarksModel.assign({
              bookmarks: [],
            }),
            'persist',
          ],
        },
        'BOOKMARK.RESET': {
          target: 'loading',
        },
      },
      states: {
        loading: {
          invoke: {
            id: 'bookmarks-fetch',
            src: () => (sendBack) => {
              client
                .fetchQuery([queryKeys.GET_BOOKMARK_LIST], listBookmarks)
                .then((result) => {
                  sendBack({type: 'REPORT.BOOKMARKS.SUCCESS', bookmarks: result || []})
                })
                .catch((e: Error) => {
                  sendBack({type: 'REPORT.BOOKMARKS.ERROR', errorMessage: e.message})
                })
            },
          },
          on: {
            'REPORT.BOOKMARKS.SUCCESS': {
              target: 'ready',
              actions: bookmarksModel.assign({
                bookmarks: (_, event) => {
                  return event.bookmarks.map((url) => ({
                    url,
                    ref: spawn(createBookmarkMachine(client, url)),
                  }))
                },
              }),
            },
            'REPORT.BOOKMARKS.ERROR': {
              target: 'errored',
              actions: bookmarksModel.assign({
                errorMessage: (_, event) => event.errorMessage,
              }),
            },
          },
        },
        ready: {
          on: {
            'BOOKMARK.ADD': {
              actions: [
                bookmarksModel.assign({
                  bookmarks: (context, event) => {
                    let isIncluded = context.bookmarks.filter((bm) => bm.url == event.url)

                    if (isIncluded.length) return context.bookmarks

                    return [
                      ...context.bookmarks,
                      {
                        url: event.url,
                        ref: spawn(createBookmarkMachine(client, event.url)),
                      },
                    ]
                  },
                }),
                'persist',
              ],
            },
            'BOOKMARK.REMOVE': {
              actions: [
                bookmarksModel.assign({
                  bookmarks: (context, event) => context.bookmarks.filter((bookmark) => bookmark.url != event.url),
                }),
                'persist',
              ],
            },
          },
        },
        errored: {},
      },
    },
    {
      actions: {
        persist: (ctx) => {
          try {
            updateListBookmarks(ctx.bookmarks.map(({url}) => url) || [])
          } catch (e) {
            console.error(e)
          }
        },
      },
    },
  )
}

export const bookmarkModel = createModel(
  {
    url: '',
    publication: null as ClientPublication | null,
    block: null as FlowContent | null,
    author: null as Account | null,
    errorMessage: '',
  },
  {
    events: {
      RETRY: () => ({}),
      'BOOKMARK.ITEM.DELETE': (url: string) => ({url}),
      'REPORT.BOOKMARK.ITEM.SUCCESS': (publication: ClientPublication, author: Account, block: FlowContent | null) => ({
        publication,
        author,
        block,
      }),
      'REPORT.BOOKMARK.ITEM.ERROR': (errorMessage: Error['message']) => ({errorMessage}),
    },
  },
)

export function createBookmarkMachine(client: QueryClient, url: string) {
  return bookmarkModel.createMachine(
    {
      context: {
        ...bookmarkModel.initialContext,
        url,
      },
      initial: 'loading',
      states: {
        loading: {
          invoke: {
            id: 'fetchItemData',
            src: 'fetchItemData',
          },
          on: {
            'REPORT.BOOKMARK.ITEM.SUCCESS': {
              target: 'idle',
              actions: [
                bookmarkModel.assign({
                  publication: (_, event) => event.publication,
                  block: (_, event) => event.block,
                  author: (_, event) => event.author,
                }),
              ],
            },
            'REPORT.BOOKMARK.ITEM.ERROR': {
              target: 'errored',
              actions: [
                bookmarkModel.assign({
                  errorMessage: (_, event) => event.errorMessage,
                }),
              ],
            },
          },
        },
        errored: {
          on: {
            RETRY: {
              target: 'loading',
              actions: [
                bookmarkModel.assign({
                  errorMessage: '',
                }),
              ],
            },
          },
        },
        idle: {
          on: {
            'BOOKMARK.ITEM.DELETE': {
              actions: [
                (_, event) => {
                  sendParent(bookmarksModel.events['BOOKMARK.REMOVE'](event.url))
                },
              ],
            },
          },
        },
      },
    },
    {
      services: {
        fetchItemData: (context) => (sendBack) => {
          ;(async () => {
            let [documentId, version, blockId] = getIdsfromUrl(context.url)

            let publication: ClientPublication = await client.fetchQuery(
              [queryKeys.GET_PUBLICATION, documentId, version],
              async () => {
                let pub = await getPublication(documentId, version)
                let content: [GroupingContent] = pub.document?.content ? JSON.parse(pub.document?.content) : null

                return {
                  ...pub,
                  document: {
                    ...pub.document,
                    content,
                  },
                }
              },
            )

            let author = await client.fetchQuery([queryKeys.GET_ACCOUNT, publication.document?.author], () =>
              getAccount(publication.document?.author as string),
            )

            let block: FlowContent | null = null

            if (publication.document.content) {
              visit(publication.document.content[0], {id: blockId}, (node) => {
                block = node
              })
            }

            sendBack(bookmarkModel.events['REPORT.BOOKMARK.ITEM.SUCCESS'](publication, author, block))
          })()
        },
      },
    },
  )
}

const [BookmarksProvider, useBookmarksService, createBookmarksSelector] =
  createInterpreterContext<InterpreterFrom<ReturnType<typeof createBookmarksMachine>>>('Bookmarks')

export {BookmarksProvider, useBookmarksService}

export const useBookmarks = createBookmarksSelector((state) => state.context.bookmarks)
