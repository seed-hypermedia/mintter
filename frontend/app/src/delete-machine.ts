import {Empty} from '@app/mttast'
import {assign, createMachine} from 'xstate'

export type DeleteMachineEvent =
  | {
      type: 'DELETE.OPEN'
    }
  | {
      type: 'DELETE.CLOSE'
    }
  | {
      type: 'DELETE.CANCEL'
    }
  | {
      type: 'DELETE.CONFIRM'
    }

export type DeleteMachineContext = {
  documentId: string
  version: string | null
  errorMessage: string
}

export type DeleteMachineServices = {
  performDelete: {
    data: Empty
  }
}
export const deleteFileMachine = createMachine(
  {
    id: 'deleteFileMachine',
    predictableActionArguments: true,
    tsTypes: {} as import('./delete-machine.typegen').Typegen0,
    schema: {
      context: {} as DeleteMachineContext,
      events: {} as DeleteMachineEvent,
      services: {} as DeleteMachineServices,
    },
    context: {
      documentId: '',
      version: null,
      errorMessage: '',
    },
    initial: 'close',
    states: {
      close: {
        id: 'close',
        on: {
          'DELETE.OPEN': 'open',
        },
      },
      open: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'DELETE.CANCEL': '#close',
              'DELETE.CONFIRM': 'deleting',
            },
          },
          deleting: {
            on: {
              'DELETE.CANCEL': '#close',
            },
            invoke: {
              src: 'performDelete',
              id: 'performDelete',
              onError: {
                target: 'idle',
                actions: ['assignError'],
              },
              onDone: {
                target: 'deleted',
                actions: ['persistDelete', 'removeFileFromBookmarks'],
              },
            },
          },
          deleted: {
            type: 'final',
          },
        },
      },
    },
  },
  {
    actions: {
      assignError: assign({
        errorMessage: (_, event) => `Delete error: ${event.data}`,
      }),
    },
  },
)
