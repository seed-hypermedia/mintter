import {HMDocument, HMDraft} from '@shm/shared'
import {createActorContext} from '@xstate/react'
import {StateFrom, assign, createMachine, setup} from 'xstate'

export type DraftMachineState = StateFrom<typeof draftMachine>

export const draftMachine = setup({
  types: {
    context: {} as {
      title: string
      draft: null | HMDraft
      errorMessage: string
      restoreTries: number
      changed: boolean
      hasChangedWhileSaving: boolean
    },
    events: {} as
      | {type: 'CHANGE'; title?: string}
      | {type: 'RESET.DRAFT'}
      | {type: 'RESTORE.DRAFT'}
      | {type: 'RESET.CORRUPT.DRAFT'}
      | {type: 'GET.DRAFT.ERROR'; error: any}
      | {type: 'GET.DRAFT.RETRY'}
      | {type: 'GET.DRAFT.SUCCESS'; draft: HMDraft}
      | {type: 'SAVE.ON.EXIT'},
  },

  actions: {
    setDraft: assign({
      draft: ({event}) => {
        if (event.type == 'GET.DRAFT.SUCCESS') {
          return event.draft
        }
        return null
      },
    }),
    setTitle: assign({
      title: ({context, event}) => {
        if (event.type == 'CHANGE' && event.title) {
          return event.title
        }
        return context.title
      },
    }),
    setErrorMessage: assign({
      errorMessage: ({event}) => event.error || '',
    }),
    setChanged: assign({
      changed: ({context}) => {
        if (!context.changed) {
          return true
        }
        return false
      },
    }),
    setHasChangedWhileSaving: assign({
      hasChangedWhileSaving: true,
    }),
    resetChangeWhileSaving: assign({
      hasChangedWhileSaving: false,
    }),
    populateEditor: function () {},
    focusEditor: function () {},
  },
  guards: {
    didChangeWhileSaving: ({context}) => context.hasChangedWhileSaving,
  },
  actors: {},
  delays: {
    autosaveTimeout: 500,
  },
}).createMachine({
  id: 'Draft',
  context: {
    title: '',
    draft: null,
    errorMessage: '',
    restoreTries: 0,
    changed: false,
    hasChangedWhileSaving: false,
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        'GET.DRAFT.SUCCESS': [
          {
            target: 'setupData',
            actions: [{type: 'setDraft'}],
          },
        ],
        'GET.DRAFT.ERROR': {
          target: 'error',
          actions: [{type: 'setErrorMessage'}],
        },
      },
    },
    setupData: {
      after: {
        100: {
          target: 'ready',
          actions: [{type: 'populateEditor'}],
        },
      },
    },
    error: {},
    ready: {
      initial: 'idle',
      entry: [
        {
          type: 'focusEditor',
        },
      ],
      states: {
        idle: {
          on: {
            CHANGE: {
              target: 'changed',
              actions: {
                type: 'setTitle',
              },
            },
          },
        },
        changed: {
          on: {
            CHANGE: {
              target: 'changed',
              actions: {
                type: 'setTitle',
              },
              reenter: true,
            },
          },
          after: {
            autosaveTimeout: {
              target: 'saving',
            },
          },
          entry: [{type: 'setChanged'}],
        },
        saving: {
          on: {
            CHANGE: {
              target: 'saving',
              actions: [
                {
                  type: 'setHasChangedWhileSaving',
                },
                {
                  type: 'setTitle',
                },
              ],
              reenter: false,
            },
          },
          entry: [
            {
              type: 'resetChangeWhileSaving',
            },
          ],
          invoke: {
            input: ({context}) => ({
              title: context.title,
              currentDraft: context.draft,
            }),
            id: 'createOrUpdateDraft',
            src: 'createOrUpdateDraft',
            onDone: [
              {
                target: 'saving',
                actions: [
                  {
                    type: 'replaceRouteifNeeded',
                  },
                ],
                guard: {
                  type: 'didChangeWhileSaving',
                },
                reenter: true,
              },
              {
                target: 'idle',
                actions: [
                  {
                    type: 'indicatorIdle',
                  },
                  {
                    type: 'replaceRouteifNeeded',
                  },
                ],
                guard: ({event}) => typeof event.output == 'string',
              },
              {
                target: 'idle',
                actions: [
                  {
                    type: 'onSaveSuccess',
                  },
                  {
                    type: 'setDraft',
                  },
                  {
                    type: 'replaceRouteifNeeded',
                  },
                ],
              },
            ],
          },
        },
      },
    },
  },
})

export const _draftMachine = createMachine(
  {
    context: {
      hasChangedWhileSaving: false,
      draft: null,
      errorMessage: '',
      restoreTries: 0,
      changed: false,
    },
    id: 'Draft',
    initial: 'init',
    on: {
      'GET.DRAFT.SUCCESS': {
        target: '#Draft.mountingEditor',
        actions: {
          type: 'setCurrentDraft',
        },
      },
      'GET.DRAFT.ERROR': {
        target: '#Draft.error',
        actions: {
          type: 'setError',
        },
      },
      'SAVE.ON.EXIT': {
        target: '#Draft.ready.saving',
      },
    },
    states: {
      init: {
        always: [
          {
            target: 'fetching',
            guard: {
              type: 'routeHasId',
            },
          },
          {
            target: 'ready',
          },
        ],
      },
      fetching: {},
      mountingEditor: {
        after: {
          10: {
            target: 'ready',
            actions: [
              {
                type: 'populateEditor',
              },
            ],
          },
        },
      },
      ready: {
        initial: 'idle',
        entry: [
          {
            type: 'focusEditor',
          },
        ],
        states: {
          idle: {
            on: {
              CHANGE: {
                target: 'changed',
                actions: {
                  type: 'setTitle',
                },
              },
            },
          },
          changed: {
            on: {
              CHANGE: {
                target: 'changed',
                actions: {
                  type: 'setTitle',
                },
                reenter: true,
              },
            },
            after: {
              autosaveTimeout: {
                target: 'saving',
              },
            },
            entry: [
              {
                type: 'indicatorChange',
              },
              {
                type: 'setchanged',
              },
            ],
          },
          saving: {
            on: {
              CHANGE: {
                target: 'saving',
                actions: [
                  {
                    type: 'setHasChangedWhileSaving',
                  },
                  {
                    type: 'setTitle',
                  },
                ],
                reenter: false,
              },
            },
            entry: [
              {
                type: 'resetChangeWhileSaving',
              },
              {
                type: 'indicatorSaving',
              },
            ],
            invoke: {
              id: 'update-or-create-draft-actor',
              input: ({context}) => context,
              onDone: [
                {
                  target: 'saving',
                  actions: [
                    {
                      type: 'updateContextAfterSave',
                    },
                    {
                      type: 'replaceRouteifNeeded',
                    },
                  ],
                  guard: {
                    type: 'didChangeWhileSaving',
                  },
                  reenter: true,
                },
                {
                  target: 'idle',
                  actions: [
                    {
                      type: 'indicatorIdle',
                    },
                    {
                      type: 'replaceRouteifNeeded',
                    },
                  ],
                  guard: ({event}) => typeof event.output == 'string',
                },
                {
                  target: 'idle',
                  actions: [
                    {
                      type: 'onSaveSuccess',
                    },
                    {
                      type: 'indicatorSaved',
                    },
                    {
                      type: 'updateContextAfterSave',
                    },
                    {
                      type: 'replaceRouteifNeeded',
                    },
                  ],
                },
              ],
              onError: {
                target: 'saveError',
                actions: {
                  type: 'indicatorError',
                },
              },
              src: 'updateOrCreateDraft',
            },
          },
          saveError: {
            on: {
              'RESET.DRAFT': {
                target: 'resetting',
              },
              'RESTORE.DRAFT': {
                target: 'restoring',
                actions: {
                  type: 'incrementRestoreTries',
                },
              },
            },
          },
          resetting: {
            invoke: {
              id: 'reset-draft',
              input: {},
              onDone: {
                actions: {
                  type: 'reload',
                },
              },
              onError: {
                target: 'saveError',
              },
              src: 'resetDraft',
            },
          },
          restoring: {
            invoke: {
              id: 'restore-draft',
              input: {},
              onDone: {
                actions: {
                  type: 'reload',
                },
              },
              onError: {
                target: 'saveError',
              },
              src: 'restoreDraft',
            },
          },
        },
      },
      error: {
        on: {
          'GET.DRAFT.RETRY': {
            target: 'fetching',
            actions: assign({hasChangedWhileSaving: false, draft: null}),
          },
          'RESET.CORRUPT.DRAFT': {
            actions: {
              type: 'resetDraftAndRedirectToDraftList',
            },
          },
        },
        entry: {
          type: 'indicatorError',
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
        | {type: 'GET.DRAFT.SUCCESS'; draft: HMDocument}
        | {type: 'SAVE.ON.EXIT'},
      context: {} as {
        hasChangedWhileSaving: boolean
        draft: HMDocument | null
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

      setTitle: assign({
        draft: ({event, context}) => {
          if (event.type == 'CHANGE' && event.title) {
            return {
              ...context.draft,
              title: event.title,
            }
          } else {
            return context.draft
          }
        },
      }),
      reload: () => {
        window.location.reload()
      },
      updateContextAfterSave: assign(({context, event}) => {
        //TODO: IMPLEMENT ME
        const output = (event as any).output
        if (output && typeof output != 'string') {
          console.log('=== OUTPUT!', output)
        }
        return context
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
