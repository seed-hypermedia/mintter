import {
  Account,
  Document,
  DocumentChange,
  getAccount,
  getDraft,
  publishDraft,
  updateDraftV2 as apiUpdateDraft,
} from '@app/client'
import {blockNodeToSlate} from '@app/client/v2/block-to-slate'
import {queryKeys} from '@app/hooks'
import {
  createId,
  group,
  GroupingContent,
  paragraph,
  statement,
  text,
} from '@app/mttast'
import {createSelectAllActor} from '@app/selectall-machine'
import {getTitleFromContent} from '@app/utils/get-document-title'
import {QueryClient} from '@tanstack/react-query'
import {Editor} from 'slate'
import {assign, createMachine, sendParent} from 'xstate'
import {MintterEditor} from './editor/mintter-changes/plugin'

export type EditorDocument = Partial<Document> & {
  id?: string
  content?: [GroupingContent]
}

export type DraftContext = {
  documentId: string
  version: null
  draft: Document
  localDraft: EditorDocument | null
  errorMessage: string
  editor: Editor
  author: Account | null
  title: string
}

export type DraftEvent =
  | {type: 'FETCH'; documentId: string}
  | {
      type: 'DRAFT.REPORT.FETCH.SUCCESS'
      data: Document
    }
  | {type: 'DRAFT.REPORT.FETCH.ERROR'; errorMessage: string}
  | {type: 'DRAFT.UPDATE'; payload: Partial<EditorDocument>}
  | {type: 'DRAFT.UPDATE.SUCCESS'}
  | {type: 'DRAFT.UPDATE.ERROR'; errorMessage: Error['message']}
  | {type: 'DRAFT.CANCEL'}
  | {type: 'DRAFT.MIGRATE'}
  | {type: 'LOAD'}
  | {type: 'UNLOAD'}
  | {type: 'PREFETCH'}
  | {type: 'RESET.CHANGES'}
  | {type: 'DRAFT.REPORT.AUTHOR.ERROR'; errorMessage: string}
  | {type: 'DRAFT.REPORT.AUTHOR.SUCCESS'; author: Account}
  | {type: 'DRAFT.PUBLISH'}

export interface CreateDraftMachineProps {
  draft: Document
  client: QueryClient
  shouldAutosave?: boolean
  updateDraft?: typeof apiUpdateDraft
  editor: Editor
}

const defaultContent: [GroupingContent] = [
  group({data: {parent: ''}}, [
    statement({id: createId()}, [paragraph([text('')])]),
  ]),
]

export function createDraftMachine({
  draft,
  client,
  editor,
  updateDraft = apiUpdateDraft,
  shouldAutosave = true,
}: CreateDraftMachineProps) {
  /** @xstate-layout N4IgpgJg5mDOIC5SQJYBcD2AnAdCiANmAMQAyA8gIIAiioADhrOihgHZ0gAeiATAGy8cAVgAcwgJyiADMP4BmACy9pAgDQgAnogCMq6TgDshpTvnyJS3qMUBfWxtSZc+IsQAKAJQCiAMW8AKgDCABKcjMxorBxI3IiKOkKG-KKihnLp-Ir8wooa2gjiEjiWUhKG0pX8OqIS9o4Q6Ng4AGZgaADGABYobFDE1J6UvgE4QZQAckHepOFMLOycPAj80ooi8rKGisJr-CbC+bo6OsWGevKpa9bZ9eCNzq3t3b39g8OjPu7knqP+wSEcABlACqQWmQKBc0i0SWiH2R0KhiE5Qson4Eks5wk-DuTmabU6PT6AyGIxwXx+f0CoRw3k8nh+0IWMVAy14iSEqkkKgUp2Ehy0iAk2RwqmMCQkwhOpzqDnuTVwTleeEIJHe5JB7molAC3mZUUWsWW6XkRnkOn41UMoiUyIkiMUoiEgl4dpUkgtuPl+KVDxVrhI-1CBthxt01RRCmEvDdhnKOjyQoQ534JVENWk8dqEizojxD2ayr6qrcGtG7hBACFSABJIFhWIRFlwhCWxIlaOx+Tx85JgpW4prBLO+Rd8wFxU4YtQHAQMAAIwwAFc2B0Vd0AIZ9SDEUNGtm6eS8dZOjE2ZJmZGIy6iHC8Co2XaKaQYk52H2Fv0sEvzper9cS0DYguFgNBNzQMAcE3FpIKwAAKXZpAASmIX1p39X9FxXNcAzVfdWTiBBFEUM05BPbYFBtYRzEMREOTvVIZGlaREjSEjJ0eGc52wgDXlJD4cC1HU9QI1tMWEEodl4HFpGY2ib1yIwRWsK4THjMxOKLTDZ1gTcADd+LALAsGaegCAglpsAAWxwPT9LAagsBgtAxPDYizBEQRFEontxAU5NVmKXYY0TMKnQ-Bop24+z+PLITtV1fUm3mQ1COWEiyO83zqICgoxwMYw5J2NZXwkRItO-KIS1ikl4uEpLgTBCEoRSmEDyI5Qsoo7I-JontHRFHBqh2K0dAqCpWPkSqMJ-XSDLislRgavU6QZJk2pbdzSO6nzetygbkxfO9HxkntVjPHyZpnYgfCBQIxhCSYAHFvFahhUrDQ9CgkIQLV4XIahIkjBQKdIdDFRIJPG-YdAFGb6GXBcCBQWBiX6CB2Cg3p9IwABrKDEeR1Guicly3O+jksxwJ1xuSIqgtB+FTjFDMzGUPQUgtBGkZRtGjJMsyLLQKysFsom+dJ5zYIpoiqcMGmM2MfYKkZxETDNBMbQYxN9muwWsF3YNGw+9r0r4Y9ihxDlLRPUq3URGQkjdZRfqlORnUq4gQQmCgaFl5ZhDo5MLgMUjFCkE45A94QvfiylfhwSgQQCEIfia8E3vekBmzS1sTmsYafMSaUslI4OChOeMcCUHsLVzWN0XseU2Awed4FidDAwDxAg6SFI0gyORsiZwoaJKAVpTOzEVZmwkXj6Hu23OBXZBtrJLmqURHe2Iwg-pyMUhMa6dNLMAl6tAw5LEG05JqcxeERGMhCD3Jn4ESedBPuaeP-XCSy3DuCAS9EhyRwHDVIY5yrpGkOUG8zo96hUxCeJQWRv7VVnH+HCgFZzd02nndyiYZI1zppvW+2x+yIEuEkAUHJkHhzQZ+aKp8sF8UXvgr6REExSRjLJeSh0CgPgMDIVYCgszSHMGIdBKpapQBAbGeiLMVDyCDuNAG2QI7SPYabLa30pCIl1jgHMzoYzpFtCcHmxN+baJzp9DqyxxoZhrrAywrEMwWDMIiBQd5ZDmBsC7eMCRLGS0gEvWMmJhoYljNkXM5RR5ZDTLkOSWZ77vn1qZQ2wCOH2ItuVIxpFsrINfBXRAtQX6URSO+comI56bhQEQLJOiCHfSDgYuSd4ewnhkmkBQCg5RRWcEvcwBiIa-SfEk1Qv0Kix2bkAA */
  return createMachine(
    {
      context: {
        documentId: draft.id,
        version: null,
        draft,
        editor,
        localDraft: null,
        errorMessage: '',
        author: null,
        title: draft.title,
      },
      tsTypes: {} as import('./draft-machine.typegen').Typegen0,
      schema: {context: {} as DraftContext, events: {} as DraftEvent},
      predictableActionArguments: true,
      invoke: {
        src: 'fetchAuthor',
        id: 'fetchAuthor',
      },
      id: 'editor',
      initial: 'idle',
      on: {
        UNLOAD: {
          target: '.idle',
        },
        'DRAFT.REPORT.AUTHOR.SUCCESS': {
          actions: 'assignAuthor',
        },
      },
      states: {
        idle: {
          on: {
            LOAD: {
              target: 'fetching',
            },
            PREFETCH: {
              actions: 'prefetchDraft',
            },
          },
        },
        fetching: {
          invoke: {
            src: 'fetchDraftContent',
            id: 'fetchDraftContent',
          },
          on: {
            'DRAFT.CANCEL': {
              target: 'idle',
            },
            'DRAFT.REPORT.FETCH.SUCCESS': {
              actions: ['assignDraftsValue', 'assignTitle'],
              target: 'editing',
            },
            'DRAFT.REPORT.FETCH.ERROR': {
              actions: 'assignError',
              target: 'errored',
            },
          },
        },
        editing: {
          invoke: {
            src: createSelectAllActor(editor),
            id: 'selectAllListener',
          },
          initial: 'idle',
          states: {
            idle: {
              on: {
                'DRAFT.UPDATE': {
                  actions: ['updateValueToContext', 'updateTitle'],
                  target: 'debouncing',
                },
                FETCH: {
                  target: '#editor.fetching',
                },
                'DRAFT.PUBLISH': {
                  target: '#editor.publishing',
                },
              },
            },
            debouncing: {
              initial: 'idle',
              states: {
                changed: {
                  always: {
                    target: 'idle',
                  },
                },
                idle: {
                  after: {
                    '500': {
                      target: '#editor.editing.saving',
                    },
                  },
                },
              },
              on: {
                'DRAFT.UPDATE': {
                  actions: ['updateValueToContext', 'updateTitle'],
                  target: '.changed',
                },
              },
            },
            saving: {
              invoke: {
                src: 'saveDraft',
                id: 'saveDraft',
                onError: [
                  {
                    actions: 'assignError',
                    target: 'idle',
                  },
                ],
              },
              tags: 'saving',
              on: {
                'DRAFT.UPDATE': {
                  target: 'debouncing',
                },
                'DRAFT.UPDATE.SUCCESS': {
                  actions: ['resetChanges', 'resetQueryData'],
                  target: 'idle',
                },
                'DRAFT.UPDATE.ERROR': {
                  actions: 'assignError',
                  target: 'idle',
                },
              },
            },
          },
          on: {
            'RESET.CHANGES': {
              actions: 'resetChanges',
            },
          },
        },
        publishing: {
          invoke: {
            src: 'publishDraft',
            id: 'publishDraft',
            onDone: [
              {
                actions: ['afterPublish', 'resetQueryData'],
                target: '#editor.idle',
              },
            ],
            onError: [
              {
                actions: 'assignError',
                target: 'errored',
              },
            ],
          },
        },
        errored: {
          on: {
            FETCH: {
              target: 'fetching',
            },
          },
        },
        failed: {
          type: 'final',
        },
      },
    },
    {
      actions: {
        //@ts-ignore
        assignDraftsValue: assign((context, event) => {
          // TODO: fixme types

          let newValue: EditorDocument = {
            ...event.data,
          }

          if (event.data.children?.length) {
            // TODO: use the parent list type instead
            newValue.content = [blockNodeToSlate(event.data.children, 'group')]
          } else {
            newValue.content = defaultContent
            let entryNode = defaultContent[0].children[0]
            MintterEditor.addChange(context.editor, ['moveBlock', entryNode.id])
            MintterEditor.addChange(context.editor, [
              'replaceBlock',
              entryNode.id,
            ])
          }

          return {
            draft: newValue,
            localDraft: newValue,
          }
        }),
        updateTitle: assign({
          title: (_, event) => {
            if (event.payload.content) {
              return getTitleFromContent({children: event.payload.content})
            }
            return ''
          },
        }),
        assignTitle: assign({
          title: (_, event) => event.data.title || 'Untitled Draft',
        }),
        assignAuthor: assign({
          author: (_, event) => event.author,
        }),
        assignError: assign({
          errorMessage: (_, event) => {
            if (event.type == 'DRAFT.REPORT.FETCH.ERROR') {
              return event.errorMessage
            } else {
              return JSON.stringify(
                `Draft machine error: ${JSON.stringify(event)}`,
              )
            }
          },
        }),
        updateValueToContext: assign({
          localDraft: (context, event) => {
            return {
              ...context.localDraft,
              ...event.payload,
              content: event.payload.content || context.localDraft?.content,
            }
          },
        }),
        resetChanges: (context) => {
          MintterEditor.resetChanges(context.editor)
        },
        resetQueryData: () => {
          client.invalidateQueries([queryKeys.GET_DRAFT])
          client.invalidateQueries([queryKeys.GET_DRAFT_LIST])
        },
        afterPublish: sendParent((context, event) => ({
          type: 'COMMIT.PUBLISH',
          publication: event.data,
          documentId: context.documentId,
        })),
        prefetchDraft: (context) => {
          client.prefetchQuery(
            [queryKeys.GET_DRAFT, context.draft.id],
            () => getDraft(context.draft.id),
            {
              staleTime: 10 * 1000,
            },
          )
        },
      },
      services: {
        fetchDraftContent: (context) => (sendBack) => {
          ;(async () => {
            try {
              client
                .fetchQuery([queryKeys.GET_DRAFT, context.draft.id], () =>
                  getDraft(context.draft.id),
                )
                .then((data) => {
                  sendBack({type: 'DRAFT.REPORT.FETCH.SUCCESS', data})
                })
            } catch (err) {
              sendBack({
                type: 'DRAFT.REPORT.FETCH.ERROR',
                errorMessage: `[DRAFT ERROR]: ${JSON.stringify(err)}`,
              })
            }
          })()
        },
        saveDraft: (context) => (sendBack) => {
          if (shouldAutosave) {
            ;(async function autosave() {
              let contentChanges = MintterEditor.transformChanges(
                context.editor,
              ).filter(Boolean)

              // debug('contentChanges', contentChanges)
              let newTitle = context.title
              let changes: Array<DocumentChange> = newTitle
                ? [
                    ...contentChanges,
                    {
                      op: {
                        $case: 'setTitle',
                        setTitle: newTitle,
                      },
                    },
                  ]
                : contentChanges
              try {
                await updateDraft({
                  documentId: context.draft.id,
                  changes,
                })
                // TODO: update document
                sendBack('DRAFT.UPDATE.SUCCESS')
              } catch (err: unknown) {
                sendBack({
                  type: 'DRAFT.UPDATE.ERROR',
                  errorMessage: JSON.stringify(err),
                })
              }
            })()
          }
        },
        fetchAuthor: (context) => (sendBack) => {
          let author = context.draft.author || ''
          if (author) {
            client
              .fetchQuery([queryKeys.GET_ACCOUNT, author], () =>
                getAccount(author),
              )
              .then((author) => {
                sendBack({
                  type: 'DRAFT.REPORT.AUTHOR.SUCCESS',
                  author,
                })
              })
              .catch((err) => {
                sendBack({
                  type: 'DRAFT.REPORT.AUTHOR.ERROR',
                  errorMessage: `fetchAuthor ERROR: ${JSON.stringify(err)}`,
                })
              })
          }
        },
        publishDraft: (context) => {
          return publishDraft(context.documentId)
        },
      },
    },
  )
}
