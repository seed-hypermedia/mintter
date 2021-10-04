import {deleteDraft, deletePublication} from '@mintter/client'
import {toast} from 'react-hot-toast'
import {assign, createMachine} from 'xstate'

export interface DeleteConfirmationDialogMachineContext {
  isDraft?: boolean
  errorMessage?: string
  entryId?: string
}

export type DeleteConfirmationDialogMachineEvent =
  | {
      type: 'OPEN_DIALOG'
      payload: {
        entryId: string
        isDraft: boolean
      }
    }
  | {
      type: 'CONFIRM'
    }
  | {
      type: 'CANCEL'
    }

export type DeleteConfirmationMethods = {
  onSuccess: () => void
}

export const deleteConfirmationDialogMachine = ({onSuccess}: DeleteConfirmationMethods) =>
  createMachine<DeleteConfirmationDialogMachineContext, DeleteConfirmationDialogMachineEvent>(
    {
      id: 'deleteConfirmationDialog',
      initial: 'closed',
      states: {
        closed: {
          id: 'closed',
          on: {
            OPEN_DIALOG: {
              target: 'open',
              actions: 'assignActionToContext',
            },
          },
        },
        open: {
          exit: ['clearErrorMessage'],
          initial: 'idle',
          states: {
            idle: {
              on: {
                CANCEL: {
                  target: 'dismiss',
                  actions: 'clearContextEntry',
                },
                CONFIRM: 'executingAction',
              },
            },
            executingAction: {
              invoke: {
                src: 'executeAction',
                onError: {
                  target: 'idle',
                  actions: 'assignErrorMessageToContext',
                },
                onDone: {
                  target: 'dismiss',
                  actions: ['clearContextEntry', 'onSuccess'],
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
        executeAction: (context) => {
          if (!context.entryId) {
            throw new Error(`executeAction: "entryId" should be defined: entryId: ${context.entryId}`)
          } else {
            return context.isDraft ? deleteDraft(context.entryId) : deletePublication(context.entryId)
          }
        },
      },
      actions: {
        assignActionToContext: assign((_, event) => {
          if (event.type != 'OPEN_DIALOG') return {}
          return event.payload
        }),
        assignErrorMessageToContext: assign((context) => {
          const errorMessage = 'DeleteAlert: something went wrong'
          toast.error(errorMessage)
          return {
            ...context,
            errorMessage,
          }
        }),
        clearErrorMessage: assign((context) => ({
          ...context,
          errorMessage: undefined,
        })),
        clearContextEntry: assign((context) => ({
          ...context,
          entryId: undefined,
          action: undefined,
        })),
        onSuccess,
      },
    },
  )
