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
import {createId, group, paragraph, statement, text} from '@app/mttast'
import {GroupingContent} from '@app/mttast/src'
import {getTitleFromContent} from '@app/utils/get-document-title'
import {debug} from '@app/utils/logger'
import {QueryClient} from 'react-query'
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
  | {
      type: 'DRAFT.MIGRATE'
    }
  | {
      type: 'LOAD'
    }
  | {
      type: 'UNLOAD'
    }
  | {
      type: 'RESET.CHANGES'
    }
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
  /** @xstate-layout N4IgpgJg5mDOIC5SQJYBcD2AnAdCiANmAMQAyA8gIIAiioADhrOihgHZ0gAeiAjAGwBmfjgCsABgDsk8QCYAHIMkBOQUoA0IAJ58ALLME5Fa0b137+-UboC+Nzaky4wWLNkjEAYgFEAKgGEACU5GZjRWDiRuRF1+XRw48StZXWVVUX4pTR0EXklBcSM1JVllcVFRaX47Bwh0bBwAMzA0AGMACxQ2KGJvagBJX3IAJRx-SgA5f29SEKYWdk4eXKERCWk5RRU1SWy9SV4itX5ZPN1eU9Ea8DqnJpaOrp6+wZGcYe8ABRHfHB8AwI4ADKAFV-NMgUC5mEIktEKJZHsEGUcGk0aJlJJKuJbPYbvVcM02p1ur0BkNRh9vsNfv8gjhvMNhiNoQtIqBlgikbx5LxDsVBJVBHzdAUrnjHA1HE88IQSC8KTgQZ9qJRfN5WeFFlFlvxlPJUaUTvqefpBPIkSdZDhxLbxIL5MYktdJc5bjL8EQya9Rp8QQAhUj9IHBKKhNlwhDyXSiMSSeT5ITlOSmbniFEJvImE0Y+Qu25S93dWVeumhhjzLXs6IrYRiKQyBRKVQabR8UrWiS2gy8QSYuT5gk4aXFiBgABGGAArmxWjKOgBDboeTWwnV8XsiMqyBTiBP2yTmJEI5Q4UqSWRCHk8-hmQd3EdQHBjyczufFz0kLiwNALtBgHAF0af8sAACl4O0AEpiFdYciyfF9p1nD05VXbUOUQNR4mUUQCjKGNeVkUQEyRQVTztFNhRw0peHvQsWFHCckPfZ5yTeZVVXVNDq2WQ9DDiFQcPKU5ZCxJFYgNA8pAqcRr1SOi3QYp9YAXAA3J4YNcBp6AIP9GmwABbOCh0fHAVPU7oEC6VSMFaP8IgAbXEABdbjIwKbDcPTHFiIuYjdjbBBJH4A1ZDtWIUmIkLcVqEz4LMtSNIVdiVTVDUw0rNcMIQLDUS8-DfKIkjAokTs7TFPJKl5BTjPCYtzKStjRg4tLgTBCEoQymF0JrYVPLwnzCP8y0ETPcr5Fwy9BHMGrTIa0lkua1L1QZJkWS6iN1xylI8oGgi-OKnIZPrW1zhSMpptkWb4voKdxwIFBYBJVifRwP1A2DQFQXBbxITcra+QCnI+Wmm07TCi4zDzCUC0Uuqn1u+7Hue71FXeoMQ1W5lhn+7KrBEPcsVvcwyggwQkXkUSzwgiRHTSfIFGupTiAgdgAJ-P8ANgx9cZrAQ63WRsthbIG+Fk2Mu1k3QsUqBEmfh4gPiBPwxkCSYAHFft55Y+WUQ5KfkdNYgkCD025YRDElhQJGsAorphgliBBCYKBobWYkRQKzDiE65BwvkJH0Ow8TYDAx3gKJYM-d3ckqVEY2FA4hIuORuQI33hDp80Bwdh8tKwSAY8EHaZGFNQcQm5RPeByn4mMC3TAqXDqlzhoiUeboY55Pcz1SR1RSl+RlH4c3DaOYQQr1XtpvllCiBjiSjF4BEiOX1JiMxJFVGtZRUkyVQ9VKe1Z8Y19kOLRdlwgGP9VjXfp9FZeZHkEeSoMM9MR3F++31C8T4Qpib455gC7hcNYJxRR62LivUQ4lhSojiDGXQhtdC2hOP-Z8gDz5QBjknBI0s0g2xEmJQK00tyINMNbXeh4MHzRwRtKskZN6kIxDgAQ-AZBSysPkaGsUHw3Tug9J6Twb5ERtI2Q8mQkHESRNIQwApzApxCgYDBiMhHtELgwrKvUTg2gMKKXkMgDiv2BmYSQvsppEUyIIf+uDyaBR3DvChokpC8lkjVRoXRkbeHgl3Q8p4X5GPMNGQUrYcj6niBRa25RRQeIXCgIg18tE9V4jtCB9Nf4TV4Mobktdx5CEbhUYQCku4WkCgTCilSKKSGDjYIAA */
  return createMachine(
    {
      id: 'editor',
      predictableActionArguments: true,
      tsTypes: {} as import('./draft-machine.typegen').Typegen0,
      schema: {context: {} as DraftContext, events: {} as DraftEvent},
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
      initial: 'idle',
      invoke: {
        src: 'fetchAuthor',
        id: 'fetchAuthor',
      },
      on: {
        UNLOAD: {
          target: '.idle',
          internal: false,
        },
        'DRAFT.REPORT.AUTHOR.SUCCESS': {
          actions: ['assignAuthor'],
        },
      },
      states: {
        idle: {
          on: {
            LOAD: {
              target: 'fetching',
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
                'DRAFT.PUBLISH': '#publishing',
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
                    500: {
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
          id: 'publishing',
          invoke: {
            src: 'publishDraft',
            id: 'publishDraft',
            onDone: {
              target: 'published',
              actions: ['afterPublish', 'resetQueryData'],
            },
            onError: {
              target: '#errored',
              actions: ['assignError'],
            },
          },
        },
        published: {
          type: 'final',
        },
        errored: {
          id: 'errored',
          on: {
            FETCH: [
              {
                target: 'fetching',
              },
            ],
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
                  debug('DRAFT DATA', data.children)
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
