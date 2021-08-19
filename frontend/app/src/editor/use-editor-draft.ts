import {useEffect, useMemo, useReducer} from 'react'
import {FlowContent, getDraft, GroupingContent, Document, updateDraft} from '@mintter/client'
import {useMachine} from '@xstate/react'
import {ActionFunction, assign, createMachine} from 'xstate'
import type {Descendant} from 'mixtape'
import {nanoid} from 'nanoid'
import isEqual from 'lodash.isequal'
import {QueryClient, useQueryClient} from 'react-query'
import {group, paragraph, statement, text} from 'frontend/mttast-builder/dist'
import {publishDraft} from 'frontend/client/src/drafts'

export type DRAFT_FETCH_EVENT = {
  type: 'FETCH'
  documentId: string
}

export type DRAFT_UPDATE_EVENT = {
  type: 'UPDATE'
  payload: Document
}

export type DRAFT_RECEIVE_DATA_EVENT = {
  type: 'RECEIVE_DATA'
  data: Document
}

export type DraftEditorMachineEvent =
  | DRAFT_FETCH_EVENT
  | DRAFT_RECEIVE_DATA_EVENT
  | DRAFT_UPDATE_EVENT
  | {
      type: 'CANCEL'
    }
  | {
      type: 'PUBLISH'
    }

export type DraftEditorMachineContext = {
  retries: number
  prevDraft: Document | null
  localDraft: Document | null
  errorMessage?: string
}

interface DraftEditorMachineProps {
  afterSave: ActionFunction
  afterPublish: ActionFunction
  client: QueryClient
}

const defaultContent = [
  group([statement([paragraph([text('demo')]), group([statement([paragraph([text('demo 2')])])])])]),
]

const draftEditorMachine = ({afterSave, afterPublish, client}: DraftEditorMachineProps) =>
  createMachine<DraftEditorMachineContext, DraftEditorMachineEvent>(
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
          on: {
            FETCH: {
              target: 'fetching',
            },
          },
          initial: 'noError',
          states: {
            noError: {
              entry: ['clearErrorMessage'],
            },
            errored: {
              on: {
                FETCH: {
                  target: '#fetching',
                  actions: assign({
                    retries: (context, event) => context.retries + 1,
                  }),
                },
              },
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
              actions: 'assignDataToContext',
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
              // after: {
              //   1000: [
              //     {
              //       target: 'saving',
              //       cond: 'isValueDirty',
              //     },
              //     {
              //       target: 'idle',
              //     },
              //   ],
              // },
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
          const isContentNotEqual = !isEqual(context.localDraft.content, context.prevDraft.content)
          const isTitleNotEqual = !isEqual(context.localDraft.title, context.prevDraft.title)
          const isSubtitleNotEqual = !isEqual(context.localDraft.subtitle, context.prevDraft.subtitle)
          return isContentNotEqual || isTitleNotEqual || isSubtitleNotEqual
        },
      },
      services: {
        fetchData: (context, event) => () => {
          return client.fetchQuery(['Draft', event.documentId], async ({queryKey}) => {
            const [_key, draftId] = queryKey
            return await getDraft(draftId)
          })
        },
        saveDraft: (context, event) => () => {
          const newDraft: Document = {
            ...context.localDraft,
            content: JSON.stringify(context.localDraft.content),
          }
          return updateDraft(newDraft)
        },
        publishDraft: (context) => () => {
          console.log('PUBLISHING', context)
          return publishDraft(context.localDraft.id)
        },
      },
      actions: {
        checkContext: (context, event) => {
          console.log('checking!!', {context, event})
        },
        updateValueToContext: assign({
          localDraft: (context, event) => {
            return {
              ...context.localDraft,
              ...(event as DRAFT_UPDATE_EVENT).payload,
            }
          },
        }),
        assignDataToContext: assign((context, event) => {
          console.log(event)
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
        clearErrorMessage: assign({
          errorMessage: undefined,
        }),
        assignErrorToContext: assign((context, event) => {
          console.log('assignErrorToContext', {context, event})
          return {
            errorMessage: event.data?.message || 'An unknown error occurred',
          }
        }),
        afterPublish,
        afterSave,
      },
    },
  )

export function useEditorDraft({documentId, ...afterActions}) {
  const client = useQueryClient()
  const [state, send] = useMachine(draftEditorMachine({...afterActions, client}), {devTools: true})
  // TODO: refactor machint to use queryClient in the services
  useEffect(() => {
    if (documentId) {
      send({type: 'FETCH', documentId})
    }
  }, [])
  return [state, send] as const
}
