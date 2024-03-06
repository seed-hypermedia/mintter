import {Document} from '@mintter/shared'
import {createActorContext} from '@xstate/react'
import {StateFrom, assign, createMachine} from 'xstate'
import {BlocksMap, createBlocksMap} from './documents'

export type DraftMachineState = StateFrom<typeof draftMachine>

export const draftMachine = createMachine(
  {
    context: {
      blocksMap: {},
      hasChangedWhileSaving: false,
      draft: null,
      title: '',
      errorMessage: '',
      restoreTries: 0,
      changed: false,
    },
    id: 'Draft',
    initial: 'fetching',
    on: {
      // 'GET.DRAFT.SUCCESS': {
      //   target: '.error',
      //   actions: [
      //     {
      //       type: 'setError',
      //     },
      //   ],
      // },
      'GET.DRAFT.SUCCESS': {
        target: '.mountingEditor',
        actions: [
          {
            type: 'setCurrentDraft',
          },
        ],
      },
      'GET.DRAFT.ERROR': {
        target: '.error',
        actions: [
          {
            type: 'setError',
          },
        ],
      },
      'SAVE.ON.EXIT': {
        target: '.ready.saving',
      },
    },
    states: {
      fetching: {},
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
          // we need this to avoid saving right after loading the editor. fucking annoying
          10: {
            target: 'ready',
          },
        },
      },
      error: {
        entry: [{type: 'indicatorError'}],
        on: {
          'GET.DRAFT.RETRY': {
            target: 'fetching',
            actions: assign({
              blocksMap: {},
              hasChangedWhileSaving: false,
              draft: null,
            }),
          },
          'RESET.CORRUPT.DRAFT': {
            actions: [
              {
                type: 'resetDraftAndRedirectToDraftList',
              },
            ],
          },
        },
      },
      ready: {
        entry: [
          {
            type: 'focusEditor',
          },
        ],
        initial: 'idle',
        states: {
          idle: {
            on: {
              CHANGE: [
                {
                  target: 'changed',
                  actions: [
                    {
                      type: 'setTitle',
                    },
                  ],
                },
              ],
            },
          },
          changed: {
            entry: [
              {
                type: 'indicatorChange',
              },
              {
                type: 'setchanged',
              },
            ],
            after: {
              autosaveTimeout: {
                target: '#Draft.ready.saving',
              },
            },
            on: {
              CHANGE: {
                target: 'changed',
                reenter: true,
                actions: [
                  {
                    type: 'setTitle',
                  },
                ],
              },
            },
          },
          saving: {
            entry: [
              {
                type: 'resetChangeWhileSaving',
              },
              {
                type: 'indicatorSaving',
              },
            ],
            invoke: {
              src: 'updateDraft',
              input: ({context}) => context,
              id: 'update-draft-actor',
              onDone: [
                {
                  target: 'saving',
                  guard: 'didChangeWhileSaving',
                  reenter: true,
                  actions: [
                    // {type: 'onSaveSuccess'},
                    // {type: 'indicatorSaved'},
                    {
                      type: 'updateContextAfterSave',
                    },
                  ],
                },
                {
                  target: 'idle',
                  guard: ({event}) => typeof event.output == 'string',
                  actions: [
                    {
                      type: 'indicatorIdle',
                    },
                  ],
                },
                {
                  target: 'idle',
                  actions: [
                    {type: 'onSaveSuccess'},
                    {type: 'indicatorSaved'},
                    {
                      type: 'updateContextAfterSave',
                    },
                  ],
                },
              ],
              onError: [
                {
                  target: 'saveError',
                  actions: [{type: 'indicatorError'}],
                },
              ],
            },
            on: {
              CHANGE: {
                target: 'saving',
                reenter: false,
                actions: [
                  {
                    type: 'setHasChangedWhileSaving',
                  },
                  {
                    type: 'setTitle',
                  },
                ],
              },
            },
          },
          saveError: {
            on: {
              'RESET.DRAFT': {
                target: 'resetting',
              },
              'RESTORE.DRAFT': {
                target: 'restoring',
                actions: [
                  {
                    type: 'incrementRestoreTries',
                  },
                ],
              },
            },
          },
          restoring: {
            invoke: {
              src: 'restoreDraft',
              id: 'restore-draft',
              input: ({context}) => context,
              onDone: {
                actions: [
                  {
                    type: 'reload',
                  },
                ],
              },
              onError: {
                target: 'saveError',
              },
            },
          },
          resetting: {
            invoke: {
              src: 'resetDraft',
              id: 'reset-draft',
              input: (context) => context,
              onDone: {
                actions: [
                  {
                    type: 'reload',
                  },
                ],
              },
              onError: {
                target: 'saveError',
              },
            },
          },
        },
      },
    },
    types: {
      events: {} as
        | {type: 'CHANGE'; title?: string}
        | {type: 'RESET.DRAFT'}
        | {type: 'RESTORE.DRAFT'}
        | {type: 'RESET.CORRUPT.DRAFT'}
        | {type: 'GET.DRAFT.ERROR'; error: any}
        | {type: 'GET.DRAFT.RETRY'}
        | {type: 'GET.DRAFT.SUCCESS'; draft: Document}
        | {type: 'SAVE.ON.EXIT'},
      context: {} as {
        blocksMap: BlocksMap
        hasChangedWhileSaving: boolean
        draft: Document | null
        title: string
        errorMessage: string
        restoreTries: number
        changed: boolean
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
      setchanged: assign({
        changed: ({context}) => {
          if (!context.changed) {
            return true
          }
        },
      }),
      setCurrentBlocksmap: assign({
        // @ts-expect-error
        blocksMap: ({context, event}) => {
          if (event.type == 'GET.DRAFT.SUCCESS') {
            let newBm = createBlocksMap(event.draft.children, '')
            return newBm
          }
        },
        title: ({event}) =>
          event.type == 'GET.DRAFT.SUCCESS' ? event.draft.title : '',
      }),
      setTitle: assign({
        title: ({event, context}) => {
          if (event.type == 'CHANGE' && event.title) {
            return event.title
          } else {
            return context.title
          }
        },
      }),
      reload: () => {
        window.location.reload()
      },
      updateContextAfterSave: assign(({context, event}) => {
        //TODO: check types
        let output = (event as any).output
        if (output && typeof output != 'string') {
          return {
            blocksMap: createBlocksMap(output.updatedDocument.children, ''),
            draft: output.updatedDocument,
            hasChangedWhileSaving: false,
            title: output.updatedDocument.title,
          }
        } else {
          return context
        }
      }),
      setCurrentDraft: assign({
        draft: ({event, context}) => {
          return event.type == 'GET.DRAFT.SUCCESS' ? event.draft : null
        },
      }),
      setError: assign({
        errorMessage: ({event}) => {
          return 'ERROR: '
        },
      }),
      incrementRestoreTries: assign({
        restoreTries: ({context}) => context.restoreTries + 1,
      }),
    },
    guards: {
      didChangeWhileSaving: ({context}) => context.hasChangedWhileSaving,
    },
  },
)

export const saveIndicator = createMachine(
  {
    id: 'saveIndicator',
    initial: 'idle',

    states: {
      idle: {},
      changed: {
        on: {
          'INDICATOR.SAVING': {
            target: 'saving',
          },
        },
      },
      saving: {
        on: {
          'INDICATOR.SAVED': {
            target: 'saved',
          },
        },
      },
      saved: {
        after: {
          '2000': {
            target: '#saveIndicator.idle',
            actions: [],
            meta: {},
          },
        },
      },
      error: {},
    },
    on: {
      'INDICATOR.CHANGE': {
        target: '.changed',
      },
      'INDICATOR.ERROR': {
        target: '.error',
      },
      'INDICATOR.IDLE': {
        target: '.idle',
      },
    },
    onDone: [{target: '.idle'}],
    types: {
      events: {} as
        | {type: 'INDICATOR.CHANGE'}
        | {type: 'INDICATOR.SAVING'}
        | {type: 'INDICATOR.SAVED'}
        | {type: 'INDICATOR.ERROR'}
        | {type: 'INDICATOR.IDLE'},
    },
  },
  {
    actions: {},
    actors: {},
    guards: {},
    delays: {},
  },
)

export const DraftStatusContext = createActorContext(saveIndicator)
