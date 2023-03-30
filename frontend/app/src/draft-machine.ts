import {
  Account,
  blockNodeToSlate,
  createId,
  Document,
  DocumentChange,
  group,
  GroupingContent,
  paragraph,
  Publication,
  statement,
  text,
} from '@mintter/shared'

import {draftsClient} from '@app/api-clients'
import {queryKeys} from '@app/hooks'
import {getTitleFromContent} from '@app/utils/get-document-title'
import {QueryClient} from '@tanstack/react-query'
import {invoke} from '@tauri-apps/api'
import {Editor} from 'slate'
import {actions, assign, createMachine, InterpreterFrom} from 'xstate'
import {MintterEditor} from './editor/mintter-changes/plugin'
import {appInvalidateQueries} from './query-client'

let {send, cancel} = actions
export type DraftActor = InterpreterFrom<ReturnType<typeof createDraftMachine>>

export type EditorDocument = Partial<Document> & {
  id?: string
  content: Array<GroupingContent>
}

export type DraftMachineContext = {
  documentId: string
  draft: Document | null
  localDraft: EditorDocument | null
  errorMessage: string
  author: Account | null
  title: string
  editor: Editor
  canSave: boolean
}

export type DraftMachineEvent =
  | {type: 'DRAFT.UPDATE'; payload: Array<GroupingContent>}
  | {type: 'RESET.CHANGES'}
  | {type: 'DRAFT.REPORT.AUTHOR.ERROR'; errorMessage: string}
  | {type: 'DRAFT.REPORT.AUTHOR.SUCCESS'; author: Account}
  | {type: 'DRAFT.PUBLISH'}
  | {type: 'DRAFT.COMMIT.SAVE'}
  | {type: 'RETRY'}
  | {type: 'EDITING.START'}
  | {type: 'EDITING.STOP'}
  | {type: 'IS_DAEMON_READY'}

type DraftMachineServices = {
  fetchDraft: {
    data: Document
  }
  saveDraft: {
    data: Document
  }
  publishDraft: {
    data: Publication
  }
}

export interface CreateDraftMachineProps {
  documentId: string
  client: QueryClient
  shouldAutosave?: boolean
  updateDraft?: typeof draftsClient.updateDraftV2
  editor: Editor
}

const defaultContent: [GroupingContent] = [
  group({data: {parent: ''}}, [
    statement({id: createId()}, [paragraph([text('')])]),
  ]),
]

export function createDraftMachine({
  documentId,
  client,
  updateDraft = draftsClient.updateDraftV2,
  shouldAutosave = true,
  editor,
}: CreateDraftMachineProps) {
  /** @xstate-layout N4IgpgJg5mDOIC5SQJYBcD2AnAdAMzDQGMALFAOygGIINywcKA3DAawYOJIBEsBDPGgDaABgC6iUAAcMsdCjqSQAD0QAmACwB2HCI0BWAByG9agGwBGbQGZrAGhABPRIYM591-WY1qR+g2oeAL5BDqiYuJykFNRgWFjYOFIANnxoeNgAtviEpLwCwuJKMnJoCuRKqgi2FjhaIn7aWhYthloOzggaGmY4PvpaGhZa+gCcZqMi1lohYRDoieExVABKAKIAymsAKjgAwgASAIIAcgDim6ISSCAl8oo3Va21aq9mWmq2GiITZh2I+haOGMxjManGGlGhkCGlm4HmERwS0ojAgyTAVG4KyOADFdgBVAAK3CO2zWV2KsnuFUeiChajq4x+LTMIjUbUM-wQhgs+ncIl5Wlso2sItscPCiwRMVR6Mx2LxOEJ+IAQgAZACSGwOFJudzKD1AT2sFkMOFFUOmfl5hjM+i5Fj8DMd7Oh1m69UMEoRUvkKJQaIxWNxuz2AHkALIRjW7DZHABq5KKeqpBppRsQnpwr2+IpEWkM4ztDoFfO62isouhQq9oXhC1wyKgOFgfCYy1o9EY5BY7BbbbA+UEuukqfKlQB3Rwo2aJhMngmAq5PJ0DVeVh5XgGZm9DaR0pRrfblCocQSuBSaQyWGyR8H-GHydHpXHtO5o1GODBZneFk0Jo0aw-icOkRhwP9DHdAxulGLw1F3REm37Y9qGDRUiRJMkR1uMdDRUAFrAZERXHBNoLBND9gM6FovHNdkf15UZoI-BDEikABXAAjZIUFgEgaDoBhmDYBgOO43ieAfQprmfakJwQQEzVsIwgJzYZ8wdMY+WIyYtBnQjxk+ViLy4ni+NPeI2NSdIsiSUyJKHaTKRfPCqgLT9CP6LQJnBCx3gdPTtKhYxunZDxTWMuzxL45CO0E7tewYO9HOw-VXwzBAwREL99C8LQC1ywtwQdaE+U0AwVLUYZbR3OtJRM6KSFik8zysq9bOSqTUtw9N8OqWxswmLwmNcfQGioxBTSAr8gMBIxwSY-xItarBIFWHYVgATW6lzeqedl3E+QCZw-UELAdU1PzMHkZ180ZhkIkI63IDAIDgJR6ucuS3wAWnOkDqiMadvkaFoPjGmY6p9SJcjISgvrTeTtBLAU6gFVxRXU6w2mWg8oAR9K+o0VxdBIqFmgo8YuQ+M1S0LICgNO3G-WbAN0QJ1zMynMYBUhbQqtI5dfHA7z9E+AZZqmZmykPNsYg5vbMwLOiPxzHw2lgi7eXcZo1Hy3lCKgyKxLMkgFfkmFgTtR1YN5fo-IdRc6h-QYDb191jfsmKj3llNdvk6w2StwERFt-xAgdgHTVtXQwQGfKej5-RPcaqLTd92TEbfMxpmBcjJj0NoTX8qPJlqPy9BGXyRmIlPTbTiTIHNt9A4ZW0Q7D+2JoQXxoS-HxNG8oUC285bLNWiBm4y94PJz20rQGD0HSGM0THykZ7ose6paeoA */
  return createMachine(
    {
      predictableActionArguments: true,
      context: {
        documentId,
        draft: null,
        localDraft: null,
        errorMessage: '',
        author: null,
        title: '',
        editor,
        canSave: true,
      },
      tsTypes: {} as import('./draft-machine.typegen').Typegen0,
      schema: {
        context: {} as DraftMachineContext,
        events: {} as DraftMachineEvent,
        services: {} as DraftMachineServices,
      },
      id: 'editor',
      initial: 'fetching',
      states: {
        fetching: {
          invoke: {
            src: 'fetchDraft',
            id: 'fetchDraft',
            onDone: [
              {
                target: 'editing',
                actions: ['assignLocalDraft', 'assignDraft', 'assignTitle'],
              },
            ],
            onError: [
              {
                target: 'errored',
                actions: 'assignError',
              },
            ],
          },
        },

        editing: {
          on: {
            'RESET.CHANGES': {
              actions: ['cancelSave', 'resetChanges'],
            },
          },
          initial: 'idle',
          states: {
            idle: {
              on: {
                'DRAFT.UPDATE': {
                  actions: [
                    'updateValueToContext',
                    'updateTitle',
                    'cancelSave',
                    'commitSave',
                  ],
                },
                'DRAFT.PUBLISH': {
                  target: '#editor.publish.saving',
                  actions: ['cancelSave'],
                },
                'DRAFT.COMMIT.SAVE': [
                  {
                    target: 'saving',
                    cond: 'isDaemonReady',
                  },
                  {
                    target: 'idle',
                    actions: ['assignCannotSave'],
                  },
                ],
              },
            },
            saving: {
              invoke: {
                src: 'saveDraft',
                id: 'saveDraft',
                onDone: [
                  {
                    target: 'idle',
                    actions: ['resetChanges', 'assignDraft', 'invalidateDraft'],
                  },
                ],
                onError: [
                  {
                    target: 'idle',
                    actions: 'assignError',
                  },
                ],
              },
              tags: 'saving',
              on: {
                'DRAFT.UPDATE': 'idle',
              },
            },
          },
        },

        publish: {
          invoke: {
            src: 'publishDraft',
            id: 'publishDraft',
            onDone: [
              {
                actions: ['invalidateDraft', 'afterPublish'],
              },
            ],
            onError: [
              {
                target: 'errored',
                actions: 'assignError',
              },
            ],
          },

          states: {
            saving: {
              invoke: {
                src: 'saveDraft',
                id: 'saveDraft',
                onDone: 'publishing',
                onError: '#editor.errored',
              },
            },

            publishing: {
              invoke: {
                src: 'publishDraft',
                id: 'publishDraft',
              },
            },

            published: {
              type: 'final',
            },
          },

          initial: 'saving',
        },

        errored: {
          on: {
            RETRY: {
              target: 'fetching',
            },
          },
        },
      },
      on: {
        IS_DAEMON_READY: {
          actions: ['assignCanSave'],
        },
      },
    },
    {
      actions: {
        assignDraft: assign({
          draft: (_, event) => event.data,
        }),
        assignLocalDraft: assign((context, event) => {
          // TODO: fixme types

          let newValue: EditorDocument = {
            ...event.data,
            content: [],
          }

          if (event.data.children?.length) {
            // TODO: use the parent list type from the document object instead
            newValue.content = [blockNodeToSlate(event.data.children, 'group')]
            console.log(
              '🚀 ~ file: draft-machine.ts:255 ~ assignLocalDraft:assign ~ newValue.content:',
              newValue.content,
            )
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
            draft: event.data,
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
        // assignAuthor: assign({
        //   author: (_, event) => event.author,
        // }),
        assignError: assign({
          errorMessage: (_, event) => {
            return JSON.stringify(
              `Draft machine error: ${JSON.stringify(event)}`,
            )
          },
        }),
        updateValueToContext: assign({
          localDraft: (context, event) => {
            return {
              ...context.localDraft,
              ...event.payload,
              content:
                event.payload.content || context.localDraft?.content || [],
            }
          },
        }),
        resetChanges: (context) => {
          MintterEditor.resetChanges(context.editor)
        },
        invalidateDraft: (context) => {
          appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
          appInvalidateQueries([queryKeys.GET_DRAFT, context.documentId])
        },
        cancelSave: cancel('save-draft'),
        commitSave: send('DRAFT.COMMIT.SAVE', {id: 'save-draft', delay: 500}),
        assignCannotSave: assign({
          canSave: false,
        }),
        assignCanSave: assign({
          canSave: true,
        }),
      },
      services: {
        fetchDraft: (context) => {
          return getDraftQuery(client, context.documentId)
        },
        saveDraft: async (context) => {
          if (shouldAutosave) {
            let contentChanges = MintterEditor.transformChanges(
              context.editor,
            ).filter(Boolean)

            let newTitle =
              context.title.length > 50
                ? `${context.title.substring(0, 50)}...`
                : context.title
            let changes: Array<DocumentChange> = newTitle
              ? [
                  ...contentChanges,
                  new DocumentChange({
                    op: {
                      case: 'setTitle',
                      value: newTitle,
                    },
                  }),
                ]
              : contentChanges

            if (changes.length != 0) {
              await updateDraft({
                documentId: context.documentId,
                changes,
              })
            } else {
              console.log('NO CHANGES TO SEND')
            }
          }

          return getDraftQuery(client, context.documentId)
        },
      },
    },
  )
}

function getDraftQuery(client: QueryClient, docId: string) {
  return client.fetchQuery({
    queryKey: [queryKeys.GET_DRAFT, docId],
    queryFn: () => draftsClient.getDraft({documentId: docId}),
  })
}
