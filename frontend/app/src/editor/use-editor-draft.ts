import {Document, getDraft, publishDraft, updateDraft} from '@mintter/client'
import {createId, group, paragraph, statement, text} from '@mintter/mttast-builder'
import {useMachine} from '@xstate/react'
import isEqual from 'lodash.isequal'
import {useEffect} from 'react'
import {QueryClient, useQueryClient} from 'react-query'
import type {Descendant} from 'slate'
import type {ActionFunction} from 'xstate'
import {assign, createMachine} from 'xstate'

export type DraftEditorMachineEvent =
  | {
      type: 'FETCH'
      documentId: string
    }
  | {
      type: 'RECEIVE_DATA'
      data: Document
    }
  | {
      type: 'UPDATE'
      payload: Document
    }
  | {
      type: 'CANCEL'
    }
  | {
      type: 'PUBLISH'
    }
export type EditorDocument = Document & {
  content: Array<Descendant>
}
export type DraftEditorMachineContext = {
  retries: number
  prevDraft: EditorDocument | null
  localDraft: EditorDocument | null
  errorMessage: string
}

interface DraftEditorMachineProps {
  client: QueryClient
  afterSave: ActionFunction<DraftEditorMachineContext, DraftEditorMachineEvent>
  afterPublish: ActionFunction<DraftEditorMachineContext, DraftEditorMachineEvent>
  loadAnnotations: ActionFunction<DraftEditorMachineContext, DraftEditorMachineEvent>
}

const defaultContent = [group([statement({id: createId()}, [paragraph([text('')])])])]

const draftEditorMachine = ({afterSave, afterPublish, loadAnnotations, client}: DraftEditorMachineProps) =>
  createMachine<DraftEditorMachineContext, any>(
    {
      id: 'editor',
      initial: 'idle',
      context: {
        retries: 0,
        prevDraft: null,
        localDraft: null,
        errorMessage: '',
      },
      states: {
        idle: {
          initial: 'noError',
          states: {
            noError: {
              entry: ['clearErrorMessage'],
            },
            errored: {
              on: {
                FETCH: {
                  target: '#fetching',
                  actions: ['incrementRetries'],
                },
              },
            },
          },
          on: {
            FETCH: {
              target: 'fetching',
            },
          },
        },
        fetching: {
          id: 'fetching',
          on: {
            FETCH: {},
            CANCEL: {
              target: 'idle',
            },
            RECEIVE_DATA: {
              target: 'editing',
              actions: ['assignDataToContext', 'loadAnnotations'],
            },
          },
          invoke: {
            src: 'fetchData',
            onError: {
              target: 'idle.errored',
              actions: 'assignErrorToContext',
            },
            onDone: {
              target: '#editing',
              actions: ['assignDataToContext'],
            },
          },
        },
        editing: {
          id: 'editing',
          initial: 'idle',
          states: {
            idle: {
              // entry: 'checkContext',
              on: {
                UPDATE: {
                  actions: ['updateValueToContext'],
                  target: 'debouncing',
                },
                PUBLISH: {
                  target: 'publishing',
                },
              },
            },
            debouncing: {
              on: {
                UPDATE: {
                  actions: ['updateValueToContext'],
                  target: 'debouncing',
                },
              },
              after: {
                1000: [
                  {
                    target: 'saving',
                    cond: 'isValueDirty',
                  },
                  {
                    target: 'idle',
                  },
                ],
              },
            },
            saving: {
              invoke: {
                src: 'saveDraft',
                onDone: {
                  target: 'idle',
                  actions: ['afterSave'],
                },
                onError: {
                  target: 'idle',
                  actions: ['assignErrorToContext'],
                },
              },
            },
            publishing: {
              invoke: {
                src: 'publishDraft',
                onDone: {
                  target: 'published',
                },
                onError: {
                  target: 'idle',
                  actions: ['assignErrorToContext'],
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
      },
    },
    {
      guards: {
        isValueDirty: (context) => {
          const isContentNotEqual = !isEqual(context.localDraft?.content, context.prevDraft?.content)
          const isTitleNotEqual = !isEqual(context.localDraft?.title, context.prevDraft?.title)
          const isSubtitleNotEqual = !isEqual(context.localDraft?.subtitle, context.prevDraft?.subtitle)
          return isContentNotEqual || isTitleNotEqual || isSubtitleNotEqual
        },
      },
      services: {
        fetchData: (_, event: DraftEditorMachineEvent) => () => {
          if (event.type != 'FETCH') return
          return client.fetchQuery(['Draft', event.documentId], async ({queryKey}) => {
            const [_key, draftId] = queryKey
            return await getDraft(draftId)
          })
        },
        saveDraft: (context: DraftEditorMachineContext, event: DraftEditorMachineEvent) => () => {
          const newDraft = {
            ...context.localDraft,
            content: JSON.stringify(context.localDraft?.content),
          }
          return updateDraft(newDraft as Document)
        },
        publishDraft: (context) => () => {
          console.log('PUBLISHING', context)
          return publishDraft(context.localDraft?.id!)
        },
      },
      actions: {
        updateValueToContext: assign({
          localDraft: (context, event) => {
            return {
              ...context.localDraft,
              ...event.payload,
            }
          },
        }),
        assignDataToContext: assign((context, event) => {
          // if (event.type !== 'RECEIVE_DATA') return {}
          if (event.type == 'done.invoke.fetchData') {
            const value = {
              ...event.data,
              content: event.data.content ? JSON.parse(event.data.content) : defaultContent,
            }
            return {
              prevDraft: value,
              localDraft: value,
            }
          }
          console.log('not fetch event', event)
          return {
            localDraft: {
              ...context.localDraft,
              ...event.data,
            },
            prevDraft: {
              ...context.prevDraft,
              ...event.data,
            },
          }
        }),
        clearErrorMessage: assign((_) => ({
          errorMessage: '',
        })),
        assignErrorToContext: assign((context, event) => {
          console.log('assignErrorToContext', {context, event})
          return {
            errorMessage: event.data?.message || 'An unknown error occurred',
          }
        }),
        incrementRetries: assign<DraftEditorMachineContext, DraftEditorMachineEvent>({
          retries: (context) => context.retries + 1,
        }),
        afterPublish,
        afterSave,
        loadAnnotations,
      },
    },
  )

export type UseEditorDraftParams = DraftEditorMachineProps & {
  documentId: string
}

export function useEditorDraft({documentId, ...afterActions}: UseEditorDraftParams) {
  const client = useQueryClient()

  const [state, send] = useMachine(draftEditorMachine({...afterActions, client}), {devTools: true})

  useEffect(() => {
    if (documentId) {
      send({type: 'FETCH', documentId})
    }
  }, [])
  return [state, send] as const
}
