import { Document, getDraft, Publication } from '@app/client'
import { blockNodeToSlate } from '@app/client/v2/block-to-slate'
import { changesService } from '@app/editor/mintter-changes/plugin'
import { queryKeys } from '@app/hooks'
import { useMainPage } from '@app/main-page-context'
import {
  createId,
  group,
  isEmbed,
  paragraph,
  statement,
  text
} from '@mintter/mttast'
import { useMachine } from '@xstate/react'
import { useEffect } from 'react'
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
  canPublish: boolean
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
  | {
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
    statement({ id: createId() }, [paragraph([text('')])]),
  ]),
]

export function draftEditorMachine({
  client,
  mainPageService,
  editor,
}: DraftEditorMachineProps) {
  /** @xstate-layout N4IgpgJg5mDOIC5SQJYBcD2AnAdCiANmAMSKgAOGs6KGAdmSAB6ICMA7AKw4Ccf-ANgEAGACziATABoQATzYBmVgJxChE0e1YcAHMIUBfAzNSZcYLFmyRiAMQCiAFQDCACUaVqaWgyTM2PCo8CuyaXDrByuwCMvIIHBI8OKL8nMLCAkqsEpxGJhDo2DgAZmBoAMYAFih0UMT2ACIAko4A8gBKOM4AggByzvYAMh5UNPSMLPFcvPx8QmKSsYoCoqpq7MIRrCF54AVmJWVVNXWNLR047fYACh2OOA4urjgAygCqzgMvLyNePhOITjSORsURKZL8BQ5DQSUK5Yx7Qq4UoVaq1erNNqdK63dr3R5uHD2drtDq-Ma+UCTCTbFTCTiiATaNIKCLsJbxZSrFJ8BSidL0gQSCS7UxFUwnPCEEhnLE4N7XBrdRz2cnecZ+SYbHS8RKhMQ6Vg8CQCHQc0Q6BQzPicTjGnQ5AQ8UX7cX7SX4IgY86da5vABCgyaL3cfk8FIBCCdOuNPH1FqNJrNIIQWm4syN7B4DrSAhdSJwEtqUq9BNDFFG6sp-niKxUaWijJ0TK5MRTzO5gjESct+YORagOAgYAARhgAK50cqSqoAQ1qNjV-01ij5OFYOi4iR4ok4CmEPE4HIUPFY1rjQIdwSz8PyBYHQ9HE6nHulxCYsDQs7QYBws+KP5YAAFKwAoAJTEGK5jusWw5jpO07Fp6YBLhqVKIHyqyHkoCi2iawp8OyKbCmeAoCtsrAMrSfZujQsFPghJzenKCpKiqqHVpMgSkewDoZAsGRcMenDsOee58BEOiaDR0F0YOsCzgAbkxFhWLg5AEN+xTYAAtoWrqyd4xYKcptQIDUikYOU34+AA2sIAC6HGRkoWF7tseFCtuRFxJkwjrvw2wHruIiGAiUH6XJOAmUxsoXKxyqqmGlbLuhCCYbw7m4UCXmEceKwQoRl6JCEzrhQZkVGfJSmxZi8WKolrwfF8PzJX8aE1lCbk4Z5BFxhynCsKsRo2vulraAeMmVZKMXonFnQJSqRIkmSbURiu6VrthHk5X1PmIKI2SFcEAgibhXCHlND7kOOI4ECgsBoqcdW+gGQYhk1nz2N8zkbdk+0IDa56nXGvH8iK5X3jBg43XdD1PcxFx+oGwbPMSpLtL9aXarqcb8gmxqmhyQoxvwjKgadwjsOwV3Q8QED0L+n7fr+EUDljNatjgDZ1s22h1hym6iTy2Z7lCQLZLTcnEFcLxOF0rh9AA4t9HNalm66bod3aGokbZxNkOTHZag1CLxRgInQGDDvAfgRchauAsCBtQv5aTkfStqUTTkP9pY1gQI7CAiRyG4SFaPI6Ia7A5LaFpTSixy1EHHBOjgOiDSk9K8ZwAgA8yEjcx7praKIGhS1VJYoWtVaRrnWF69mIQbBkyZxAyhcjYEjehEIFeSnBz6IYOc4LoHNepZzG5WsK6jU3a2h8seGfnhneinnnZV3v20OPvBL5IdKKdgqJDbU7ufJDQ6y-pvwa8HlEW+IjvUWD4xycTx1XEhDgVN8SI4hBJHmIjHYGQ0SJZlEP3YyNUP4VnapxNgVMOQkXXGoQ6YMTS4WgTDW691HonCDsEbgVN9BAhZBuPOxNcI4AUHQiQlosFpBNDgnAsN8GVEgEHEIhdhDh13NoPQJVTqh3SEkd26RGQMI4HwnBQdLQcjjL-MiwgKJUQUHmX2RRig1HhvYaGKcLrpzznw5sQIGEZEFruc8WcBQpB0AnWcKAiDj3getNKIVdQbjLnaGkWZtihwdBHCS0dY4MgcVorAQcGEoNWCo+J6QVgWwMEAA */
  return createMachine(
    {
      context: {
        retries: 0,
        localDraft: null,
        prevDraft: null,
        errorMessage: '',
        publication: null,
        canPublish: false,
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
                  actions: [
                    'validateCanPublish',
                    'updateValueToContext',
                    'updateCurrentDocument',
                  ],
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
                  always: {
                    target: 'idle',
                  },
                },
                idle: {
                  after: {
                    '1000': {
                      target: '#editor.editing.saving',
                    },
                  },
                },
              },
              on: {
                'EDITOR.UPDATE': {
                  actions: ['updateValueToContext', 'updateCurrentDocument'],
                  target: '.changed',
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
        maxRetriesReached: (context) => context.retries == 5,
      },
      actions: {
        validateCanPublish: assign((context) => {
          let hasContent = Editor.string(editor, [])
          let hasEmbed = Editor.nodes(editor, {
            at: [],
            match: isEmbed,
          })

          console.log('validateCanPublish', { hasContent, hasEmbed })

          if (!context.canPublish) {
            return {
              canPublish: true,
            }
          }

          return {}
        }),
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

  useEffect(() => {
    if (documentId) {
      send({ type: 'FETCH', documentId })
      // onlyOnce.current = true
    }
  }, [documentId])
  return [state, send] as const
}
