import {dispatchDraftStatus, DraftStatus} from '@/draft-status'
import {HMDraft} from '@shm/shared'
import {assign, setup, StateFrom} from 'xstate'

export type DraftMachineState = StateFrom<typeof draftMachine>

export const draftMachine = setup({
  types: {
    context: {} as {
      name: string
      draft: null | HMDraft
      errorMessage: string
      restoreTries: number
      changed: boolean
      hasChangedWhileSaving: boolean
    },
    events: {} as
      | {type: 'CHANGE'; name?: string}
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
      name: ({context, event}) => {
        if (event.type == 'GET.DRAFT.SUCCESS' && event.draft) {
          return event.draft.metadata.name
        }
        return context.name
      },
    }),
    setName: assign({
      name: ({context, event}) => {
        if (event.type == 'CHANGE' && event.name) {
          return event.name
        }
        return context.name
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
    setDraftStatus: function (_, params: {status: DraftStatus}) {
      dispatchDraftStatus(params.status)
    },
    populateEditor: function () {},
    replaceRouteifNeeded: function () {},
    focusEditor: function () {},
    onSaveSuccess: function ({context}) {},
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
    name: '',
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
      always: {
        target: 'ready',
        actions: [{type: 'populateEditor'}],
      },
    },
    error: {},
    ready: {
      initial: 'idle',
      entry: [
        {
          type: 'focusEditor',
        },
        {
          type: 'setDraftStatus',
          params: {status: 'idle'},
        },
      ],
      states: {
        idle: {
          on: {
            CHANGE: {
              target: 'changed',
              actions: {
                type: 'setName',
              },
            },
          },
        },
        changed: {
          entry: [
            {
              type: 'setDraftStatus',
              params: {status: 'changed'},
            },
          ],
          on: {
            CHANGE: {
              target: 'changed',
              actions: {
                type: 'setName',
              },
              reenter: true,
            },
          },
          after: {
            autosaveTimeout: {
              target: 'saving',
            },
          },
        },
        saving: {
          entry: [
            {
              type: 'resetChangeWhileSaving',
            },
            {
              type: 'setDraftStatus',
              params: {status: 'saving'},
            },
          ],
          on: {
            CHANGE: {
              target: 'saving',
              actions: [
                {
                  type: 'setHasChangedWhileSaving',
                },
                {
                  type: 'setName',
                },
              ],
              reenter: false,
            },
          },
          invoke: {
            input: ({context}) => ({
              name: context.name,
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
                  {
                    type: 'setDraftStatus',
                    params: {status: 'saved'},
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
