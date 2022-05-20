import {debug, error} from '@app/utils/logger'
import {Alert} from '@components/alert'
import {overlayStyles} from '@components/dialog-styles'
import {MouseEvent, PropsWithChildren} from 'react'
import {createMachine, StateFrom} from 'xstate'

export type DeleteDialogProps = PropsWithChildren<{
  title: string
  description: string
  state: StateFrom<typeof deleteDialogMachine>
  send: any
}>

export function DeleteDialog({
  children,
  state,
  send,
  title,
  description,
}: DeleteDialogProps) {
  debug('delete state:', state.value)
  return (
    <Alert.Root
      open={state.matches('opened')}
      onOpenChange={(newVal: boolean) => {
        debug('onOpenChange', newVal)

        newVal ? send('DELETE.DIALOG.OPEN') : send('DELETE.DIALOG.CANCEL')
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
            <Alert.Cancel
              data-testid="delete-dialog-cancel"
              disabled={state.hasTag('pending')}
            >
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

type DeleteDialogEvent =
  | {
      type: 'DELETE.DIALOG.OPEN'
    }
  | {type: 'DELETE.DIALOG.CANCEL'}
  | {type: 'DELETE.DIALOG.CONFIRM'}
  | {type: 'DELETE.SYNC.SUCCESS'}

type DeleteDialogContext = {
  entryId: string
  errorMessage: string
}
export const deleteDialogMachine = createMachine(
  {
    id: 'deleteDialogMachine',
    tsTypes: {} as import('./delete-dialog.typegen').Typegen0,
    schema: {
      context: {} as DeleteDialogContext,
      events: {} as DeleteDialogEvent,
    },
    initial: 'closed',
    states: {
      closed: {
        id: 'closed',
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
              'DELETE.SYNC.SUCCESS': {
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
                  actions: ['onError'],
                },
              ],
            },
            on: {
              'DELETE.SYNC.SUCCESS': [
                {
                  actions: 'onSuccess',
                  target: '#closed',
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
          dismiss: {
            entry: () => {
              debug('enter in dismiss!')
            },
            tags: ['dismiss'],
            after: {
              200: {
                target: '#closed',
              },
            },
          },
        },
        onDone: {
          actions: () => {
            debug('ONDONE DELETE MACHINE')
          },
          target: 'closed',
        },
      },
    },
  },
  {
    actions: {
      onError: (_, event) => {
        error('DELETE ERROR: ', event)
      },
    },
  },
)
