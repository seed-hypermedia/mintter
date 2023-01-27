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
import {assign, createMachine, InterpreterFrom} from 'xstate'
import {MintterEditor} from './editor/mintter-changes/plugin'

export type DraftActor = InterpreterFrom<ReturnType<typeof createDraftMachine>>

export type EditorDocument = Partial<MttDocument> & {
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
  isEditing: boolean
}

export type DraftMachineEvent =
  | {type: 'DRAFT.UPDATE'; payload: Array<GroupingContent>}
  | {type: 'DRAFT.MIGRATE'}
  | {type: 'RESET.CHANGES'}
  | {type: 'DRAFT.REPORT.AUTHOR.ERROR'; errorMessage: string}
  | {type: 'DRAFT.REPORT.AUTHOR.SUCCESS'; author: Account}
  | {type: 'DRAFT.PUBLISH'}
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
  /** @xstate-layout N4IgpgJg5mDOIC5SQJYBcD2AnAdAMzDQGMALFAOygGIINywcKA3DAawYOJIBEsBDPGgDaABgC6iUAAcMsdCjqSQAD0QBmAEwacAVgDsGgBwaAnABY9ZtSb0A2ADQgAnoj2Wca22f0bNO24aGJgC+wY6omLicpBTUYFhY2DhSADZ8aHjYALb4hKS8AsLiSjJyaArkSqoImto+xuaW1naOLggAjCI6IrpqeiImJiK2g+3thqHhEOhJEbGMEClgVNwASgCCAGIAKjgAqgAK3OvbAKKiEkggpfKKV9WdhmY4g2aGah8DZhq2eq2IOneHk6gM6GmGdg0k3A00iODmlAWSxWGx2OAOewAQgAZACSAGUABIXEqyW6Ve6IdomQE4H5qTqWDTtNQiDQ6f4IMy2do4YwiNQ6dmCrqGFnQiKzWHzCBgABGGAAruQiPNSHxKJAqCSrjdyndQA8AjpgWoxXZ9CJ2pZOXoTNoTO0NG5vG4RN8QmEYTNcAioDhZQrlarEShFstlLA0OkGIV4gAKboiACUVElvuliMDSpV8zDSx10jJ+ophsQ7x63SGQTsv387U59u0I3t-lsmhpbwlsKl8iz8pzIeoay2u0OxzOheuxYqVSpajMvOdlnaZm8b0XDmcrh0Js6vzM5ntnj0Om7Pvhmf9sD4TFiNDoDGYbAYN6YYAKginetnlIQ-N0AYRBrWw6x5Tl-BMF4hmdLQ9EMU97XPOE-RwN973iRJcFSdJMiwHI3w-fgv2KXUZwNFRy06QDqxsUDT3A7cuX6HB+h0J0tFZD52h0MxkN7cpEXQygUVHfYjhOc5SKLMpfzLf9WRo4C6LAhsmPgnpF2XV1+g9fiMz7ahVlOfFTl2ABhQl1gAOQAcRM79yNLSiOnZE1nRMQUdBMWwBh8Tl2l+HBfPYnkfmNHyzy9dNkkVOUUhQWAyBE2h6EYcgWHYWL4sSnhiKKS4ZPJOdXPc3d3WAryRFPMwAr6XljF8IwWSePR9OyhKkowhIkhwjJsg63LPwK0lZIo6oPkMVj2StQFPCeCwAu6Z52VAx1-HdAJ2sw7AtWM7ZVgATUcsbnIeDQAqhaKeywKhTm4XFtlxOyTuKv8AFoNEXXQvFsXcvpMII+kMTkxSg90zXtIYnTcNroXIDBZXgK4YuiZKoFGt75O+AK2T0HBvAZEUjF3GxtqvJEwExksSs6Vc+R+Gw9FZfwhT+JjDD+4LPPbb47DXcZycMgMB2DNUSA1GAIGpuSXJ4oLSabP7DG85nbU8gmYcsfRdNMIXBP9bMxdDcMZfGql4OecZT2qq0nU0NS2jtNRNe0nX3T166L1Qo3c0oM2zqpUwXe01d1yeQLOVA2wcBZEQIWsarHn1+ZhIxsjTpK3ipu8cYBh80CBQujn3AZNdfhse2jBT-2M6xlykwJ9jDHz6OBR4zkPhdywBVscE7U5-R2qkOLOvRgOSsWpiePdTXD3BPoLTJr2UJ6rBIAnv8dE8DwxU0CubDZJbFKGIY3F8x1PamC88D4FAlmluuab-HGmILgmW2Zs1mjNfTN-k96nhOTvSdM8HybxrDWmGGyWwoRQhAA */
  return createMachine(
    {
      context: {
        documentId,
        draft: null,
        localDraft: null,
        errorMessage: '',
        author: null,
        title: '',
        editor,
        isEditing: false,
      },
      tsTypes: {} as import('./draft-machine.typegen').Typegen0,
      schema: {
        context: {} as DraftMachineContext,
        events: {} as DraftMachineEvent,
        services: {} as DraftMachineServices,
      },
      predictableActionArguments: true,
      entry: 'sendActorToParent',
      on: {
        'EDITING.START': {
          actions: ['assignEditing'],
        },
        'EDITING.STOP': {
          actions: ['assignEditing'],
        },
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
          initial: 'idle',
          states: {
            idle: {
              on: {
                'DRAFT.UPDATE': {
                  target: 'debouncing',
                  actions: ['updateValueToContext', 'updateTitle'],
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
                      actions: [],
                      internal: false,
                    },
                  },
                },
              },
              on: {
                'DRAFT.UPDATE': {
                  target: '.changed',
                  actions: ['updateValueToContext', 'updateTitle'],
                },
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
                'DRAFT.UPDATE': {
                  target: 'debouncing',
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
        },
        errored: {
          on: {
            RETRY: {
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
        assignEditing: assign({
          isEditing: (_, event) => event.type == 'EDITING.START',
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
        refetchDraftList: () => {
          invoke('emit_all', {
            event: 'update_draft',
          })
        },
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
                  {
                    op: {
                      $case: 'setTitle',
                      setTitle: newTitle,
                    },
                  },
                ]
              : contentChanges

            await updateDraft({
              documentId: context.documentId,
              changes,
            })
            // TODO: update document
            client.removeQueries([queryKeys.GET_DRAFT, context.documentId])
            client.invalidateQueries([queryKeys.GET_DRAFT_LIST])
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
