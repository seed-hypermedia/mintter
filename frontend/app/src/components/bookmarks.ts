import {
  Account,
  getAccount,
  getPublication,
  listBookmarks,
  updateListBookmarks,
} from '@app/client'
import {queryKeys} from '@app/hooks'
import {FlowContent, GroupingContent} from '@app/mttast'
import {ClientPublication} from '@app/publication-machine'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {debug, error} from '@app/utils/logger'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {QueryClient} from '@tanstack/react-query'
import {visit} from 'unist-util-visit'
import {
  ActorRefFrom,
  assign,
  createMachine,
  InterpreterFrom,
  sendParent,
  spawn,
} from 'xstate'

export type Bookmark = {
  url: string
  ref: ActorRefFrom<ReturnType<typeof createBookmarkMachine>>
}

export type BookmarkListContext = {
  bookmarks: Array<Bookmark>
  errorMessage: string
}

type BookmarkListEvent =
  | {type: 'REPORT.BOOKMARKS.SUCCESS'; bookmarks: Array<string>}
  | {type: 'REPORT.BOOKMARKS.ERROR'; errorMessage: Error['message']}
  | {type: 'BOOKMARK.ADD'; url: string}
  | {type: 'BOOKMARK.REMOVE'; url: string}
  | {type: 'BOOKMARK.CLEARALL'}
  | {type: 'BOOKMARK.RESET'}
  | {type: 'BOOKMARK.FILE.DELETE'; documentId: string; version: string | null}

export function createBookmarkListMachine(client: QueryClient) {
  return createMachine(
    {
      id: 'bookmarklist-machine',
      predictableActionArguments: true,
      tsTypes: {} as import('./bookmarks.typegen').Typegen0,
      schema: {
        context: {} as BookmarkListContext,
        events: {} as BookmarkListEvent,
      },
      context: {
        bookmarks: [],
        errorMessage: '',
      },
      initial: 'loading',
      on: {
        'BOOKMARK.CLEARALL': {
          actions: ['clearBookmarkList', 'persist'],
        },
        'BOOKMARK.RESET': {
          target: 'loading',
        },
        'BOOKMARK.FILE.DELETE': {
          actions: ['cleanBookmarks', 'persist'],
        },
      },
      states: {
        loading: {
          invoke: {
            id: 'fetchBookmarkList',
            src: 'fetchBookmarkList',
          },
          on: {
            'REPORT.BOOKMARKS.SUCCESS': {
              target: 'ready',
              actions: ['assignBookmarkList'],
            },
            'REPORT.BOOKMARKS.ERROR': {
              target: 'errored',
              actions: ['assignError'],
            },
          },
        },
        ready: {
          on: {
            'BOOKMARK.ADD': {
              actions: ['addBookmark', 'persist'],
            },
            'BOOKMARK.REMOVE': {
              actions: ['removeBookmark', 'persist'],
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
            error(e)
          }
        },
        assignBookmarkList: assign({
          bookmarks: (_, event) => {
            return event.bookmarks.map((url) => ({
              url,
              ref: spawn(createBookmarkMachine(client, url)),
            }))
          },
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        addBookmark: assign({
          bookmarks: (context, event) => {
            debug('ADD BOOKMARK', event)
            let isIncluded = context.bookmarks.find((bm) => bm.url == event.url)

            if (isIncluded) return context.bookmarks

            return [
              ...context.bookmarks,
              {
                url: event.url,
                ref: spawn(createBookmarkMachine(client, event.url)),
              },
            ]
          },
        }),
        removeBookmark: assign({
          bookmarks: (context, event) =>
            context.bookmarks.filter((bookmark) => bookmark.url != event.url),
        }),
        // @ts-ignore
        clearBookmarkList: assign({
          bookmarks: [],
        }),
        cleanBookmarks: assign({
          bookmarks: (context, event) => {
            return context.bookmarks.filter(
              (b) => !b.url.includes(event.documentId),
            )
          },
        }),
      },
      services: {
        fetchBookmarkList: () => (sendBack) => {
          client
            .fetchQuery([queryKeys.GET_BOOKMARK_LIST], listBookmarks)
            .then((result) => {
              sendBack({
                type: 'REPORT.BOOKMARKS.SUCCESS',
                bookmarks: result || [],
              })
            })
            .catch((e: Error) => {
              sendBack({
                type: 'REPORT.BOOKMARKS.ERROR',
                errorMessage: e.message,
              })
            })
        },
      },
    },
  )
}

export type BookmarkContext = {
  url: string
  publication: ClientPublication | null
  block: FlowContent | null
  author: Account | null
  errorMessage: string
}

type BookmarkEvent =
  | {type: 'RETRY'}
  | {type: 'BOOKMARK.ITEM.DELETE'; url: string}
  | {
      type: 'REPORT.BOOKMARK.ITEM.SUCCESS'
      publication: ClientPublication
      author: Account
      block: FlowContent | null
    }
  | {
      type: 'REPORT.BOOKMARK.ITEM.ERROR'
      errorMessage: Error['message']
    }

export function createBookmarkMachine(client: QueryClient, url: string) {
  return createMachine(
    {
      id: 'bookmark-machine',
      predictableActionArguments: true,
      tsTypes: {} as import('./bookmarks.typegen').Typegen1,
      schema: {
        context: {} as BookmarkContext,
        events: {} as BookmarkEvent,
      },
      context: {
        url,
        publication: null,
        author: null,
        block: null,
        errorMessage: '',
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
              actions: ['assignBookmark'],
            },
            'REPORT.BOOKMARK.ITEM.ERROR': {
              target: 'errored',
              actions: ['assignError'],
            },
          },
        },
        errored: {
          on: {
            RETRY: {
              target: 'loading',
              actions: ['clearError'],
            },
          },
        },
        idle: {
          on: {
            'BOOKMARK.ITEM.DELETE': {
              actions: ['removeBookmark'],
            },
          },
        },
      },
    },
    {
      actions: {
        assignBookmark: assign({
          publication: (_, event) => event.publication,
          block: (_, event) => event.block,
          author: (_, event) => event.author,
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        // @ts-ignore
        clearError: assign({
          errorMessage: '',
        }),
        removeBookmark: (_, event) => {
          sendParent({type: 'BOOKMARK.REMOVE', url: event.url})
        },
      },
      services: {
        // TODO: @horacio refactor this to use the files machines
        fetchItemData: (context) => (sendBack) => {
          try {
            ;(async () => {
              let [documentId, version, blockId] = getIdsfromUrl(context.url)

              let publication: ClientPublication = await client.fetchQuery(
                [queryKeys.GET_PUBLICATION, documentId, version],
                async () => {
                  let pub = await getPublication(documentId, version)
                  let content: [GroupingContent] = pub.document?.content
                    ? JSON.parse(pub.document?.content)
                    : null

                  return {
                    ...pub,
                    document: {
                      ...pub.document,
                      content,
                    },
                  }
                },
              )

              let author = await client.fetchQuery(
                [queryKeys.GET_ACCOUNT, publication.document?.author],
                () => getAccount(publication.document?.author as string),
              )

              let block: FlowContent | null = null

              if (publication.document.content) {
                visit(
                  publication.document.content[0],
                  {id: blockId},
                  (node) => {
                    block = node
                  },
                )
              }

              sendBack({
                type: 'REPORT.BOOKMARK.ITEM.SUCCESS',
                publication,
                author,
                block,
              })
            })()
          } catch (error) {
            sendBack({
              type: 'REPORT.BOOKMARK.ITEM.ERROR',
              errorMessage: JSON.stringify(error),
            })
          }
        },
      },
    },
  )
}

const [BookmarksProvider, useBookmarksService, createBookmarksSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createBookmarkListMachine>>
  >('Bookmarks')
export {BookmarksProvider, useBookmarksService}

export const useBookmarks = createBookmarksSelector(
  (state) => state.context.bookmarks,
)
