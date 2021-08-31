import type {InvokeCreator} from 'xstate'
import {assign, createMachine} from 'xstate'
import {toast} from 'react-hot-toast'
import {deleteDraft} from 'frontend/client/src/drafts'
import {deletePublication} from 'frontend/client/src/publications'

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
          console.log('execute action!!')
          return context.isDraft ? deleteDraft(context.entryId!) : deletePublication(context.entryId!)
        },
      },
      actions: {
        assignActionToContext: assign((_, event) => {
          if (event.type != 'OPEN_DIALOG') return {}
          return event.payload
        }),
        assignErrorMessageToContext: assign((context, event: any) => {
          const errorMessage = event.data?.message || 'DeleteAlert: something went wrong'
          toast.error(errorMessage)
          return {
            errorMessage,
          }
        }),
        clearErrorMessage: assign((_) => ({
          errorMessage: undefined,
        })),
        clearContextEntry: assign((_) => ({
          entryId: undefined,
          action: undefined,
        })),
        onSuccess,
      },
    },
  )
