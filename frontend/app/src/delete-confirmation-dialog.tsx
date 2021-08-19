import {deletePublication} from 'frontend/client/src/publications'
import {assign, createMachine} from 'xstate'
import {toast} from 'react-hot-toast'

export interface DeleteConfirmationDialogMachineContext {
  action?: () => Promise<void>
  errorMessage?: string
}

export type DeleteConfirmationDialogMachineEvent =
  | {
      type: 'OPEN_DIALOG'
      action: () => Promise<void>
    }
  | {
      type: 'CONFIRM'
      entryId: string
    }
  | {
      type: 'CANCEL'
    }

export type DeleteConfirmationMethods = {
  onSuccess: () => void
}

export const deleteConfirmationDialogMachine = ({onSuccess, executeAction}: DeleteConfirmationMethods) =>
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
                CANCEL: 'dismiss',
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
                  actions: ['clearActionFromContext', 'onSuccess'],
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
        executeAction,
      },
      actions: {
        assignActionToContext: assign((context, event) => {
          if (event.type !== 'OPEN_DIALOG') return {}
          return {
            action: event.action,
          }
        }),
        assignErrorMessageToContext: assign((context, event: any) => {
          const errorMessage = event.data?.message || 'assignErrorMessageToContext: something went wrong'
          toast.error(errorMessage)
          return {
            errorMessage,
          }
        }),
        clearErrorMessage: assign({
          errorMessage: undefined,
        }),
        clearActionFromContext: assign({
          action: undefined,
        }),
        onSuccess,
      },
    },
  )
