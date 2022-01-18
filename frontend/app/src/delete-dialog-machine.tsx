import {createModel} from 'xstate/lib/model'
import {deleteDraft, deletePublication} from './client'

export const deleteConfirmationModel = createModel(
  {
    entryId: '',
    isDraft: false,
    errorMessage: '',
  },
  {
    events: {
      OPEN_DIALOG: (entryId: string, isDraft: boolean) => ({entryId, isDraft}),
      CANCEL: () => ({}),
      CONFIRM: () => ({}),
    },
  },
)

const assignDataToContext = deleteConfirmationModel.assign(
  {
    entryId: (_, event) => event.entryId,
    isDraft: (_, event) => event.isDraft,
  },
  'OPEN_DIALOG',
)

const clearDataFromContext = deleteConfirmationModel.assign(
  {
    entryId: '',
    isDraft: false,
    errorMessage: '',
  },
  'CANCEL',
)

export const deleteDialogMachine = deleteConfirmationModel.createMachine(
  {
    id: 'deleteConfirmationDialog',
    context: deleteConfirmationModel.initialContext,
    initial: 'closed',
    states: {
      closed: {
        id: 'closed',
        on: {
          OPEN_DIALOG: {
            target: 'open',
            actions: assignDataToContext,
          },
        },
      },
      open: {
        exit: deleteConfirmationModel.assign({
          errorMessage: '',
        }),
        initial: 'idle',
        states: {
          idle: {
            on: {
              CANCEL: {
                target: 'dismiss',
                actions: clearDataFromContext,
              },
              CONFIRM: 'confirmed',
            },
          },
          confirmed: {
            invoke: {
              src: 'executeAction',
              onError: {
                target: 'idle',
                actions: deleteConfirmationModel.assign(
                  {
                    errorMessage: 'invoke error',
                  },
                  'CANCEL',
                ),
              },
              onDone: {
                target: 'dismiss',
                actions: ['onSuccess'],
              },
            },
          },
          dismiss: {
            type: 'final',
          },
        },
        onDone: {
          target: 'closed',
        },
      },
    },
  },
  {
    services: {
      executeAction: (context) => (context.isDraft ? deleteDraft(context.entryId) : deletePublication(context.entryId)),
    },
  },
)
