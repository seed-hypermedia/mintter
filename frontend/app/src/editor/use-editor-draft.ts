/**
 *
 *
 * TODOS:
 * - loosing focus from editor when save
 *
 */

import {useEffect, useMemo, useReducer} from 'react'
import {FlowContent, getDraft, GroupingContent, u} from '@mintter/client'
import {useMachine} from '@xstate/react'
import {ActionFunction, assign, createMachine} from 'xstate'
import type {Descendant} from 'mixtape'
import {nanoid} from 'nanoid'
import isEqual from 'lodash.isequal'
import {QueryClient, useQueryClient} from 'react-query'

type Document = {
  id: string
  title: string
  subtitle: string
  children: [GroupingContent]
}

export type DRAFT_FETCH_EVENT = {
  type: 'FETCH'
  documentId: string
}

export type DRAFT_UPDATE_EVENT = {
  type: 'UPDATE'
  payload: Partial<Document>
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
              entry: 'checkContext',
              on: {
                UPDATE: {
                  actions: ['updateValueToContext'],
                  target: 'debouncing',
                },
                PUBLISH: {
                  target: '#published',
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
                // 1000: [
                //   {
                //     target: 'saving',
                //     cond: 'isValueDirty',
                //   },
                //   {
                //     target: 'idle',
                //   },
                // ],
              },
            },
            saving: {
              invoke: {
                src: 'saveDraft',
                onDone: {
                  target: 'idle',
                  actions: ['afterSave', 'assignDataToContext'],
                },
                onError: {
                  target: 'idle',
                  actions: ['assignErrorToContext'],
                },
              },
            },
          },
        },
        published: {
          id: 'published',
          type: 'final',
          entry: ['afterPublish'],
        },
      },
    },
    {
      guards: {
        isValueDirty: (context) => {
          return !isEqual(context.localDraft, context.prevDraft)
        },
      },
      services: {
        checkContext: (context, event) => {
          console.log('checking!!', {context, event})
        },
        fetchData: (context, event) => () => {
          return client.fetchQuery(['Draft', event.documentId], async ({queryKey}) => {
            const [_key, draftId] = queryKey
            return await await getDraft(draftId)
          })
        },
        saveDraft: (context, event) => () => {
          return saveDraft(context.localDraft)
        },
      },
      actions: {
        updateValueToContext: assign({
          localDraft: (context, event) => {
            return {
              ...context.localDraft,
              ...(event as DRAFT_UPDATE_EVENT).payload,
            }
          },
        }),
        assignDataToContext: assign((context, event) => {
          console.log('assignDataToContext', event)
          // if (event.type !== 'RECEIVE_DATA') return {}
          return {
            prevDraft: (event as DRAFT_RECEIVE_DATA_EVENT).data,
            localDraft: (event as DRAFT_RECEIVE_DATA_EVENT).data,
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

// TODO: change with RPC call
async function saveDraft(data) {
  return await Promise.resolve(data)
}
