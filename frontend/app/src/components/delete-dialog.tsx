import {Alert} from '@components/alert'
import {overlayStyles} from '@components/dialog-styles'
import {useMachine} from '@xstate/react'
import {MouseEvent, PropsWithChildren} from 'react'
import {createModel} from 'xstate/lib/model'

export type DeleteDialogProps = PropsWithChildren<{
  entryId?: string
  handleDelete: any // Promise that deletes entry
  onSuccess: any // execute this after delete is successful;
}>

export function DeleteDialog({children, entryId, handleDelete, onSuccess}: DeleteDialogProps) {
  const [state, send] = useMachine(
    deleteDialogMachine.withConfig({
      services: {
        deleteEntry: () => handleDelete(entryId),
      },
      actions: {
        onSuccess,
      },
    }),
  )
  return (
    <Alert.Root
      id={entryId}
      open={state.matches('opened')}
      onOpenChange={(value: boolean) => {
        console.log('open change!: ', value)

        if (value) {
          send('DELETE.DIALOG.OPEN')
        } else {
          send('DELETE.DIALOG.CANCEL')
        }
      }}
    >
      <Alert.Trigger asChild>{children}</Alert.Trigger>
      <Alert.Portal>
        <Alert.Overlay className={overlayStyles()}>
          <Alert.Content>
            <Alert.Title color="danger">Delete document</Alert.Title>
            <Alert.Description>
              Are you sure you want to delete this document? This action is not reversible.
            </Alert.Description>
            {state.matches('opened.errored') && (
              <Alert.Description color="danger">Something went wrong on deletion</Alert.Description>
            )}
            <Alert.Actions>
              <Alert.Cancel disabled={state.hasTag('pending')}>Cancel</Alert.Cancel>
              <Alert.Action
                color="danger"
                disabled={state.hasTag('pending')}
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  e.preventDefault()
                  send('DELETE.DIALOG.CONFIRM')
                }}
              >
                Delete
              </Alert.Action>
            </Alert.Actions>
          </Alert.Content>
        </Alert.Overlay>
      </Alert.Portal>
    </Alert.Root>
  )
}

const deleteDialogModel = createModel(
  {
    entryId: '',
    errorMessage: '',
  },
  {
    events: {
      'DELETE.DIALOG.OPEN': () => ({}),
      'DELETE.DIALOG.CANCEL': () => ({}),
      'DELETE.DIALOG.CONFIRM': () => ({}),
    },
  },
)

const deleteDialogMachine = deleteDialogModel.createMachine({
  id: 'deleteDialogMachine',
  initial: 'closed',
  states: {
    closed: {
      on: {
        'DELETE.DIALOG.OPEN': 'opened',
      },
    },
    opened: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'DELETE.DIALOG.CONFIRM': 'deleting',
            'DELETE.DIALOG.CANCEL': 'dismiss',
          },
        },
        deleting: {
          tags: ['pending'],
          invoke: {
            src: 'deleteEntry',
            id: 'deleteEntry',
            onDone: {
              target: 'dismiss',
              actions: ['onSuccess'],
            },
            onError: {
              target: 'errored',
              //   actions: ['assignError'],
            },
          },
        },
        errored: {
          on: {
            'DELETE.DIALOG.CONFIRM': {
              target: 'deleting',
              //   actions: ['clearError'],
            },
            'DELETE.DIALOG.CANCEL': 'dismiss',
          },
        },
        canceled: {
          type: 'final',
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
})
