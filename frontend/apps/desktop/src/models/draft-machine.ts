import {HMDraft} from '@shm/shared'
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
      | {type: 'SAVE.ON.EXIT'}
      | {type: 'EMPTY.ID'},
  },

  actions: {
    setDraft: assign({
      draft: ({event}) => {
        if (event.type == 'GET.DRAFT.SUCCESS') {
          return event.draft
        }
        return null
      },
      title: ({context, event}) => {
        if (event.type == 'GET.DRAFT.SUCCESS' && event.draft) {
          return event.draft.metadata.title
        }
        return context.title
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
      errorMessage: ({context, event}) => {
        if (event.type == 'GET.DRAFT.ERROR') {
          return JSON.stringify(event.error, null) || ''
        }
        return context.errorMessage
      },
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
        'EMPTY.ID': {
          target: 'ready',
        },
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
      entry: [
        () => {
          console.log('== ENTERING READY!')
        },
      ],
      exit: [
        () => {
          console.log('== EXITING READY!')
        },
      ],
      always: {
        target: 'ready',
        actions: [
          () => {
            console.log('== AFTER TIMEOUT READY!')
          },
          {type: 'populateEditor'},
        ],
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
