import {
  Account,
  MttDocument,
  DocumentChange,
  getDraft,
  Publication,
  updateDraftV2 as apiUpdateDraft,
  blockNodeToSlate,
  createId,
  group,
  GroupingContent,
  paragraph,
  statement,
  text,
  Document,
} from '@mintter/shared'
import {queryKeys} from '@app/hooks'
import {createSelectAllActor} from '@app/selectall-machine'
import {getTitleFromContent} from '@app/utils/get-document-title'
import {QueryClient} from '@tanstack/react-query'
import {invoke} from '@tauri-apps/api'
import {Editor} from 'slate'
import {assign, createMachine, InterpreterFrom, actions} from 'xstate'
import {MintterEditor} from './editor/mintter-changes/plugin'

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
  updateDraft?: typeof apiUpdateDraft
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
  updateDraft = apiUpdateDraft,
  shouldAutosave = true,
  editor,
}: CreateDraftMachineProps) {
  /** @xstate-layout N4IgpgJg5mDOIC5SQJYBcD2AnAdAMzDQGMALFAOygGIINywcKA3DAawYOJIBEsBDPGgDaABgC6iUAAcMsdCjqSQAD0QAmACwB2HCI0BWAByG9agGwBGbQGZrAGhABPRIYM591-WY1qR+g2oeAL5BDqiYuJykFNRgWFjYOFIANnxoeNgAtviEpLwCwuJKMnJoCuRKqgi2FjhaIn7aWhYthloOzggaGmY4PvpaGhZa+gCcZqMi1lohYRDoieExVABKAKIAymsAKjgAwgASAIIAcgDim6ISSCAl8oo3Va21aq9mWmq2GiITZh2I+haOGMxjManGGlGhkCGlm4HmERwS0ojAgyTAVG4KyOADFdgBVAAK3CO2zWV2KsnuFUeiChajq4x+LTMIjUbUM-wQhgs+ncIl5Wlso2sItscPCiwRMVR6Mx2LxOEJ+IAQgAZACSGwOFJudzKD1AT2sFkMOFFUOmfl5hjM+i5Fj8DMd7Oh1m69UMEoRUvkKJQaIxWNxuz2AHkALIRjW7DZHABq5KKeqpBppRsQnpwr2+IpEWkM4ztDoFfO62isouhQq9oXhC1wyKgOFgfCYy1o9EY5BY7BbbbA+UEuukqfKlQB3Rwo2aJhMngmAq5PJ0DVeVh5XgGZm9DaR0pRrfblCocQSuBSaQyWGyR8H-GHydHpXHtO5o1GODBZneFk0Jo0aw-icOkRhwP9DHdAxulGLw1F3REm37Y9qGDRUiRJMkR1uMdDRURAfwZEQoRnUV9ECSsuXGMtDHI8xyP0BogIQxIpAAVwAI2SFBYBIGg6AYZg2AYdiuJ4ngH0Ka5n2pCcEEBM1bCMICc2GfMHTGPkRELfNSPBMFrBYi9OO43jT3iVjUnSLIkhM8ShykykXzwqoC0-axNECLQJnBCx3gdLRYN0KFjG6dkPFNIykQsrBIFWHYVgATWw-VXwzBAIPcT5AJnD9QQsB1TU-MweRnXzRmGDyotE0ySGQjsBO7XsGDvByUtw9N8IQMERC-fQvC0At+sLcEHWhPlNAMZS1GGW0dzrSVjLE3j6pPM9LKvGzWsk9rnM6qpbGsbMJi8UYNFcRifjGoCvyAwEjHBM7-BCOtyAwCA4CURanNkt8AFoCpA6ogTOgsf0dIwC08KKojISgfrTOTtBLAU6gFVxRTU6w2iipsEbSrrIV6GdTW0qZToaYDOhK2o2WmGw2g-AZcYPZsA3RfGXMzMDjCmUVAM0Eblx-bNujZV4+YtFm-WbI8Yk5-bucUx6cx8Rn7SBlpeXcZo1EG3kPKg6q7N4hW5JhYE7UdWDeX6PyHQmWpvPZd0-Mgz1cZiyAzbfd53LMbGA-qAYPQdIYzRMQaRgqiwKqmY3lrquX4ZTPa5OsNlLcBYj7rtqnEFNW1dDBAZBp6SEDAT2rbMT+XU9+9Kg+BCxRQac6hT89pNcmWo-L0EZfJGbSXqCIA */
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
          invoke: {
            src: createSelectAllActor(editor),
            id: 'selectAllListener',
          },
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
                'DRAFT.COMMIT.SAVE': 'saving',
              },
            },
            saving: {
              invoke: {
                src: 'saveDraft',
                id: 'saveDraft',
                onDone: [
                  {
                    target: 'idle',
                    actions: [
                      'resetChanges',
                      'assignDraft',
                      'resetQueryData',
                      'refetchDraftList',
                    ],
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
                actions: ['resetQueryData', 'afterPublish'],
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
        resetQueryData: (context) => {
          resetQueryData(client, context.documentId)
        },
        refetchDraftList: (context) => {
          invoke('emit_all', {
            event: 'update_draft',
          })
        },
        cancelSave: cancel('save-draft'),
        commitSave: send('DRAFT.COMMIT.SAVE', {id: 'save-draft', delay: 500}),
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
              // TODO: update document
              client.removeQueries([queryKeys.GET_DRAFT, context.documentId])
              client.invalidateQueries([queryKeys.GET_DRAFT_LIST])
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
    queryFn: () => getDraft(docId),
  })
}

function resetQueryData(client: QueryClient, docId: string) {
  client.removeQueries([queryKeys.GET_DRAFT, docId])
  client.invalidateQueries([queryKeys.GET_DRAFT_LIST])
}
