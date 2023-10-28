import {Document} from '@mintter/shared'
import {StateFrom, assign, createMachine} from 'xstate'
import {BlocksMap, BlocksMapIten, createBlocksMap} from './documents'

export type DraftMachineState = StateFrom<typeof draftMachine>
export const draftMachine = createMachine(
  {
    context: {
      blocksMap: {},
      hasChangedWhileSaving: false,
      draft: null,
    },
    id: 'Draft',
    initial: 'fetching',
    states: {
      fetching: {
        on: {
          'GET.DRAFT.ERROR': {
            target: 'error',
          },
          'GET.DRAFT.SUCCESS': {
            target: 'mountingEditor',
            actions: [
              {
                type: 'setCurrentDraft',
              },
            ],
          },
        },
      },
      mountingEditor: {
        entry: [
          {
            type: 'populateEditor',
          },
          {
            type: 'setCurrentBlocksmap',
          },
        ],
        after: {
          20: {
            target: 'ready',
          },
        },
      },
      error: {
        on: {
          'GET.DRAFT.RETRY': {
            target: 'fetching',
            actions: assign({
              blocksMap: {},
              hasChangedWhileSaving: false,
              draft: null,
            }),
          },
        },
      },
      ready: {
        initial: 'idle',
        states: {
          idle: {
            entry: [
              {
                type: 'focusEditor',
              },
            ],
            on: {
              CHANGE: {
                target: 'changed',
              },
            },
          },
          changed: {
            after: {
              autosaveTimeout: {
                target: '#Draft.ready.saving',
              },
            },
            on: {
              CHANGE: {
                target: 'changed',
                reenter: true,
              },
            },
          },
          saving: {
            entry: [
              {
                type: 'resetChangeWhileSaving',
              },
            ],
            invoke: {
              src: 'updateDraft',
              input: ({context}) => context.blocksMap,
              id: 'update-draft-actor',
              onDone: [
                {
                  target: 'saving',
                  guard: 'didChangeWhileSaving',
                  reenter: true,
                  actions: [
                    {type: 'onUpdateSuccess'},
                    {
                      type: 'updateContextAfterSave',
                    },
                  ],
                },
                {
                  target: 'idle',
                  actions: [
                    {
                      type: 'updateContextAfterSave',
                    },
                  ],
                },
              ],
              onError: [
                {
                  target: 'saveError',
                },
              ],
            },
            on: {
              CHANGE: {
                target: 'saving',
                actions: [
                  {
                    type: 'setHasChangedWhileSaving',
                  },
                ],
                reenter: false,
              },
            },
          },
          saveError: {
            on: {
              'RESET.DRAFT': {
                target: '#Draft.fetching',
              },
            },
          },
        },
      },
    },
    types: {
      events: {} as
        | {type: 'CHANGE'}
        | {type: 'RESET.DRAFT'}
        | {type: 'GET.DRAFT.ERROR'; errorMessage: string}
        | {type: 'GET.DRAFT.RETRY'}
        | {type: 'GET.DRAFT.SUCCESS'; draft: Document},
      context: {} as {
        blocksMap: BlocksMap
        hasChangedWhileSaving: boolean
        draft: Document | null
      },
    },
  },
  {
    actions: {
      setHasChangedWhileSaving: assign({
        hasChangedWhileSaving: true,
      }),
      resetChangeWhileSaving: assign({
        hasChangedWhileSaving: false,
      }),
      setCurrentBlocksmap: assign({
        // @ts-expect-error
        blocksMap: ({context, event}) => {
          if (event.type == 'GET.DRAFT.SUCCESS') {
            let newBm = createBlocksMap(event.draft.children, '')
            console.log('=== setCurrentBlocksmap', {context, event, newBm})
            return newBm
          }
        },
      }),
      updateContextAfterSave: assign(({context, event}) => {
        if (event.output) {
          return {
            blocksMap: createBlocksMap(
              event.output.updatedDocument.children,
              '',
            ),
            draft: event.output.updatedDocument,
            hasChangedWhileSaving: false,
          }
        }
      }),
      setCurrentDraft: assign({
        draft: ({event}) => event.draft,
      }),
    },
    actors: {},
    guards: {
      didChangeWhileSaving: ({context}) => context.hasChangedWhileSaving,
    },
    delays: {
      autosaveTimeout: 500,
      saveIndicator: 1000,
    },
  },
)
