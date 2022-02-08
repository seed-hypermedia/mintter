import {Alert} from '@components/alert'
import {overlayStyles} from '@components/dialog-styles'
import {useMachine} from '@xstate/react'
import {MouseEvent, PropsWithChildren} from 'react'
import {createModel} from 'xstate/lib/model'

export type DeleteDialogProps = PropsWithChildren<{
  entryId?: string
  handleDelete: any // Promise that deletes entry
  onSuccess: any // execute this after delete is successful;
  title: string
  description: string
}>

export function DeleteDialog({children, entryId, handleDelete, onSuccess, title, description}: DeleteDialogProps) {
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
        if (value) {
          send('DELETE.DIALOG.OPEN')
        } else {
          send('DELETE.DIALOG.CANCEL')
        }
      }}
    >
      <Alert.Trigger asChild>{children}</Alert.Trigger>
      <Alert.Portal>
        <Alert.Overlay className={overlayStyles()} />
        <Alert.Content>
          <Alert.Title color="danger" data-testid="delete-dialog-title">
            {title}
          </Alert.Title>
          <Alert.Description>{description}</Alert.Description>
          {state.matches('opened.errored') && (
            <Alert.Description data-testid="delete-dialog-error" color="danger">
              Something went wrong on deletion
            </Alert.Description>
          )}
          <Alert.Actions>
            <Alert.Cancel data-testid="delete-dialog-cancel" disabled={state.hasTag('pending')}>
              Cancel
            </Alert.Cancel>
            <Alert.Action
              color="danger"
              data-testid="delete-dialog-confirm"
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
        'DELETE.DIALOG.OPEN': {
          target: 'opened',
        },
      },
    },
    opened: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'DELETE.DIALOG.CONFIRM': {
              target: 'deleting',
            },
            'DELETE.DIALOG.CANCEL': {
              target: 'dismiss',
            },
          },
        },
        deleting: {
          invoke: {
            id: 'deleteEntry',
            src: 'deleteEntry',
            onDone: [
              {
                actions: 'onSuccess',
                target: 'dismiss',
              },
            ],
            onError: [
              {
                target: 'errored',
              },
            ],
          },
        },
        errored: {
          on: {
            'DELETE.DIALOG.CONFIRM': {
              target: 'deleting',
            },
            'DELETE.DIALOG.CANCEL': {
              target: 'dismiss',
            },
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
