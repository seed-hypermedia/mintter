import { Document, getDraft, Publication } from '@app/client'
import { blockNodeToSlate } from '@app/client/v2/block-to-slate'
import { changesService } from '@app/editor/mintter-changes/plugin'
import { queryKeys } from '@app/hooks'
import { useMainPage } from '@app/main-page-context'
import { createId, group, paragraph, statement, text } from '@mintter/mttast'
import { useMachine } from '@xstate/react'
import { QueryClient, useQueryClient } from 'react-query'
import { Editor } from 'slate'
import { assign, createMachine, MachineOptionsFrom } from 'xstate'

export type EditorDocument = Partial<Document> & {
  id?: string
  content: any
}

export type EditorContext = {
  retries: number
  prevDraft: EditorDocument | null
  localDraft: EditorDocument | null
  errorMessage: string
  publication: Publication | null
  shouldMigrate: boolean
}
export type EditorEvent =
  | { type: 'FETCH'; documentId: string }
  | {
    type: 'EDITOR.REPORT.FETCH.SUCCESS'
    data: Document
  }
  | { type: 'EDITOR.REPORT.FETCH.ERROR'; errorMessage: Error['message'] }
  | { type: 'EDITOR.UPDATE'; payload: Partial<EditorDocument> }
  | { type: 'EDITOR.UPDATE.SUCCESS' }
  | { type: 'EDITOR.UPDATE.ERROR'; errorMessage: Error['message'] }
  | { type: 'EDITOR.CANCEL' }
  | { type: 'EDITOR.PUBLISH' }
  | { type: 'EDITOR.PUBLISH.SUCCESS'; publication: Publication }
  | { type: 'EDITOR.PUBLISH.ERROR'; errorMessage: Error['message'] }
  | {
    type: 'EDITOR.MIGRATE'
  } | {
    type: 'RESET.CHANGES'
  }

interface DraftEditorMachineProps {
  client: QueryClient
  mainPageService: ReturnType<typeof useMainPage>
  shouldAutosave: boolean
  editor: Editor
}

const defaultContent = [
  group({ data: { parent: '' } }, [
    statement({ id: createId() }, [
      paragraph([
        text(''),
      ])
    ]),
  ]),
]

export function draftEditorMachine({
  client,
  mainPageService,
  shouldAutosave = true,
  editor,
}: DraftEditorMachineProps) {
  console.log('draftEditorMachine');

  return createMachine(
    {
      context: {
        retries: 0,
        localDraft: null,
        prevDraft: null,
        errorMessage: '',
        publication: null,
        shouldMigrate: false,
      },
      tsTypes: {} as import('./use-editor-draft.typegen').Typegen0,
      schema: { context: {} as EditorContext, events: {} as EditorEvent },
      id: 'editor',
      initial: 'idle',
      states: {
        idle: {
          always: {
            target: 'fetching',
          },
        },
        errored: {
          on: {
            FETCH: [
              {
                actions: 'displayFailedMessage',
                cond: 'maxRetriesReached',
                target: 'failed',
              },
              {
                actions: 'incrementRetries',
                target: 'fetching',
              },
            ],
          },
        },
        fetching: {
          invoke: {
            src: 'fetchDocument',
            id: 'fetchDocument',
          },
          on: {
            'EDITOR.CANCEL': {
              target: 'idle',
            },
            'EDITOR.REPORT.FETCH.SUCCESS': {
              actions: 'assignDraftsValue',
              target: 'editing',
            },
            'EDITOR.REPORT.FETCH.ERROR': {
              actions: 'assignError',
              target: 'errored',
            },
          },
        },
        editing: {
          entry: 'updateCurrentDocument',
          initial: 'idle',
          states: {
            idle: {
              on: {
                'EDITOR.UPDATE': {
                  actions: ['updateValueToContext', 'updateCurrentDocument'],
                  target: 'debouncing',
                },
                'EDITOR.PUBLISH': {
                  target: 'publishing',
                },
                FETCH: {
                  target: '#editor.fetching',
                },
              },
            },
            debouncing: {
              initial: 'idle',
              states: {
                changed: {
                  always: 'idle'
                },
                idle: {
                  after: {
                    '1000': {
                      target: '#editor.editing.saving',
                    },
                  },
                }
              },
              on: {
                'EDITOR.UPDATE': {
                  actions: ['updateValueToContext', 'updateCurrentDocument'],
                  target: '.changed'
                },
              },
            },
            saving: {
              invoke: {
                src: 'saveDraft',
                onError: [
                  {
                    actions: 'assignError',
                    target: 'idle',
                  },
                ],
              },
              tags: 'saving',
              on: {
                'EDITOR.UPDATE': {
                  target: 'debouncing',
                },
                'EDITOR.UPDATE.SUCCESS': {
                  actions: ['updateLibrary', 'resetChanges'],
                  target: 'idle',
                },
                'EDITOR.UPDATE.ERROR': {
                  actions: 'assignError',
                  target: 'idle',
                },
              },
            },
            publishing: {
              invoke: {
                src: 'publishDraftService',
              },
              on: {
                'EDITOR.PUBLISH.SUCCESS': {
                  actions: 'assignPublication',
                  target: 'published',
                },
                'EDITOR.PUBLISH.ERROR': {
                  actions: 'assignError',
                  target: 'idle',
                },
              },
            },
            published: {
              type: 'final',
            },
          },
          on: {
            'RESET.CHANGES': {
              actions: 'resetChanges',
            },
          },
          onDone: {
            target: 'finishEditing',
          },
        },
        finishEditing: {
          entry: 'afterPublish',
          type: 'final',
        },
        failed: {
          type: 'final',
        },
      },
    },
    {
      guards: {
        // isValueDirty: (context) => {
        //   let isValueDirty = isEqual(context.localDraft?.content, context.prevDraft?.content)
        //   console.log("🚀 ~ file: use-editor-draft.ts ~ line 215 ~ isValueDirty", isValueDirty, { new: context.localDraft?.content, prev: context.prevDraft?.content })

        //   return isValueDirty
        // },
        maxRetriesReached: (context) => context.retries == 5,
      },
      actions: {
        incrementRetries: assign({
          retries: (context) => context.retries + 1,
        }),
        assignDraftsValue: assign((_, event) => {
          // TODO: fixme types
          let newValue: EditorDocument = {
            ...event.data,
          }

          if (event.data.children?.length) {

            newValue.content = [blockNodeToSlate(event.data.children)]
          } else {
            newValue.content = defaultContent
            let entryNode = defaultContent[0].children[0]
            changesService.addChange(['moveBlock', entryNode.id])
            changesService.addChange(['replaceBlock', entryNode.id])
          }

          return {
            prevDraft: newValue,
            localDraft: newValue,
          }
        }),
        assignError: assign({
          errorMessage: (_, event) => JSON.stringify(event.errorMessage),
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
        assignPublication: assign({
          publication: (_, event) => event.publication,
        }),
        updateLibrary: () => {
          mainPageService.send('RECONCILE')
        },
      },
      services: {
        fetchDocument: (_, event) => (sendBack) => {
          console.log('fetchDocument');

          ; (async () => {
            try {
              let { context } = mainPageService.getSnapshot()
              let data = await client.fetchQuery(
                [queryKeys.GET_DRAFT, context.params.docId],
                ({ queryKey }) => {
                  console.log('FETCHING');

                  let [_, draftId] = queryKey
                  return getDraft(draftId)
                },
              )
              sendBack({ type: 'EDITOR.REPORT.FETCH.SUCCESS', data })
            } catch (err: any) {
              sendBack({
                type: 'EDITOR.REPORT.FETCH.ERROR',
                errorMessage: err.message,
              })
            }
          })()
        },
      },
    },
  )
}

export type UseEditorDraftParams = DraftEditorMachineProps & {
  documentId: string
  mainPageService: ReturnType<typeof useMainPage>
  options: MachineOptionsFrom<ReturnType<typeof draftEditorMachine>>
}

export function useEditorDraft({
  documentId,
  mainPageService,
  editor,
  shouldAutosave,
  options,
}: UseEditorDraftParams) {
  const client = useQueryClient()
  const [state, send] = useMachine(draftEditorMachine({ client, mainPageService, editor, shouldAutosave }),
    options,
  )

  return [state, send] as const
}