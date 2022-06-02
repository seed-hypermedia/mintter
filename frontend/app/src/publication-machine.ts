import { Publication } from '@app/client'
import { EditorDocument } from '@app/editor/use-editor-draft'
import { GetBlockResult } from '@app/utils/get-block'
import { assign, createMachine } from 'xstate'

export type ClientPublication = Omit<Publication, 'document'> & {
  document: EditorDocument
}

export type PublicationContext = {
  publication: ClientPublication | null
  errorMessage: string
  canUpdate: boolean
  discussion: Array<GetBlockResult>
}

export type PublicationEvent =
  | { type: 'PUBLICATION.FETCH.DATA' }
  | {
    type: 'PUBLICATION.REPORT.SUCCESS'
    publication: ClientPublication
    canUpdate?: boolean
  }
  | { type: 'PUBLICATION.REPORT.ERROR'; errorMessage: string }
  | { type: 'DISCUSSION.FETCH.DATA' }
  | { type: 'DISCUSSION.SHOW' }
  | { type: 'DISCUSSION.HIDE' }
  | { type: 'DISCUSSION.TOGGLE' }
  | { type: 'DISCUSSION.REPORT.SUCCESS'; discussion: Array<GetBlockResult> }
  | { type: 'DISCUSSION.REPORT.ERROR'; errorMessage: string }

export const publicationMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAjANgSwMYEMAXbAewDsBaAW31wAtsywA6CbWXVWWUs5hiBDBkAxABEAkgGUAwgFUpUiQHkAcsykAJZQHVEKEj2Ll9IAB6IATAGYArM0sBGAAwBOW48sA2ABy3XbgDsADQgAJ6I1gAsXsxRzgmWtoFeHo6BAL4ZoWhYeES81LQMTKzsnNy8-NiCwuLS8ooq6gAqygDi7QAyAKKmyIbYxmSmFgiWSQ4u7p6+-kGhEQjWrlFxCc5OgXaWfl5ZORg4BMNF9IwsbBxcPOTMAG7s2FgsYABObyRvkPWyCkpqZgAMR6LRkmmYYgAgi0of1BsNRohXJZXMxks5rBMbD5Av4vIsrFE0RsEikfM4Yo4oplsiBcscCuQziVLuUblVHjwXswAGZgQjnMhQX6NAHqABKPQACsoJS0NHIZDIeop4UZeEiED4dcxKXMoh5bJtrNZCcsfGtSdZAjYkv5LAd6Ud8qcaEK2ddKncuc9MCx+YKSiLJH8moCpbL5cwehKJXL1UNNUhzIgdT49TE-IbHMabGbwlZXIE9dbUs4vNYnQzXYV3ayyl7bnxfTyav6RInESmxpWM5YooOfJ4Ys5HAWlkbSwkvK5h3ZiY5qy6TnXihdGxVmw8ni9Rf9msxNBIxH0UwMNSYe1Zc1M3B5vH4AsXzVFh+sEuPTXPMVW6TXV2ZesNyuLdOV3DtQzFQ82k6Xou2TUAxhsewnHvWYnwWQtxjnD9NmLVZVj8Zc8kAyhgNKACmT4dswE7c8EUQ1MEEcAJmFcDi5x8Vx0lcStrB8c09gcY1c0CKJLExY0-0OUjqJZDcqOGZh3k+b4IBEaU5AAIS6CQZBhQ8QTBCFoVhBCryQxA8WcZgfDsPxbRWRxuKic0AliDZc2sZxbBiDj9n-Fd5IolglKqQMhRFLTdP0wyIxlOUFSkJUVTVBjLxGa8EECNxmCxMdi2scc5wnay2K85xcW8WxbGKkjGTdddKOC5TIuDTSdL0gyWkPSMkpjOMEwypNLOY3K0QK1jthK+zzRcCZp3wmkCs2LI6TIEghHgc9WrXD1Nw5O4BCELKDEyrVbXNHzYi8DZiq8PE6tSWlZMa-aG1Ao6WwglhvnwCAlnO0azuYxxHC8NZtiiaJIdq6w7rKhA32sJa7sscSIfshrayA5rPTAn1fpUj4vkgCzQbGcHIeYaHYcNZ7MWuzFmAhx6NlcLFtlcHGyIU0ovu9H7uX9PkBSiimtRWzNfHs3y+MrCtrox2njUpaJDScLwlyCuSmoOwXt1bUXaMl7Lwc8BxLQHHYohcmJzS8FXAh8bW-CxKkJl5kL8cOoWdxFsAzas5HiRlnUfPxRWCWw9JPK81jUQmbZAre3HyN9w2mIvEGpcE2OWdJCH0kCDisVsb39YbcK7lNkbuxDq7sL8Wykk2ZxAk8CHfIr3X3rxg6a74VSyYgYPmLLq3wY41FPFxRx3JhuzTXiYrKUtV3K4+xS9rudrGCgcfkNWfLJO8F2EcxCTbCEy2bJcSs8WHYct4H6vd74f7AaP5FOan1iUQ8V2J3W+GZSRzlSNNGGr8M6Dw-j-ZG+clidxLKSW0XcKRVRgfzIO9cmLITcthHyS1vKSQrJzLwgUshAA */
  createMachine(
    {
      context: {
        publication: null,
        errorMessage: '',
        canUpdate: false,
        discussion: [],
      },
      tsTypes: {} as import("./publication-machine.typegen").Typegen0,
      schema: {
        context: {} as PublicationContext,
        events: {} as PublicationEvent,
      },
      type: 'parallel',
      id: 'publication-machine',
      states: {
        discussion: {
          initial: 'hidden',
          states: {
            hidden: {
              on: {
                'DISCUSSION.SHOW': {
                  target: 'visible',
                },
                'DISCUSSION.TOGGLE': {
                  target: 'visible',
                },
              },
            },
            visible: {
              initial: 'fetching',
              states: {
                ready: {
                  entry: (context, event) => {
                    // debug(
                    //   'DISCUSSION READY: ',
                    //   JSON.stringify({context, event}, null, 3),
                    // )
                  },
                },
                errored: {
                  on: {
                    'DISCUSSION.FETCH.DATA': {
                      target: 'fetching',
                    },
                  },
                },
                fetching: {
                  invoke: {
                    src: 'fetchDiscussionData',
                    id: 'fetchDiscussionData',
                  },
                  tags: 'pending',
                  on: {
                    'DISCUSSION.REPORT.SUCCESS': {
                      actions: 'assignDiscussion',
                      target: 'ready',
                    },
                    'DISCUSSION.REPORT.ERROR': {
                      actions: 'assignError',
                      target: 'errored',
                    },
                  },
                },
                idle: {
                  always: [
                    {
                      cond: 'isCached',
                      target: 'ready',
                    },
                    {
                      target: 'fetching',
                    },
                  ],
                },
              },
              on: {
                'DISCUSSION.HIDE': {
                  target: 'hidden',
                },
                'DISCUSSION.TOGGLE': {
                  target: 'hidden',
                },
              },
            },
          },
        },
        publication: {
          initial: 'idle',
          states: {
            idle: {
              always: {
                target: 'fetching',
              },
            },
            errored: {
              on: {
                'PUBLICATION.FETCH.DATA': {
                  actions: ['clearError', 'clearDiscussion'],
                  target: 'fetching',
                },
              },
            },
            fetching: {
              invoke: {
                src: 'fetchPublicationData',
                id: 'fetchPublicationData',
              },
              tags: 'pending',
              on: {
                'PUBLICATION.REPORT.SUCCESS': {
                  actions: ['assignPublication', 'assignCanUpdate'],
                  target: 'ready',
                },
                'PUBLICATION.REPORT.ERROR': {
                  actions: 'assignError',
                  target: 'errored',
                },
              },
            },
            ready: {},
          },
        },
      },
    },
    {
      guards: {
        isCached: () => false,
      },
      actions: {
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        assignCanUpdate: assign({
          canUpdate: (_, event) => Boolean(event.canUpdate),
        }),
        assignDiscussion: assign({
          discussion: (_, event) => event.discussion,
        }),
        assignError: assign({
          errorMessage: (_, event) => event.errorMessage,
        }),
        clearDiscussion: assign({
          discussion: (context) => null,
        }),
        clearError: assign({
          errorMessage: (context) => '',
        }),
      },
    },
  )