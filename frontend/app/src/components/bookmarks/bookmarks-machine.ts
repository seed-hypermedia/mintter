import {ActorRef, spawn} from 'xstate'
import {createModel} from 'xstate/lib/model'

export type Bookmark = {link: string; ref?: ActorRef<ReturnType<typeof createBookmarkMachine>>}

const bookmarksModel = createModel(
  {
    bookmarks: [] as Array<Bookmark>,
    errorMessage: '',
  },
  {
    events: {
      GET_BOOKMARKS_SUCCESS: (bookmarks: Array<string> | null) => ({bookmarks}),
      GET_BOOKMARKS_FAIL: (errorMessage: Error['message']) => ({errorMessage}),
      ADD_BOOKMARK: (link: string) => ({link}),
      REMOVE_BOOKMARK: (link: string) => ({link}),
    },
  },
)

const bookmarkModel = createModel({})

function createBookmarkMachine(link: string) {
  return bookmarkModel.createMachine({})
}

export function createBookmarksMachine(store: Store) {
  return bookmarksModel.createMachine(
    {
      initial: 'loading',
      context: bookmarksModel.initialContext,
      states: {
        loading: {
          invoke: {
            id: 'bookmarks-fetch',
            src: () => (sendBack) => {
              store
                .get<Array<string>>('bookmarks')
                .then((result) => {
                  sendBack({type: 'GET_BOOKMARKS_SUCCESS', bookmarks: result})
                })
                .catch((e: Error) => {
                  sendBack({type: 'GET_BOOKMARKS_FAIL', errorMessage: e.message})
                })
            },
          },
          on: {
            GET_BOOKMARKS_SUCCESS: {
              target: 'ready',
              actions: bookmarksModel.assign({
                bookmarks: (_, event) => {
                  if (!event.bookmarks) return []

                  return event.bookmarks.map((link) => ({
                    link,
                    ref: spawn(createBookmarkMachine(link)),
                  }))
                },
              }),
            },
            GET_BOOKMARKS_FAIL: {
              target: 'errored',
              actions: bookmarksModel.assign({
                errorMessage: (_, event) => event.errorMessage,
              }),
            },
          },
        },
        ready: {
          on: {
            ADD_BOOKMARK: {
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
            REMOVE_BOOKMARK: {
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
            console.log(ctx.bookmarks)
            store.set('bookmarks', ctx.bookmarks.map(({link}) => link) || [])
          } catch (e) {
            console.error(e)
          }
        },
      },
    },
  )
}
