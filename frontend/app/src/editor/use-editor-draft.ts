import { Document, getDraft, Publication } from '@app/client'
import { blockNodeToSlate } from '@app/client/v2/block-to-slate'
import { changesService } from '@app/editor/mintter-changes/plugin'
import { queryKeys } from '@app/hooks'
import { useMainPage } from '@app/main-page-context'
import { createId, group, paragraph, statement, text } from '@mintter/mttast'
import { useMachine } from '@xstate/react'
import { useEffect, useRef } from 'react'
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
  }

interface DraftEditorMachineProps {
  client: QueryClient
  mainPageService: ReturnType<typeof useMainPage>
  shouldAutosave: boolean
  editor: Editor
}

const defaultContent = [
  group({ data: { parent: '' } }, [
    statement({ id: createId() }, [paragraph([text('')])]),
  ]),
]

export function draftEditorMachine({
  client,
  mainPageService,
  shouldAutosave = true,
  editor,
}: DraftEditorMachineProps) {
  return createMachine(
    {
      tsTypes: {} as import('./use-editor-draft.typegen').Typegen0,
      schema: {
        context: {} as EditorContext,
        events: {} as EditorEvent,
      },
      id: 'editor',
      initial: 'idle',
      context: {
        retries: 0,
        localDraft: null,
        prevDraft: null,
        errorMessage: '',
        publication: null,
        shouldMigrate: false,
      },
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
                target: 'failed',
                cond: 'maxRetriesReached',
                actions: ['displayFailedMessage'],
              },
              {
                target: 'fetching',
                actions: ['incrementRetries'],
              },
            ],
          },
        },
        fetching: {
          id: 'fetching',
          invoke: {
            src: 'fetchDocument',
            id: 'fetchDocument',
          },
          on: {
            'EDITOR.CANCEL': {
              target: 'idle',
            },
            'EDITOR.REPORT.FETCH.SUCCESS': {
              target: 'editing',
              actions: ['assignDraftsValue'],
            },
            'EDITOR.REPORT.FETCH.ERROR': {
              target: 'errored',
              actions: ['assignError'],
            },
          },
        },
        editing: {
          id: 'editing',
          initial: 'idle',
          entry: 'updateCurrentDocument',
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
                  target: '#fetching',
                },
              },
            },
            debouncing: {
              on: {
                'EDITOR.UPDATE': {
                  actions: ['updateValueToContext', 'updateCurrentDocument'],
                },
              },
              after: {
                1000: [
                  {
                    target: 'saving',
                    // cond: 'isValueDirty',
                  },
                  // {
                  //   target: 'idle',
                  // },
                ],
              },
            },
            saving: {
              tags: ['saving'],
              invoke: {
                src: 'saveDraft',
                onError: {
                  target: 'idle',
                  actions: ['assignError'],
                },
              },
              on: {
                'EDITOR.UPDATE.SUCCESS': {
                  target: 'idle',
                  actions: ['updateLibrary'],
                },
                'EDITOR.UPDATE.ERROR': {
                  target: 'idle',
                  actions: ['assignError'],
                },
              },
            },
            publishing: {
              invoke: {
                src: 'publishDraftService',
              },
              on: {
                'EDITOR.PUBLISH.SUCCESS': {
                  target: 'published',
                  actions: ['assignPublication'],
                },
                'EDITOR.PUBLISH.ERROR': {
                  target: 'idle',
                  actions: ['assignError'],
                },
              },
            },
            published: {
              type: 'final',
            },
          },
          onDone: {
            target: 'finishEditing',
          },
        },
        finishEditing: {
          entry: ['afterPublish'],
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
        //   const isContentNotEqual = !isEqual(context.localDraft?.content, context.prevDraft?.content)
        //   const isTitleNotEqual = !isEqual(context.localDraft?.title, context.prevDraft?.title)
        //   return isContentNotEqual || isTitleNotEqual
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
          ; (async () => {
            try {
              let { context } = mainPageService.getSnapshot()
              let data = await client.fetchQuery(
                [queryKeys.GET_DRAFT, context.params.docId],
                ({ queryKey }) => {

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
  const [state, send] = useMachine(
    () => draftEditorMachine({ client, mainPageService, editor, shouldAutosave }),
    options,
  )
  let onlyOnce = useRef(false)

  useEffect(() => {
    if (onlyOnce.current) return
    console.log('inside useEditor effect!', documentId)
    if (documentId) {
      send({ type: 'FETCH', documentId })
      // onlyOnce.current = true
    }
  }, [documentId])
  return [state, send] as const
}