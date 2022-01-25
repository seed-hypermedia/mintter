import {createStore} from '@app/store'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {ActorRef, InterpreterFrom, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'

const store = createStore('.bookmarks.dat')

export type Bookmark = {link: string; ref?: ActorRef<ReturnType<typeof createBookmarkMachine>>}

export const bookmarksModel = createModel(
  {
    bookmarks: [] as Array<Bookmark>,
    errorMessage: '',
  },
  {
    events: {
      'REPORT.GET.BOOKMARKS.SUCCESS': (bookmarks: Array<string>) => ({bookmarks}),
      'REPORT.GET.BOOKMARKS.ERROR': (errorMessage: Error['message']) => ({errorMessage}),
      'ADD.BOOKMARK': (link: string) => ({link}),
      'REMOVE.BOOKMARK': (link: string) => ({link}),
      'CLEAR.BOOKMARKS': () => ({}),
    },
  },
)

const bookmarkModel = createModel({})

function createBookmarkMachine(link: string) {
  return bookmarkModel.createMachine({})
}

export const bookmarksMachine = bookmarksModel.createMachine(
  {
    initial: 'loading',
    context: bookmarksModel.initialContext,
    on: {
      'CLEAR.BOOKMARKS': {
        actions: [
          bookmarkModel.assign({
            bookmarks: [],
          }),
          'persist',
        ],
      },
    },
    states: {
      loading: {
        invoke: {
          id: 'bookmarks-fetch',
          src: () => (sendBack) => {
            store
              .get<Array<string>>('bookmarks')
              .then((result) => {
                sendBack({type: 'REPORT.GET.BOOKMARKS.SUCCESS', bookmarks: result || []})
              })
              .catch((e: Error) => {
                sendBack({type: 'REPORT.GET.BOOKMARKS.ERROR', errorMessage: e.message})
              })
          },
        },
        on: {
          'REPORT.GET.BOOKMARKS.SUCCESS': {
            target: 'ready',
            actions: bookmarksModel.assign({
              bookmarks: (_, event) => {
                return event.bookmarks.map((link) => ({
                  link,
                  ref: spawn(createBookmarkMachine(link)),
                }))
              },
            }),
          },
          'REPORT.GET.BOOKMARKS.ERROR': {
            target: 'errored',
            actions: bookmarksModel.assign({
              errorMessage: (_, event) => event.errorMessage,
            }),
          },
        },
      },
      ready: {
        on: {
          'ADD.BOOKMARK': {
            actions: [
              bookmarksModel.assign({
                bookmarks: (context, event) => {
                  let isIncluded = context.bookmarks.filter((bm) => bm.link == event.link)

                  if (isIncluded.length) return context.bookmarks

                  return [
                    ...context.bookmarks,
                    {
                      link: event.link,
                      ref: spawn(createBookmarkMachine(event.link)),
                    },
                  ]
                },
              }),
              'persist',
            ],
          },
          'REMOVE.BOOKMARK': {
            actions: [
              bookmarksModel.assign({
                bookmarks: (context, event) => context.bookmarks.filter((bookmark) => bookmark.link != event.link),
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
          store.set('bookmarks', ctx.bookmarks.map(({link}) => link) || [])
        } catch (e) {
          console.error(e)
        }
      },
    },
  },
)

const [BookmarksProvider, useBookmarksService, createBookmarksSelector] =
  createInterpreterContext<InterpreterFrom<typeof bookmarksMachine>>('Bookmarks')

export {BookmarksProvider, useBookmarksService}

export const useBookmarks = createBookmarksSelector((state) => state.context.bookmarks)
